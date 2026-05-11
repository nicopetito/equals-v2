'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload, FileText, ChevronRight, ChevronLeft,
  TrendingUp, TrendingDown, Check, AlertCircle,
  Trash2, X, CheckSquare, Square,
} from 'lucide-react'
import {
  parseCSV, detectSeparator, mapRowsToTransactions, toTransactionInput,
  BANK_PRESETS,
  type CsvRow, type ColumnMapping, type ParsedRow, type DateFormat, type AmountSignRule,
} from '@/utils/csv'
import { transactionsService } from '@/services/transactions.service'
import { useCategories } from '@/hooks/useCategories'
import { useWallets } from '@/hooks/useWallets'
import { useToast } from '@/components/providers/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { formatCurrency } from '@/utils/format'

// ── Tipos de paso ─────────────────────────────────────────────────────────────

type Step = 'upload' | 'map' | 'preview' | 'done'

const CURRENCY_OPTS = [
  { value: 'ARS', label: 'ARS' }, { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' }, { value: 'CRYPTO', label: 'CRYPTO' },
]

const DATE_FORMAT_OPTS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (Argentina)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (USA)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY' },
]

const AMOUNT_RULE_OPTS = [
  { value: 'positive_income', label: 'Positivo = Ingreso / Negativo = Gasto' },
  { value: 'negative_income', label: 'Negativo = Ingreso / Positivo = Gasto' },
]

// ── Barra de pasos ────────────────────────────────────────────────────────────

const STEPS: { id: Step; label: string }[] = [
  { id: 'upload',  label: 'Archivo' },
  { id: 'map',     label: 'Columnas' },
  { id: 'preview', label: 'Revisión' },
  { id: 'done',    label: 'Listo' },
]

function StepBar({ current }: { current: Step }) {
  const idx = STEPS.findIndex(s => s.id === current)
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const done   = i < idx
        const active = i === idx
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold transition-all"
                style={
                  done   ? { background: 'var(--grad-income)', color: 'white' }
                  : active ? { background: 'var(--grad-brand)', color: 'white', boxShadow: 'var(--shadow-brand)' }
                  : { background: 'var(--bg-subtle)', color: 'var(--text-faint)', border: '2px solid var(--border)' }
                }
              >
                {done ? <Check size={15} strokeWidth={3} /> : i + 1}
              </div>
              <span
                className="text-xs font-semibold mt-1.5 whitespace-nowrap"
                style={{ color: active ? 'var(--brand-500)' : done ? 'var(--income-600)' : 'var(--text-faint)' }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="mx-2 mb-4 flex-1 h-0.5 min-w-[32px]"
                style={{ background: i < idx ? 'var(--income-200, #A7F3D0)' : 'var(--border)' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ImportPage() {
  const router   = useRouter()
  const { addToast } = useToast()
  const { data: categories } = useCategories()
  const { data: wallets }    = useWallets()

  const [step, setStep]       = useState<Step>('upload')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<CsvRow[]>([])
  const [separator, setSeparator] = useState(',')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({
    dateFormat: 'DD/MM/YYYY',
    amountSignRule: 'positive_income',
    defaultCurrency: 'ARS',
  })

  const [parsed, setParsed]     = useState<ParsedRow[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const [importing, setImporting] = useState(false)
  const [result, setResult]       = useState<{ success: number; errors: number } | null>(null)

  const categoryOpts = [
    { value: '', label: 'Sin categoría' },
    ...categories.map(c => ({ value: c.id!, label: c.name })),
  ]
  const walletOpts = [
    { value: '', label: 'Sin billetera' },
    ...wallets.map(w => ({ value: w.id!, label: w.name })),
  ]
  const columnOpts = [
    { value: '', label: '— no mapear —' },
    ...headers.map(h => ({ value: h, label: h })),
  ]

  // ── Carga de archivo ────────────────────────────────────────────────────────

  function processFile(file: File) {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      addToast('Solo se aceptan archivos CSV o TXT', 'error'); return
    }
    const reader = new FileReader()
    reader.onload = e => {
      const content = e.target?.result as string
      const sep = detectSeparator(content)
      const { headers: h, rows } = parseCSV(content, sep)
      if (h.length === 0) { addToast('El archivo está vacío o no tiene encabezados', 'error'); return }
      setSeparator(sep)
      setHeaders(h)
      setRawRows(rows)
      setFileName(file.name)
      // Intentar auto-mapear columnas comunes
      setMapping(prev => ({
        ...prev,
        ...autoDetectColumns(h),
      }))
      setStep('map')
    }
    reader.readAsText(file, 'utf-8')
  }

  function autoDetectColumns(cols: string[]): Partial<ColumnMapping> {
    const lower = cols.map(c => c.toLowerCase())
    const find = (...terms: string[]) =>
      cols[lower.findIndex(c => terms.some(t => c.includes(t)))] ?? ''

    return {
      dateColumn:        find('fecha', 'date', 'dia', 'fec'),
      descriptionColumn: find('descripcion', 'descripción', 'concepto', 'detalle', 'description', 'desc'),
      amountColumn:      find('monto', 'importe', 'amount', 'valor', 'credito', 'crédito', 'debito', 'débito'),
      typeColumn:        find('tipo', 'type', 'movimiento'),
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  function applyPreset(id: string) {
    const preset = BANK_PRESETS.find(p => p.id === id)
    if (!preset) return
    setMapping(prev => ({ ...prev, ...preset.mapping }))
  }

  // ── Paso map → preview ──────────────────────────────────────────────────────

  function handleGoPreview() {
    if (!mapping.dateColumn)        { addToast('Seleccioná la columna de fecha', 'warning'); return }
    if (!mapping.descriptionColumn) { addToast('Seleccioná la columna de descripción', 'warning'); return }
    if (!mapping.amountColumn)      { addToast('Seleccioná la columna de monto', 'warning'); return }

    const fullMapping: ColumnMapping = {
      dateColumn:        mapping.dateColumn!,
      descriptionColumn: mapping.descriptionColumn!,
      amountColumn:      mapping.amountColumn!,
      typeColumn:        mapping.typeColumn,
      incomeKeyword:     mapping.incomeKeyword,
      expenseKeyword:    mapping.expenseKeyword,
      dateFormat:        (mapping.dateFormat ?? 'DD/MM/YYYY') as DateFormat,
      amountSignRule:    (mapping.amountSignRule ?? 'positive_income') as AmountSignRule,
      defaultCurrency:   mapping.defaultCurrency ?? 'ARS',
      defaultWalletId:   mapping.defaultWalletId,
      defaultCategoryId: mapping.defaultCategoryId,
    }

    const rows = mapRowsToTransactions(rawRows, fullMapping)
    setParsed(rows)
    setSelected(new Set(rows.filter(r => !r._error).map(r => r._index)))
    setStep('preview')
  }

  // ── Importar ─────────────────────────────────────────────────────────────────

  async function handleImport() {
    const toImport = parsed
      .filter(r => selected.has(r._index) && !r._error)
      .map(r => toTransactionInput(r))

    if (toImport.length === 0) { addToast('No hay filas válidas seleccionadas', 'warning'); return }

    setImporting(true)
    try {
      const res = await transactionsService.createBatch(toImport)
      setResult(res)
      setStep('done')
      if (res.success > 0) addToast(`✓ ${res.success} transacciones importadas`, 'success')
      if (res.errors > 0)  addToast(`${res.errors} filas con error`, 'warning')
    } catch {
      addToast('Error al importar. Intentá de nuevo.', 'error')
    } finally {
      setImporting(false)
    }
  }

  // ── Toggle selección ────────────────────────────────────────────────────────

  function toggleRow(idx: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx); else next.add(idx)
      return next
    })
  }

  function toggleAll() {
    const valid = parsed.filter(r => !r._error).map(r => r._index)
    if (valid.every(i => selected.has(i))) {
      setSelected(new Set())
    } else {
      setSelected(new Set(valid))
    }
  }

  const validRows  = parsed.filter(r => !r._error)
  const errorRows  = parsed.filter(r =>  r._error)
  const incomeRows = validRows.filter(r => r.type === 'income')
  const expenseRows= validRows.filter(r => r.type === 'expense')

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 md:p-7 max-w-4xl mx-auto animate-fade-in">

      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Importar resumen bancario
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Cargá tu CSV y mapeá las columnas para importar tus movimientos automáticamente
        </p>
      </div>

      <StepBar current={step} />

      {/* ── PASO 1: UPLOAD ── */}
      {step === 'upload' && (
        <div className="space-y-6">
          {/* Zona drag & drop */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-4 rounded-3xl p-12 cursor-pointer transition-all"
            style={{
              border: `2px dashed ${dragging ? 'var(--brand-500)' : 'var(--border)'}`,
              background: dragging ? 'var(--brand-50)' : 'var(--bg-card)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: dragging ? 'var(--brand-100)' : 'var(--bg-subtle)' }}
            >
              <Upload size={28} style={{ color: dragging ? 'var(--brand-500)' : 'var(--text-faint)' }} />
            </div>
            <div className="text-center">
              <p className="font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>
                {dragging ? 'Soltá el archivo acá' : 'Arrastrá tu CSV o hacé clic'}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Archivos .csv o .txt · máx. 5 MB
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={onFileInput}
            />
          </div>

          {/* Presets de bancos */}
          <div>
            <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-secondary)' }}>
              Formatos compatibles
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {BANK_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  className="rounded-2xl p-3 text-center transition-all hover:-translate-y-0.5 text-sm font-semibold"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-xs)',
                    color: 'var(--text-secondary)',
                  }}
                  title={`Aplicar preset ${preset.name}`}
                >
                  <span className="text-xl block mb-1">{preset.logo}</span>
                  {preset.name}
                </button>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-faint)' }}>
              * Los presets pre-configuran el formato de fecha y monto. Igual podés ajustarlo manualmente.
            </p>
          </div>
        </div>
      )}

      {/* ── PASO 2: MAPEAR COLUMNAS ── */}
      {step === 'map' && (
        <div className="space-y-5">
          {/* Info del archivo */}
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-100)' }}
          >
            <FileText size={18} style={{ color: 'var(--brand-500)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--brand-600)' }}>{fileName}</p>
              <p className="text-xs" style={{ color: 'var(--brand-500)' }}>
                {rawRows.length} filas · {headers.length} columnas detectadas
              </p>
            </div>
            <button
              onClick={() => setStep('upload')}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-colors hover:bg-white"
              style={{ color: 'var(--brand-500)' }}
            >
              Cambiar
            </button>
          </div>

          {/* Mapeo de columnas */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <h2 className="font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>
              Asignar columnas
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Columna de fecha *"
                value={mapping.dateColumn ?? ''}
                onChange={e => setMapping(p => ({ ...p, dateColumn: e.target.value }))}
                options={columnOpts}
              />
              <Select
                label="Columna de descripción *"
                value={mapping.descriptionColumn ?? ''}
                onChange={e => setMapping(p => ({ ...p, descriptionColumn: e.target.value }))}
                options={columnOpts}
              />
              <Select
                label="Columna de monto *"
                value={mapping.amountColumn ?? ''}
                onChange={e => setMapping(p => ({ ...p, amountColumn: e.target.value }))}
                options={columnOpts}
              />
              <Select
                label="Columna de tipo (opcional)"
                value={mapping.typeColumn ?? ''}
                onChange={e => setMapping(p => ({ ...p, typeColumn: e.target.value || undefined }))}
                options={columnOpts}
              />
            </div>
          </div>

          {/* Formato y defaults */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <h2 className="font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>
              Formato y valores por defecto
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Formato de fecha"
                value={mapping.dateFormat ?? 'DD/MM/YYYY'}
                onChange={e => setMapping(p => ({ ...p, dateFormat: e.target.value as DateFormat }))}
                options={DATE_FORMAT_OPTS}
              />
              <Select
                label="Regla de monto"
                value={mapping.amountSignRule ?? 'positive_income'}
                onChange={e => setMapping(p => ({ ...p, amountSignRule: e.target.value as AmountSignRule }))}
                options={AMOUNT_RULE_OPTS}
              />
              <Select
                label="Moneda por defecto"
                value={mapping.defaultCurrency ?? 'ARS'}
                onChange={e => setMapping(p => ({ ...p, defaultCurrency: e.target.value }))}
                options={CURRENCY_OPTS}
              />
              <Select
                label="Billetera por defecto"
                value={mapping.defaultWalletId ?? ''}
                onChange={e => setMapping(p => ({ ...p, defaultWalletId: e.target.value || undefined }))}
                options={walletOpts}
              />
            </div>
            <Select
              label="Categoría por defecto"
              value={mapping.defaultCategoryId ?? ''}
              onChange={e => setMapping(p => ({ ...p, defaultCategoryId: e.target.value || undefined }))}
              options={categoryOpts}
            />
          </div>

          {/* Vista previa de las primeras filas */}
          {headers.length > 0 && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
            >
              <p className="px-4 py-3 text-xs font-bold border-b" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-light)' }}>
                Vista previa (primeras 3 filas)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)' }}>
                      {headers.map(h => (
                        <th key={h} className="px-3 py-2 text-left font-bold" style={{ color: 'var(--text-muted)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawRows.slice(0, 3).map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--border-light)' }}>
                        {headers.map(h => (
                          <td key={h} className="px-3 py-2 max-w-[120px] truncate" style={{ color: 'var(--text-secondary)' }}>
                            {row[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep('upload')} className="flex items-center gap-2">
              <ChevronLeft size={15} /> Volver
            </Button>
            <Button onClick={handleGoPreview} className="flex-1 flex items-center justify-center gap-2">
              Previsualizar <ChevronRight size={15} />
            </Button>
          </div>
        </div>
      )}

      {/* ── PASO 3: PREVIEW ── */}
      {step === 'preview' && (
        <div className="space-y-5">
          {/* Resumen de estadísticas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total filas',   value: parsed.length,       color: 'var(--brand-500)',   bg: 'var(--brand-50)' },
              { label: 'Seleccionadas', value: selected.size,       color: 'var(--text-primary)', bg: 'var(--bg-subtle)' },
              { label: 'Ingresos',      value: incomeRows.length,   color: 'var(--income-600)',  bg: 'var(--income-50)' },
              { label: 'Gastos',        value: expenseRows.length,  color: 'var(--expense-600)', bg: 'var(--expense-50)' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-4" style={{ background: s.bg, border: '1px solid var(--border)' }}>
                <p className="text-2xl font-extrabold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5 font-semibold" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Alertas de errores */}
          {errorRows.length > 0 && (
            <div
              className="flex items-start gap-3 rounded-2xl p-4"
              style={{ background: 'var(--expense-50)', border: '1px solid var(--expense-100)' }}
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--expense-500)' }} />
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--expense-600)' }}>
                  {errorRows.length} fila{errorRows.length !== 1 ? 's' : ''} con errores (se excluirán del import)
                </p>
                <ul className="mt-1 space-y-0.5">
                  {errorRows.slice(0, 3).map(r => (
                    <li key={r._index} className="text-xs" style={{ color: 'var(--expense-500)' }}>
                      Fila {r._index + 2}: {r._error}
                    </li>
                  ))}
                  {errorRows.length > 3 && (
                    <li className="text-xs" style={{ color: 'var(--expense-500)' }}>
                      …y {errorRows.length - 3} más
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Tabla de filas */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            {/* Header tabla */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--bg-subtle)' }}
            >
              <button onClick={toggleAll} className="shrink-0" title="Seleccionar / deseleccionar todo">
                {validRows.every(r => selected.has(r._index))
                  ? <CheckSquare size={17} style={{ color: 'var(--brand-500)' }} />
                  : <Square size={17} style={{ color: 'var(--text-faint)' }} />
                }
              </button>
              <span className="text-xs font-bold flex-1" style={{ color: 'var(--text-muted)' }}>Fecha</span>
              <span className="text-xs font-bold flex-[3]" style={{ color: 'var(--text-muted)' }}>Descripción</span>
              <span className="text-xs font-bold text-right w-24 shrink-0" style={{ color: 'var(--text-muted)' }}>Monto</span>
              <span className="text-xs font-bold w-16 shrink-0" style={{ color: 'var(--text-muted)' }}>Tipo</span>
            </div>

            {/* Filas */}
            <div className="max-h-[400px] overflow-y-auto">
              {parsed.map(row => {
                const hasError = !!row._error
                const isSel    = selected.has(row._index)
                return (
                  <div
                    key={row._index}
                    className="flex items-center gap-3 px-4 py-3 transition-colors"
                    style={{
                      borderBottom: '1px solid var(--border-light)',
                      background: hasError ? 'var(--expense-50)' : isSel ? 'transparent' : '#F8FAFC',
                      opacity: hasError ? 0.7 : 1,
                    }}
                    onMouseEnter={e => { if (!hasError) e.currentTarget.style.background = 'var(--bg-subtle)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = hasError ? 'var(--expense-50)' : isSel ? 'transparent' : '#F8FAFC' }}
                  >
                    <button
                      onClick={() => !hasError && toggleRow(row._index)}
                      className="shrink-0"
                      disabled={hasError}
                    >
                      {hasError
                        ? <AlertCircle size={16} style={{ color: 'var(--expense-500)' }} />
                        : isSel
                          ? <CheckSquare size={16} style={{ color: 'var(--brand-500)' }} />
                          : <Square size={16} style={{ color: 'var(--text-faint)' }} />
                      }
                    </button>
                    <span className="text-xs flex-1 font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {row.date || <span style={{ color: 'var(--expense-500)' }}>{row._error}</span>}
                    </span>
                    <span className="text-sm flex-[3] truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                      {row.description}
                    </span>
                    <span
                      className="text-sm font-bold tabular-nums text-right w-24 shrink-0"
                      style={{ color: row.type === 'income' ? 'var(--income-600)' : 'var(--expense-600)' }}
                    >
                      {row.type === 'income' ? '+' : '−'}{formatCurrency(row.amount, row.currency)}
                    </span>
                    <div className="w-16 shrink-0 flex items-center gap-1">
                      {row.type === 'income'
                        ? <TrendingUp size={13} style={{ color: 'var(--income-500)' }} />
                        : <TrendingDown size={13} style={{ color: 'var(--expense-500)' }} />
                      }
                      <span className="text-xs font-semibold" style={{ color: row.type === 'income' ? 'var(--income-600)' : 'var(--expense-600)' }}>
                        {row.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep('map')} className="flex items-center gap-2">
              <ChevronLeft size={15} /> Volver
            </Button>
            <Button
              onClick={handleImport}
              loading={importing}
              className="flex-1"
              disabled={selected.size === 0}
            >
              Importar {selected.size} transacción{selected.size !== 1 ? 'es' : ''}
            </Button>
          </div>
        </div>
      )}

      {/* ── PASO 4: DONE ── */}
      {step === 'done' && result && (
        <div
          className="flex flex-col items-center justify-center py-16 gap-5 rounded-3xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'var(--grad-income)', boxShadow: 'var(--shadow-income)' }}
          >
            <Check size={36} className="text-white" strokeWidth={3} />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
              ¡Importación completada!
            </h2>
            <p className="text-base mt-2" style={{ color: 'var(--text-muted)' }}>
              {result.success} transacción{result.success !== 1 ? 'es' : ''} importada{result.success !== 1 ? 's' : ''} correctamente
              {result.errors > 0 && ` · ${result.errors} con error`}
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <Button variant="secondary" onClick={() => { setStep('upload'); setFileName(''); setRawRows([]); setHeaders([]); setParsed([]); setResult(null) }}>
              Importar otro archivo
            </Button>
            <Button onClick={() => router.push('/transactions')}>
              Ver transacciones
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
