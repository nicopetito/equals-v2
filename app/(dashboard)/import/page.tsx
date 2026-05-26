'use client'

import { useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload, FileText, ChevronRight, ChevronLeft,
  TrendingUp, TrendingDown, Check, AlertCircle, AlertTriangle,
  X, CheckSquare, Square, Tag, History,
  Sparkles, Zap, Car, Utensils,
  HeartPulse, ShoppingBag, Home, Briefcase, Music, type LucideIcon,
} from 'lucide-react'
import {
  parseCSV, detectSeparator, mapRowsToTransactions, toTransactionInput,
  detectDateFormatFromSample, BANK_PRESETS,
  type CsvRow, type ColumnMapping, type ParsedRow, type DateFormat, type AmountSignRule,
} from '@/utils/csv'
import {
  suggestCategory, getLearnedRules, learnMerchantRules,
  type Confidence, type LearnedRule,
} from '@/utils/merchant-rules'
import { transactionsService } from '@/services/transactions.service'
import { categoriesService } from '@/services/categories.service'
import { markImportUsed } from '@/utils/achievements'
import { useAuth } from '@/hooks/useAuth'
import { useCategories } from '@/hooks/useCategories'
import { useWallets } from '@/hooks/useWallets'
import { useToast } from '@/components/providers/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { HelpButton } from '@/components/help/HelpButton'
import { formatCurrency } from '@/utils/format'
import type { Category } from '@/types'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'map' | 'preview' | 'done'
type ImportResultState = 'success' | 'partial' | 'failure'
type RowFilter = 'all' | 'errors' | 'review' | 'income' | 'expense' | 'duplicates'

interface ImportResult {
  success: number
  errors: number
  state: ImportResultState
}

interface ImportHistoryEntry {
  id: string
  fileName: string
  date: string
  count: number
  bankId: string | null
  bankName: string | null
}

// ── localStorage helpers ──────────────────────────────────────────────────────

const IMPORT_HISTORY_KEY = 'equal_import_history'

function loadImportHistory(): ImportHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(IMPORT_HISTORY_KEY) ?? '[]') as ImportHistoryEntry[]
  } catch { return [] }
}

function saveImportHistory(entry: ImportHistoryEntry): void {
  if (typeof window === 'undefined') return
  const existing = loadImportHistory()
  localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify([entry, ...existing].slice(0, 10)))
}

// ── Constantes ────────────────────────────────────────────────────────────────

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
const STEPS: { id: Step; label: string }[] = [
  { id: 'upload',  label: 'Archivo' },
  { id: 'map',     label: 'Columnas' },
  { id: 'preview', label: 'Revisión' },
  { id: 'done',    label: 'Confirmación' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeDesc(desc: string): string {
  return desc.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 50)
}

// ── Íconos para el modal de categoría inline ──────────────────────────────────
const INLINE_ICON_MAP: Record<string, LucideIcon> = {
  'tag': Tag, 'utensils': Utensils, 'car': Car, 'heart-pulse': HeartPulse,
  'shopping-bag': ShoppingBag, 'home': Home, 'briefcase': Briefcase,
  'music': Music, 'zap': Zap,
}
const INLINE_ICON_LIST = Object.entries(INLINE_ICON_MAP)

const COLOR_PRESETS = [
  '#6d3bd7','#8b5cf6','#ec4899','#f43f5e','#ef4444',
  '#f97316','#f59e0b','#10b981','#14b8a6','#22c55e',
  '#0ea5e9','#3b82f6','#64748b','#334155',
]

// Metadatos visuales de cada banco (colores aproximados a la identidad real)
const BANK_META: Record<string, { color: string; initials: string }> = {
  'mercadopago': { color: '#009EE3', initials: 'MP' },
  'brubank':     { color: '#6C2DC7', initials: 'Br' },
  'uala':        { color: '#F5A623', initials: 'Ua' },
  'santander':   { color: '#EC0000', initials: 'Sa' },
  'galicia':     { color: '#004C97', initials: 'Ga' },
  'bbva':        { color: '#004481', initials: 'BB' },
  'generico':    { color: '#94A3B8', initials: '·' },
}

// ── StepBar ───────────────────────────────────────────────────────────────────

function StepBar({ current }: { current: Step }) {
  const idx = STEPS.findIndex(s => s.id === current)
  return (
    <div className="flex items-center mb-8 w-full">
      {STEPS.map((step, i) => {
        const done   = i < idx
        const active = i === idx
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold transition-all duration-300"
                style={
                  done   ? { background: 'var(--grad-income)', color: '#fff', boxShadow: 'var(--shadow-income)' }
                  : active ? { background: 'var(--grad-brand)',  color: '#fff', boxShadow: 'var(--shadow-brand)' }
                  : { background: 'var(--bg-subtle)', color: 'var(--text-faint)', border: '2px solid var(--border)' }
                }
              >
                {done ? <Check size={15} strokeWidth={3} /> : i + 1}
              </div>
              <span
                className="text-[11px] font-bold whitespace-nowrap"
                style={{ color: active ? 'var(--brand-500)' : done ? 'var(--income-600)' : 'var(--text-faint)' }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-2 mb-5 rounded-full transition-all duration-500"
                style={{ background: i < idx ? 'var(--income-200, #bbf7d0)' : 'var(--border)' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── DropZone ──────────────────────────────────────────────────────────────────

interface DropZoneProps {
  dragging: boolean
  fileName: string
  detectedBankId: string | null
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onSelectClick: () => void
  onReset: () => void
}

function DropZone({ dragging, fileName, detectedBankId, onDragOver, onDragLeave, onDrop, onSelectClick, onReset }: DropZoneProps) {
  const loaded = fileName !== ''
  const detectedBank = detectedBankId ? BANK_PRESETS.find(p => p.id === detectedBankId) : null

  if (loaded) {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-4"
        style={{
          background: 'var(--income-50)',
          border: '1.5px solid var(--income-200, #bbf7d0)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--grad-income)', boxShadow: 'var(--shadow-income)' }}
        >
          <FileText size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: 'var(--income-700, #15803d)' }}>{fileName}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--income-600)' }}>
            {detectedBank ? <>Formato <span className="font-semibold">{detectedBank.name}</span> seleccionado</> : 'Listo para procesar'}
          </p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onReset() }}
          className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all hover:bg-white"
          style={{ color: 'var(--income-600)', border: '1px solid var(--income-200, #bbf7d0)' }}
        >
          Cambiar
        </button>
      </div>
    )
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="flex flex-col items-center gap-3 rounded-2xl px-6 py-5 transition-all duration-200"
      style={{
        border: `2px dashed ${dragging ? 'var(--brand-500)' : 'var(--border)'}`,
        background: dragging ? 'var(--brand-50)' : 'var(--bg-card)',
        boxShadow: dragging ? 'var(--glow-violet)' : 'var(--shadow-sm)',
        transform: dragging ? 'scale(1.005)' : 'scale(1)',
      }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200"
        style={{
          background: dragging ? 'var(--brand-100)' : 'var(--bg-subtle)',
          transform: dragging ? 'scale(1.1)' : 'scale(1)',
          boxShadow: dragging ? 'var(--shadow-brand)' : 'none',
        }}
      >
        <Upload size={22} style={{ color: dragging ? 'var(--brand-500)' : 'var(--text-muted)' }} />
      </div>

      <div className="text-center space-y-1">
        <p className="font-bold text-sm" style={{ color: dragging ? 'var(--brand-600)' : 'var(--text-primary)' }}>
          {dragging ? 'Soltá el archivo acá' : 'Arrastrá tu resumen o seleccioná un archivo'}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
          CSV, TXT o XLSX · máx. 5 MB
        </p>
      </div>

      {!dragging && (
        <button
          onClick={onSelectClick}
          className="text-xs font-bold px-4 py-2 rounded-xl transition-all hover:-translate-y-0.5"
          style={{
            background: 'var(--brand-50)',
            border: '1px solid var(--brand-100)',
            color: 'var(--brand-600)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          Seleccionar archivo
        </button>
      )}
    </div>
  )
}

// ── BankChip ──────────────────────────────────────────────────────────────────

function BankChip({ preset, selected, onClick }: { preset: typeof BANK_PRESETS[0]; selected: boolean; onClick: () => void }) {
  const meta = BANK_META[preset.id] ?? { color: '#94A3B8', initials: '?' }
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 w-full rounded-xl px-2 py-2 text-left transition-all duration-150 hover:-translate-y-0.5"
      style={{
        background: selected ? 'var(--brand-50)' : 'var(--bg-card)',
        border: selected ? '1.5px solid var(--brand-400)' : '1px solid var(--border)',
        boxShadow: selected ? 'var(--shadow-brand)' : 'var(--shadow-xs)',
      }}
    >
      <div
        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[9px] font-black text-white"
        style={{ background: meta.color }}
      >
        {meta.initials}
      </div>
      <span
        className="text-[11px] font-semibold flex-1 truncate leading-tight"
        style={{ color: selected ? 'var(--brand-600)' : 'var(--text-primary)' }}
      >
        {preset.name}
      </span>
      {selected && <Check size={10} strokeWidth={3} className="shrink-0" style={{ color: 'var(--brand-500)' }} />}
    </button>
  )
}

// ── AutoDetectChecklist ───────────────────────────────────────────────────────

function AutoDetectChecklist() {
  const items = ['Fecha', 'Descripción', 'Monto', 'Categoría sugerida']
  return (
    <div
      className="rounded-2xl p-3"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles size={11} style={{ color: 'var(--brand-500)' }} />
        <p className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
          Equal detecta automáticamente
        </p>
      </div>
      <div className="space-y-1.5">
        {items.map(item => (
          <div key={item} className="flex items-center gap-2">
            <div
              className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--income-50)', border: '1px solid var(--income-200, #bbf7d0)' }}
            >
              <Check size={8} strokeWidth={3} style={{ color: 'var(--income-600)' }} />
            </div>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── ImportTips ────────────────────────────────────────────────────────────────

function ImportTips() {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}
    >
      <p className="text-[11px] font-bold mb-2.5" style={{ color: 'var(--text-muted)' }}>
        Para mejores resultados
      </p>
      <div className="space-y-2">
        {[
          'Exportá el resumen en CSV desde la app de tu banco.',
          'Asegurate de que incluya fecha, descripción y monto.',
          'Vas a poder revisar todo antes de confirmar.',
        ].map((tip, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-[10px] font-black mt-px shrink-0" style={{ color: 'var(--brand-400)' }}>
              {i + 1}.
            </span>
            <span className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{tip}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── ImportHistoryPanel ────────────────────────────────────────────────────────

function ImportHistoryPanel({ history }: { history: ImportHistoryEntry[] }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
    >
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <History size={13} style={{ color: 'var(--text-faint)' }} />
        <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Importaciones recientes</p>
        {history.length > 0 && (
          <span
            className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: 'var(--brand-50)', color: 'var(--brand-500)' }}
          >
            {history.length}
          </span>
        )}
      </div>

      {history.length === 0 ? (
        <div className="px-4 py-5 text-center">
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Todavía no importaste archivos.</p>
        </div>
      ) : (
        <div>
          {history.slice(0, 3).map(entry => (
            <div
              key={entry.id}
              className="flex items-center gap-2.5 px-4 py-2.5"
              style={{ borderBottom: '1px solid var(--border-light)' }}
            >
              <FileText size={12} className="shrink-0" style={{ color: 'var(--text-faint)' }} />
              <span className="text-xs font-medium flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                {entry.fileName}
              </span>
              <span className="text-[10px] shrink-0" style={{ color: 'var(--text-faint)' }}>
                {new Date(entry.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
              </span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                style={{ background: 'var(--income-50)', color: 'var(--income-600)' }}
              >
                {entry.count} mov.
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── AutoDetectedBadge ─────────────────────────────────────────────────────────

function AutoDetectedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1.5"
      style={{ background: 'var(--income-50)', color: 'var(--income-600)', border: '1px solid var(--income-100)' }}
    >
      <Sparkles size={9} /> Auto
    </span>
  )
}

// ── ConfidenceBadge ───────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const map: Record<Confidence, { dot: string; label: string }> = {
    high:   { dot: '#16a34a', label: 'Alta confianza' },
    medium: { dot: '#f59e0b', label: 'Revisar' },
    low:    { dot: '#f97316', label: 'Baja confianza' },
    none:   { dot: '#e11d48', label: 'Sin reconocer' },
  }
  const { dot, label } = map[confidence]
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
    </span>
  )
}

// ── RowCategorySelect ─────────────────────────────────────────────────────────

interface RowCategorySelectProps {
  rowIndex: number
  currentCategoryId: string | null
  confidence: Confidence
  categories: Category[]
  onChange: (rowIndex: number, categoryId: string | null) => void
  onCreateNew: (rowIndex: number) => void
}

function RowCategorySelect({ rowIndex, currentCategoryId, confidence, categories, onChange, onCreateNew }: RowCategorySelectProps) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <ConfidenceBadge confidence={confidence} />
      <select
        value={currentCategoryId ?? ''}
        onChange={e => {
          const val = e.target.value
          if (val === '__create__') { onCreateNew(rowIndex); return }
          onChange(rowIndex, val === '' ? null : val)
        }}
        className="text-[11px] font-medium rounded-lg px-2 py-1 outline-none transition-all flex-1 min-w-0"
        style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          maxWidth: '140px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <option value="">Sin categoría</option>
        {categories.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
        <option value="__create__">＋ Crear categoría…</option>
      </select>
    </div>
  )
}

// ── DuplicateBanner ───────────────────────────────────────────────────────────

function DuplicateBanner({ count }: { count: number }) {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl px-4 py-3"
      style={{ background: 'var(--expense-50)', border: '1px solid var(--expense-100)' }}
    >
      <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--expense-500)' }} />
      <div>
        <p className="text-sm font-bold" style={{ color: 'var(--expense-600)' }}>
          {count} posible{count !== 1 ? 's' : ''} duplicado{count !== 1 ? 's' : ''} detectado{count !== 1 ? 's' : ''}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--expense-500)' }}>
          Encontramos movimientos con la misma fecha e importe. Podés igualmente importarlos.
        </p>
      </div>
    </div>
  )
}

// ── FinancialImpactPanel ──────────────────────────────────────────────────────

interface ImpactProps {
  parsed: ParsedRow[]
  selected: Set<number>
  rowCategories: Map<number, string | null>
  categories: Category[]
}

function FinancialImpactPanel({ parsed, selected, rowCategories, categories }: ImpactProps) {
  const selectedRows = parsed.filter(r => selected.has(r._index) && !r._error)
  const incomeRows   = selectedRows.filter(r => r.type === 'income')
  const expenseRows  = selectedRows.filter(r => r.type === 'expense')
  const totalIncome  = incomeRows.reduce((s, r) => s + r.amount, 0)
  const totalExpense = expenseRows.reduce((s, r) => s + r.amount, 0)

  const affectedCats = new Set(
    selectedRows.map(r => rowCategories.get(r._index) ?? r.category_id).filter(Boolean)
  )
  const affectedCatNames = [...affectedCats]
    .map(id => categories.find(c => c.id === id)?.name)
    .filter(Boolean)
    .slice(0, 3)

  if (selectedRows.length === 0) return null

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
        Esta importación impactará en:
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl p-3" style={{ background: 'var(--income-50)', border: '1px solid var(--income-100)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} style={{ color: 'var(--income-600)' }} />
            <span className="text-[10px] font-bold" style={{ color: 'var(--income-600)' }}>Ingresos</span>
          </div>
          <p className="text-base font-extrabold tabular-nums" style={{ color: 'var(--income-700, #15803d)' }}>
            {incomeRows.length} <span className="text-xs font-semibold">mov.</span>
          </p>
          <p className="text-xs tabular-nums" style={{ color: 'var(--income-600)' }}>
            +{formatCurrency(totalIncome, 'ARS')}
          </p>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'var(--expense-50)', border: '1px solid var(--expense-100)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown size={12} style={{ color: 'var(--expense-600)' }} />
            <span className="text-[10px] font-bold" style={{ color: 'var(--expense-600)' }}>Gastos</span>
          </div>
          <p className="text-base font-extrabold tabular-nums" style={{ color: 'var(--expense-700, #be123c)' }}>
            {expenseRows.length} <span className="text-xs font-semibold">mov.</span>
          </p>
          <p className="text-xs tabular-nums" style={{ color: 'var(--expense-600)' }}>
            -{formatCurrency(totalExpense, 'ARS')}
          </p>
        </div>
      </div>
      {affectedCatNames.length > 0 && (
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Categorías: <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {affectedCatNames.join(', ')}{affectedCats.size > 3 ? ` +${affectedCats.size - 3}` : ''}
          </span>
        </p>
      )}
    </div>
  )
}

// ── CategoryCreateModal ───────────────────────────────────────────────────────

interface CategoryCreateModalProps {
  open: boolean
  onClose: () => void
  onCreated: (cat: Category) => void
}

function CategoryCreateModal({ open, onClose, onCreated }: CategoryCreateModalProps) {
  const { addToast } = useToast()
  const [form, setForm] = useState<Partial<Category>>({ type: 'expense', color: '#6d3bd7', icon: 'tag' })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.name?.trim()) { addToast('Ingresá un nombre para la categoría', 'error'); return }
    setSaving(true)
    try {
      const created = await categoriesService.create({
        name: form.name.trim(),
        type: form.type ?? 'expense',
        color: form.color ?? '#6d3bd7',
        icon: form.icon ?? 'tag',
      })
      addToast(`Categoría "${created.name}" creada`, 'success')
      onCreated(created)
      setForm({ type: 'expense', color: '#6d3bd7', icon: 'tag' })
    } catch {
      addToast('Error al crear la categoría', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva categoría" size="sm">
      <div className="space-y-4">
        <Input
          label="Nombre"
          value={form.name ?? ''}
          onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          placeholder="Ej: Streaming, Mascota…"
        />

        {/* Tipo */}
        <div>
          <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>Tipo</p>
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {(['expense', 'income'] as const).map(t => (
              <button
                key={t}
                onClick={() => setForm(p => ({ ...p, type: t }))}
                className="flex-1 py-2 text-xs font-bold transition-all"
                style={form.type === t ? {
                  background: t === 'expense' ? 'var(--grad-expense)' : 'var(--grad-income)',
                  color: '#fff',
                } : { background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
              >
                {t === 'expense' ? 'Gasto' : 'Ingreso'}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div>
          <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>Color</p>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map(c => (
              <button
                key={c}
                onClick={() => setForm(p => ({ ...p, color: c }))}
                className="w-7 h-7 rounded-full transition-all"
                style={{
                  background: c,
                  transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: form.color === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* Ícono */}
        <div>
          <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>Ícono</p>
          <div className="flex flex-wrap gap-2">
            {INLINE_ICON_LIST.map(([key, Icon]) => (
              <button
                key={key}
                onClick={() => setForm(p => ({ ...p, icon: key }))}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={{
                  background: form.icon === key ? (form.color ?? 'var(--brand-500)') : 'var(--bg-subtle)',
                  border: form.icon === key ? 'none' : '1px solid var(--border)',
                }}
              >
                <Icon size={16} color={form.icon === key ? '#fff' : 'var(--text-muted)'} />
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} loading={saving} className="w-full">
          Crear categoría
        </Button>
      </div>
    </Modal>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ImportPage() {
  const router            = useRouter()
  const { addToast }      = useToast()
  const { user }          = useAuth()
  const { data: categories, refetch: refetchCategories } = useCategories()
  const { data: wallets } = useWallets()

  // ── Navegación
  const [step, setStep] = useState<Step>('upload')

  // ── Step 1: upload
  const [fileName, setFileName]         = useState('')
  const [headers, setHeaders]           = useState<string[]>([])
  const [rawRows, setRawRows]           = useState<CsvRow[]>([])
  const [dragging, setDragging]         = useState(false)
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  const [importHistory, setImportHistory] = useState<ImportHistoryEntry[]>(() => loadImportHistory())
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Step 2: mapping
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({
    dateFormat: 'DD/MM/YYYY',
    amountSignRule: 'positive_income',
    defaultCurrency: 'ARS',
  })
  const [autoDetectedFields, setAutoDetectedFields] = useState<Set<keyof ColumnMapping>>(new Set())
  const [showAdvanced, setShowAdvanced] = useState(false)

  // ── Step 3: preview
  const [parsed, setParsed]             = useState<ParsedRow[]>([])
  const [selected, setSelected]         = useState<Set<number>>(new Set())
  const [rowCategories, setRowCategories] = useState<Map<number, string | null>>(new Map())
  const [rowConfidence, setRowConfidence] = useState<Map<number, Confidence>>(new Map())
  const [duplicateFlags, setDuplicateFlags] = useState<Set<number>>(new Set())
  const [rowFilter, setRowFilter] = useState<RowFilter>('all')

  // ── Modal creación categoría inline
  const [categoryModalOpen, setCategoryModalOpen]         = useState(false)
  const [categoryModalTargetRow, setCategoryModalTargetRow] = useState<number | null>(null)

  // ── Importación
  const [importing, setImporting] = useState(false)
  const [result, setResult]       = useState<ImportResult | null>(null)

  // ── Options
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

  const walletColumnDetected = headers.some(h => {
    const lower = h.toLowerCase()
    return lower.includes('billetera') || lower.includes('wallet') || lower.includes('cuenta') || lower.includes('account')
  })
  const canContinue = fileName !== '' && (!!mapping.defaultWalletId || walletColumnDetected)

  // ── Derivados de parsed (antes de handlers para que toggleAll los pueda usar) ──

  const filteredParsed = useMemo(() => {
    switch (rowFilter) {
      case 'errors':     return parsed.filter(r => !!r._error)
      case 'review':     return parsed.filter(r => { const c = rowConfidence.get(r._index); return c === 'low' || c === 'none' })
      case 'income':     return parsed.filter(r => !r._error && r.type === 'income')
      case 'expense':    return parsed.filter(r => !r._error && r.type === 'expense')
      case 'duplicates': return parsed.filter(r => duplicateFlags.has(r._index))
      default:           return parsed
    }
  }, [parsed, rowFilter, rowConfidence, duplicateFlags])

  const filterCounts: Record<RowFilter, number> = useMemo(() => ({
    all:        parsed.length,
    errors:     parsed.filter(r => !!r._error).length,
    review:     parsed.filter(r => { const c = rowConfidence.get(r._index); return c === 'low' || c === 'none' }).length,
    income:     parsed.filter(r => !r._error && r.type === 'income').length,
    expense:    parsed.filter(r => !r._error && r.type === 'expense').length,
    duplicates: parsed.filter(r => duplicateFlags.has(r._index)).length,
  }), [parsed, rowConfidence, duplicateFlags])

  const isAutoComplete = (['dateColumn', 'descriptionColumn', 'amountColumn'] as const).every(
    f => autoDetectedFields.has(f)
  )

  // ── autoDetectColumns ─────────────────────────────────────────────────────

  function autoDetectColumns(cols: string[]): { detected: Partial<ColumnMapping>; autoFields: Set<keyof ColumnMapping> } {
    const lower = cols.map(c => c.toLowerCase())
    const find = (...terms: string[]) =>
      cols[lower.findIndex(c => terms.some(t => c.includes(t)))] ?? ''

    const dateColumn        = find('fecha', 'date', 'dia', 'fec')
    const descriptionColumn = find('descripcion', 'descripción', 'concepto', 'detalle', 'description', 'desc')
    const amountColumn      = find('monto', 'importe', 'amount', 'valor', 'credito', 'crédito', 'debito', 'débito')
    const typeColumn        = find('tipo', 'type', 'movimiento')

    const detected: Partial<ColumnMapping> = { dateColumn, descriptionColumn, amountColumn, typeColumn }
    const autoFields = new Set<keyof ColumnMapping>(
      (Object.entries(detected) as [keyof ColumnMapping, string][])
        .filter(([, v]) => v !== '')
        .map(([k]) => k)
    )
    return { detected, autoFields }
  }

  // ── processFile ───────────────────────────────────────────────────────────

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

      // Reset step-3 state
      setParsed([]); setSelected(new Set())
      setRowCategories(new Map()); setRowConfidence(new Map()); setDuplicateFlags(new Set())

      setHeaders(h)
      setRawRows(rows)
      setFileName(file.name)
      const { detected, autoFields } = autoDetectColumns(h)
      if (detected.dateColumn) {
        const detectedFormat = detectDateFormatFromSample(rows, detected.dateColumn)
        if (detectedFormat) {
          detected.dateFormat = detectedFormat
          autoFields.add('dateFormat')
        }
      }
      setMapping(prev => ({ ...prev, ...detected }))
      setAutoDetectedFields(autoFields)
      // No auto-avanzamos: el usuario ve el estado cargado y hace clic en "Continuar"
    }
    reader.readAsText(file, 'utf-8')
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
    setSelectedPresetId(id)
    setMapping(prev => ({ ...prev, ...preset.mapping }))
  }

  function resetUpload() {
    setFileName(''); setHeaders([]); setRawRows([])
    setParsed([]); setSelected(new Set())
    setRowCategories(new Map()); setRowConfidence(new Map()); setDuplicateFlags(new Set())
    setSelectedPresetId(null)
  }

  // ── handleGoPreview ───────────────────────────────────────────────────────

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
    const learnedRules: LearnedRule[] = user?.id ? getLearnedRules(user.id) : []

    // Sugerir categorías por fila
    const newRowCats  = new Map<number, string | null>()
    const newRowConf  = new Map<number, Confidence>()
    for (const row of rows) {
      if (row._error) continue
      const suggestion = suggestCategory(row.description, categories, learnedRules)
      if (suggestion.categoryId) {
        newRowCats.set(row._index, suggestion.categoryId)
      } else if (mapping.defaultCategoryId) {
        newRowCats.set(row._index, mapping.defaultCategoryId)
      }
      newRowConf.set(row._index, suggestion.confidence)
    }

    // Detectar duplicados dentro del propio archivo
    const fingerprints = new Map<string, number[]>()
    for (const row of rows) {
      if (row._error) continue
      const key = `${row.date}|${row.amount}|${row.type}|${normalizeDesc(row.description)}`
      const existing = fingerprints.get(key) ?? []
      fingerprints.set(key, [...existing, row._index])
    }
    const newDuplicates = new Set<number>()
    for (const indices of fingerprints.values()) {
      if (indices.length > 1) indices.forEach(i => newDuplicates.add(i))
    }

    setRowCategories(newRowCats)
    setRowConfidence(newRowConf)
    setDuplicateFlags(newDuplicates)
    setParsed(rows)
    setSelected(new Set(rows.filter(r => !r._error).map(r => r._index)))
    setRowFilter('all')
    setStep('preview')
  }

  // ── Toggle selección ──────────────────────────────────────────────────────

  function toggleRow(idx: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx); else next.add(idx)
      return next
    })
  }

  function toggleAll() {
    const visibleValid = filteredParsed.filter(r => !r._error).map(r => r._index)
    const allSelected = visibleValid.length > 0 && visibleValid.every(i => selected.has(i))
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) visibleValid.forEach(i => next.delete(i))
      else visibleValid.forEach(i => next.add(i))
      return next
    })
  }

  // ── Cambio de categoría por fila ──────────────────────────────────────────

  function handleRowCategoryChange(rowIndex: number, categoryId: string | null) {
    setRowCategories(prev => new Map(prev).set(rowIndex, categoryId))
    setRowConfidence(prev => new Map(prev).set(rowIndex, 'high'))
  }

  function handleOpenCreateCategory(rowIndex: number) {
    setCategoryModalTargetRow(rowIndex)
    setCategoryModalOpen(true)
  }

  async function handleCategoryCreated(cat: Category) {
    if (categoryModalTargetRow !== null && cat.id) {
      setRowCategories(prev => new Map(prev).set(categoryModalTargetRow, cat.id!))
      setRowConfidence(prev => new Map(prev).set(categoryModalTargetRow, 'high'))
    }
    setCategoryModalOpen(false)
    setCategoryModalTargetRow(null)
    await refetchCategories()
  }

  // ── handleImport ──────────────────────────────────────────────────────────

  async function handleImport() {
    const toImport = parsed
      .filter(r => selected.has(r._index) && !r._error)
      .map(r => {
        const catOverride = rowCategories.get(r._index) ?? null
        return toTransactionInput({ ...r, category_id: catOverride })
      })

    if (toImport.length === 0) { addToast('No hay filas válidas seleccionadas', 'warning'); return }

    setImporting(true)
    try {
      const res = await transactionsService.createBatch(toImport)
      const importState: ImportResultState = res.errors === 0 ? 'success' : res.success === 0 ? 'failure' : 'partial'
      setResult({ ...res, state: importState })
      setStep('done')

      if (res.success > 0 && user?.id) {
        // Aprender reglas de merchant
        const learningPairs = parsed
          .filter(r => selected.has(r._index) && !r._error)
          .flatMap(r => {
            const catId = rowCategories.get(r._index) ?? null
            if (!catId) return []
            return [{ description: r.description, categoryId: catId }]
          })
        learnMerchantRules(user.id, learningPairs)

        // Guardar en historial
        const entry: ImportHistoryEntry = {
          id: Date.now().toString(),
          fileName,
          date: new Date().toISOString(),
          count: res.success,
          bankId: selectedPresetId,
          bankName: selectedPresetId ? (BANK_PRESETS.find(p => p.id === selectedPresetId)?.name ?? null) : null,
        }
        saveImportHistory(entry)
        setImportHistory(loadImportHistory())

        markImportUsed(user.id)
        addToast(`✓ ${res.success} transacciones importadas`, 'success')
      }
      if (res.errors > 0) addToast(`${res.errors} filas con error`, 'warning')
    } catch {
      addToast('Error al importar. Intentá de nuevo.', 'error')
    } finally {
      setImporting(false)
    }
  }

  // ── Derivados de render ───────────────────────────────────────────────────

  const validRows   = parsed.filter(r => !r._error)
  const errorRows   = parsed.filter(r => !!r._error)
  const incomeRows  = validRows.filter(r => r.type === 'income')
  const expenseRows = validRows.filter(r => r.type === 'expense')

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 md:p-7 max-w-4xl mx-auto animate-fade-in">

      <div className="mb-6">
        <PageHeader
          title="Importación inteligente"
          subtitle="Convertí resúmenes bancarios en movimientos organizados automáticamente."
          icon={Sparkles}
          color="#a078ff"
          layout="split"
        >
          <HelpButton section="import" />
        </PageHeader>
      </div>

      <StepBar current={step} />

      {/* ── PASO 1: UPLOAD ── */}
      {step === 'upload' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_256px] gap-4 items-start mb-3">

            {/* ── Columna principal ── */}
            <div className="space-y-3">

              {/* Card 1: Subir archivo */}
              <div
                className="rounded-2xl p-4 space-y-3"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span
                      className="inline-flex w-5 h-5 rounded-md items-center justify-center text-[10px] font-black shrink-0"
                      style={{ background: 'var(--brand-100)', color: 'var(--brand-600)' }}
                    >1</span>
                    Subí tu resumen bancario
                  </p>
                  {fileName && (
                    <span
                      className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: 'var(--income-50)', color: 'var(--income-600)', border: '1px solid var(--income-100)' }}
                    >
                      <Check size={9} strokeWidth={3} /> Cargado
                    </span>
                  )}
                </div>

                <DropZone
                  dragging={dragging}
                  fileName={fileName}
                  detectedBankId={selectedPresetId}
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onSelectClick={() => fileRef.current?.click()}
                  onReset={resetUpload}
                />
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={onFileInput} />
              </div>

              {/* Card 2: Billetera destino */}
              <div
                className="rounded-2xl p-4 space-y-3"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
              >
                <div className="flex items-center gap-2 justify-between">
                  <p className="text-sm font-extrabold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span
                      className="inline-flex w-5 h-5 rounded-md items-center justify-center text-[10px] font-black shrink-0"
                      style={{ background: 'var(--brand-100)', color: 'var(--brand-600)' }}
                    >2</span>
                    Billetera destino
                  </p>
                  {(mapping.defaultWalletId || walletColumnDetected) && (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'var(--income-50)', border: '1px solid var(--income-200)' }}
                    >
                      <Check size={10} strokeWidth={3} style={{ color: 'var(--income-600)' }} />
                    </div>
                  )}
                </div>

                <p className="text-[11px] -mt-1" style={{ color: 'var(--text-muted)' }}>
                  Define dónde se registrarán los movimientos importados.
                </p>

                {walletColumnDetected && (
                  <div
                    className="flex items-start gap-2 rounded-xl px-3 py-2"
                    style={{ background: 'var(--income-50)', border: '1px solid var(--income-100)' }}
                  >
                    <Check size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--income-600)' }} />
                    <p className="text-[10px] leading-relaxed" style={{ color: 'var(--income-700, #15803d)' }}>
                      El archivo tiene columna de billetera — se mapeará en el paso siguiente. Podés elegir una por defecto como respaldo.
                    </p>
                  </div>
                )}

                {!walletColumnDetected && !mapping.defaultWalletId && fileName && (
                  <div
                    className="flex items-start gap-2 rounded-xl px-3 py-2"
                    style={{ background: 'var(--expense-50)', border: '1px solid var(--expense-100)' }}
                  >
                    <AlertCircle size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--expense-500)' }} />
                    <p className="text-[10px] leading-relaxed" style={{ color: 'var(--expense-600)' }}>
                      Este archivo no trae columna de billetera. Seleccioná una billetera destino para continuar.
                    </p>
                  </div>
                )}

                <Select
                  label={walletColumnDetected ? 'Billetera por defecto (opcional)' : 'Billetera destino *'}
                  value={mapping.defaultWalletId ?? ''}
                  onChange={e => setMapping(p => ({ ...p, defaultWalletId: e.target.value || undefined }))}
                  options={walletOpts}
                />
              </div>
            </div>

            {/* ── Columna derecha ── */}
            <div className="space-y-3">

              {/* Formato del archivo */}
              <div
                className="rounded-2xl p-4"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
              >
                <p className="text-xs font-extrabold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                  Formato del archivo
                </p>
                <p className="text-[10px] mb-3 leading-relaxed" style={{ color: 'var(--text-faint)' }}>
                  Pre-configura fechas y montos. No define dónde impacta el dinero.
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {BANK_PRESETS.map(preset => (
                    <BankChip
                      key={preset.id}
                      preset={preset}
                      selected={selectedPresetId === preset.id}
                      onClick={() => applyPreset(preset.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Qué detecta Equal */}
              <AutoDetectChecklist />

              {/* Historial (solo si hay datos) */}
              {importHistory.length > 0 && <ImportHistoryPanel history={importHistory} />}

            </div>
          </div>

          {/* ── Footer de acción Step 1 ── */}
          <div
            className="sticky bottom-0 flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--border)',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
            }}
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {[
                { ok: !!fileName,                                  label: 'Archivo' },
                { ok: !!mapping.defaultWalletId || walletColumnDetected, label: 'Billetera' },
              ].map(({ ok, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: ok ? 'var(--income-50)' : 'var(--bg-subtle)',
                      border: `1px solid ${ok ? 'var(--income-200)' : 'var(--border)'}`,
                    }}
                  >
                    {ok
                      ? <Check size={9} strokeWidth={3} style={{ color: 'var(--income-600)' }} />
                      : <span className="w-2 h-0.5 rounded-full block" style={{ background: 'var(--text-faint)' }} />
                    }
                  </div>
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: ok ? 'var(--income-600)' : 'var(--text-faint)' }}
                  >
                    {label}
                  </span>
                </div>
              ))}
              {fileName && !canContinue && (
                <span className="text-[10px] hidden sm:block" style={{ color: 'var(--expense-500)' }}>
                  Seleccioná una billetera para continuar
                </span>
              )}
            </div>

            <Button
              onClick={() => { setShowAdvanced(false); setStep('map') }}
              disabled={!canContinue}
              className="flex items-center gap-2 shrink-0"
            >
              Continuar <ChevronRight size={15} />
            </Button>
          </div>
        </>
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
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-colors hover:bg-white/80"
              style={{ color: 'var(--brand-500)' }}
            >
              Cambiar
            </button>
          </div>

          {/* Mapeo columnas: modo simple o avanzado */}
          {isAutoComplete && !showAdvanced ? (
            <div
              className="rounded-2xl p-5"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>
                    Columnas detectadas
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Todo listo para procesar</p>
                </div>
                <button
                  onClick={() => setShowAdvanced(true)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                  style={{ color: 'var(--brand-500)', background: 'var(--brand-50)', border: '1px solid var(--brand-100)' }}
                >
                  Ver avanzado
                </button>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                {([
                  { field: 'dateColumn' as keyof ColumnMapping, label: 'Fecha' },
                  { field: 'descriptionColumn' as keyof ColumnMapping, label: 'Descripción' },
                  { field: 'amountColumn' as keyof ColumnMapping, label: 'Monto' },
                  { field: 'dateFormat' as keyof ColumnMapping, label: 'Formato de fecha' },
                ]).map(({ field, label }) => {
                  const value = mapping[field] as string | undefined
                  if (!value) return null
                  return (
                    <div key={field} className="flex items-center justify-between py-2.5">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{value}</span>
                        {autoDetectedFields.has(field) && <AutoDetectedBadge />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <>
              <div
                className="rounded-2xl p-5 space-y-4"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>
                    Asignar columnas
                  </h2>
                  {showAdvanced && isAutoComplete && (
                    <button
                      onClick={() => setShowAdvanced(false)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                      style={{ color: 'var(--text-muted)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
                    >
                      ← Modo simple
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([
                    { field: 'dateColumn' as keyof ColumnMapping, label: 'Columna de fecha *' },
                    { field: 'descriptionColumn' as keyof ColumnMapping, label: 'Columna de descripción *' },
                    { field: 'amountColumn' as keyof ColumnMapping, label: 'Columna de monto *' },
                    { field: 'typeColumn' as keyof ColumnMapping, label: 'Columna de tipo (opcional)' },
                  ] as const).map(({ field, label }) => (
                    <div key={field}>
                      <div className="flex items-center mb-1">
                        <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                        {autoDetectedFields.has(field) && <AutoDetectedBadge />}
                      </div>
                      <select
                        value={(mapping[field] as string) ?? ''}
                        onChange={e => setMapping(p => ({ ...p, [field]: e.target.value || undefined }))}
                        className="w-full text-sm rounded-xl px-3 py-2.5 outline-none transition-all"
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {columnOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

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
                  label="Categoría por defecto (se usa si no se detecta automáticamente)"
                  value={mapping.defaultCategoryId ?? ''}
                  onChange={e => setMapping(p => ({ ...p, defaultCategoryId: e.target.value || undefined }))}
                  options={categoryOpts}
                />
              </div>
            </>
          )}

          {/* Vista previa */}
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
                        <th key={h} className="px-3 py-2 text-left font-bold" style={{ color: 'var(--text-muted)' }}>{h}</th>
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
              Ver sugerencias <Sparkles size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* ── PASO 3: PREVIEW ── */}
      {step === 'preview' && (
        <div className="space-y-5 pb-20">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total filas',   value: parsed.length,      color: 'var(--brand-500)',   bg: 'var(--brand-50)' },
              { label: 'Seleccionadas', value: selected.size,      color: 'var(--text-primary)', bg: 'var(--bg-subtle)' },
              { label: 'Ingresos',      value: incomeRows.length,  color: 'var(--income-600)',  bg: 'var(--income-50)' },
              { label: 'Gastos',        value: expenseRows.length, color: 'var(--expense-600)', bg: 'var(--expense-50)' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-4" style={{ background: s.bg, border: '1px solid var(--border)' }}>
                <p className="text-2xl font-extrabold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5 font-semibold" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filter chips */}
          {parsed.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {([
                { key: 'all'        as RowFilter, label: 'Todos' },
                { key: 'errors'     as RowFilter, label: 'Errores' },
                { key: 'review'     as RowFilter, label: 'A revisar' },
                { key: 'income'     as RowFilter, label: 'Ingresos' },
                { key: 'expense'    as RowFilter, label: 'Gastos' },
                { key: 'duplicates' as RowFilter, label: 'Duplicados' },
              ]).map(({ key, label }) => {
                const count = filterCounts[key]
                if (key !== 'all' && count === 0) return null
                return (
                  <button
                    key={key}
                    onClick={() => setRowFilter(key)}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-all"
                    style={{
                      background: rowFilter === key ? 'var(--brand-500)' : 'var(--bg-subtle)',
                      color: rowFilter === key ? '#fff' : 'var(--text-muted)',
                      border: rowFilter === key ? '1px solid var(--brand-500)' : '1px solid var(--border)',
                    }}
                  >
                    {label} ({count})
                  </button>
                )
              })}
            </div>
          )}

          {/* Duplicados */}
          {duplicateFlags.size > 0 && <DuplicateBanner count={duplicateFlags.size} />}

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

          {/* Tabla de preview */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            {/* Header tabla */}
            <div
              className="hidden sm:grid px-4 py-2.5 gap-3 text-xs font-bold"
              style={{
                gridTemplateColumns: '32px 80px 1fr 160px 100px 70px',
                borderBottom: '1px solid var(--border-light)',
                background: 'var(--bg-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              <button onClick={toggleAll} title="Seleccionar todo">
                {filteredParsed.filter(r => !r._error).every(r => selected.has(r._index))
                  ? <CheckSquare size={15} style={{ color: 'var(--brand-500)' }} />
                  : <Square size={15} style={{ color: 'var(--text-faint)' }} />
                }
              </button>
              <span>Fecha</span>
              <span>Descripción</span>
              <span>Categoría</span>
              <span className="text-right">Monto</span>
              <span>Tipo</span>
            </div>

            {/* Mobile header */}
            <div
              className="flex sm:hidden items-center gap-3 px-4 py-2.5"
              style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--bg-subtle)' }}
            >
              <button onClick={toggleAll}>
                {filteredParsed.filter(r => !r._error).every(r => selected.has(r._index))
                  ? <CheckSquare size={15} style={{ color: 'var(--brand-500)' }} />
                  : <Square size={15} style={{ color: 'var(--text-faint)' }} />
                }
              </button>
              <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                {selected.size} de {validRows.length} seleccionadas
              </span>
            </div>

            <div className="max-h-[480px] overflow-y-auto divide-y" style={{ borderColor: 'var(--border-light)' }}>
              {filteredParsed.map(row => {
                const hasError = !!row._error
                const isSel    = selected.has(row._index)
                const isDup    = duplicateFlags.has(row._index)
                const catId    = rowCategories.get(row._index) ?? null
                const conf     = rowConfidence.get(row._index) ?? 'none'

                return (
                  <div
                    key={row._index}
                    className="transition-colors"
                    style={{
                      background: hasError ? 'var(--expense-50)' : isDup ? 'rgba(245,158,11,0.04)' : 'transparent',
                      opacity: hasError ? 0.7 : 1,
                    }}
                  >
                    {/* Desktop layout */}
                    <div
                      className="hidden sm:grid items-center px-4 py-3 gap-3 hover:bg-[var(--bg-subtle)] transition-colors"
                      style={{ gridTemplateColumns: '32px 80px 1fr 160px 100px 70px' }}
                    >
                      <button
                        onClick={() => !hasError && toggleRow(row._index)}
                        disabled={hasError}
                        className="flex items-center justify-center"
                      >
                        {hasError
                          ? <AlertCircle size={15} style={{ color: 'var(--expense-500)' }} />
                          : isSel
                            ? <CheckSquare size={15} style={{ color: 'var(--brand-500)' }} />
                            : <Square size={15} style={{ color: 'var(--text-faint)' }} />
                        }
                      </button>
                      <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {row.date || <span style={{ color: 'var(--expense-500)' }}>{row._error}</span>}
                      </span>
                      <span className="text-sm truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                        {row.description}
                        {isDup && (
                          <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#d97706' }}>
                            dup
                          </span>
                        )}
                      </span>
                      {!hasError ? (
                        <RowCategorySelect
                          rowIndex={row._index}
                          currentCategoryId={catId}
                          confidence={conf}
                          categories={categories}
                          onChange={handleRowCategoryChange}
                          onCreateNew={handleOpenCreateCategory}
                        />
                      ) : <span />}
                      <span
                        className="text-sm font-bold tabular-nums text-right"
                        style={{ color: row.type === 'income' ? 'var(--income-600)' : 'var(--expense-600)' }}
                      >
                        {row.type === 'income' ? '+' : '−'}{formatCurrency(row.amount, row.currency)}
                      </span>
                      <div className="flex items-center gap-1">
                        {row.type === 'income'
                          ? <TrendingUp size={12} style={{ color: 'var(--income-500)' }} />
                          : <TrendingDown size={12} style={{ color: 'var(--expense-500)' }} />
                        }
                        <span className="text-xs font-semibold" style={{ color: row.type === 'income' ? 'var(--income-600)' : 'var(--expense-600)' }}>
                          {row.type === 'income' ? 'Ingreso' : 'Gasto'}
                        </span>
                      </div>
                    </div>

                    {/* Mobile layout */}
                    <div className="flex sm:hidden items-start gap-3 px-4 py-3">
                      <button
                        onClick={() => !hasError && toggleRow(row._index)}
                        disabled={hasError}
                        className="mt-0.5 shrink-0"
                      >
                        {hasError
                          ? <AlertCircle size={15} style={{ color: 'var(--expense-500)' }} />
                          : isSel
                            ? <CheckSquare size={15} style={{ color: 'var(--brand-500)' }} />
                            : <Square size={15} style={{ color: 'var(--text-faint)' }} />
                        }
                      </button>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {row.description}
                          </span>
                          <span
                            className="text-sm font-bold tabular-nums shrink-0"
                            style={{ color: row.type === 'income' ? 'var(--income-600)' : 'var(--expense-600)' }}
                          >
                            {row.type === 'income' ? '+' : '−'}{formatCurrency(row.amount, row.currency)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono" style={{ color: 'var(--text-faint)' }}>{row.date}</span>
                          {!hasError && (
                            <RowCategorySelect
                              rowIndex={row._index}
                              currentCategoryId={catId}
                              confidence={conf}
                              categories={categories}
                              onChange={handleRowCategoryChange}
                              onCreateNew={handleOpenCreateCategory}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Impacto financiero */}
          <FinancialImpactPanel
            parsed={parsed}
            selected={selected}
            rowCategories={rowCategories}
            categories={categories}
          />

          {/* Sticky action footer */}
          <div
            className="sticky bottom-0 flex items-center gap-3 rounded-2xl px-4 py-3 z-10"
            style={{
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--border)',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
            }}
          >
            <Button variant="secondary" onClick={() => setStep('map')} className="flex items-center gap-2">
              <ChevronLeft size={15} /> Volver
            </Button>
            <p className="flex-1 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{selected.size}</span> de {validRows.length} seleccionadas
            </p>
            <Button
              onClick={handleImport}
              loading={importing}
              disabled={selected.size === 0}
            >
              Importar {selected.size}
            </Button>
          </div>
        </div>
      )}

      {/* ── PASO 4: DONE ── */}
      {step === 'done' && result && (() => {
        const isSuccess = result.state === 'success'
        const isPartial = result.state === 'partial'
        const isFailure = result.state === 'failure'

        const iconBg   = isFailure ? 'linear-gradient(135deg,#e11d48,#be123c)' : isPartial ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'var(--grad-income)'
        const iconShadow = isFailure ? '0 4px 16px rgba(225,29,72,0.35)' : isSuccess ? 'var(--shadow-income)' : '0 4px 16px rgba(245,158,11,0.35)'
        const title    = isSuccess ? '¡Importación completada!' : isPartial ? 'Importación parcial' : 'No se pudo importar'
        const subtitle = isSuccess
          ? `${result.success} transacción${result.success !== 1 ? 'es' : ''} importada${result.success !== 1 ? 's' : ''} correctamente`
          : isPartial
          ? `${result.success} importadas · ${result.errors} con error`
          : `No se pudo importar ninguna transacción (${result.errors} error${result.errors !== 1 ? 'es' : ''})`

        return (
          <div
            className="flex flex-col items-center justify-center py-14 gap-6 rounded-3xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: iconBg, boxShadow: iconShadow }}
            >
              {isSuccess
                ? <Check size={40} className="text-white" strokeWidth={2.5} />
                : isPartial
                ? <AlertTriangle size={40} className="text-white" strokeWidth={2} />
                : <X size={40} className="text-white" strokeWidth={2.5} />
              }
            </div>

            <div className="text-center space-y-2 px-6">
              <h2 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
              <p className="text-base" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
            </div>

            {/* Mini stats */}
            <div className="flex gap-4">
              {result.success > 0 && (
                <div className="rounded-2xl px-5 py-3 text-center" style={{ background: 'var(--income-50)', border: '1px solid var(--border)' }}>
                  <p className="text-2xl font-extrabold tabular-nums" style={{ color: 'var(--income-600)' }}>{result.success}</p>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>Importadas</p>
                </div>
              )}
              {result.errors > 0 && (
                <div className="rounded-2xl px-5 py-3 text-center" style={{ background: 'var(--expense-50)', border: '1px solid var(--border)' }}>
                  <p className="text-2xl font-extrabold tabular-nums" style={{ color: 'var(--expense-600)' }}>{result.errors}</p>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>Con error</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-2">
              {isFailure ? (
                <>
                  <Button variant="secondary" onClick={() => setStep('preview')}>
                    Volver a revisar
                  </Button>
                  <Button variant="secondary" onClick={() => {
                    setStep('upload'); setFileName(''); setRawRows([]); setHeaders([])
                    setParsed([]); setResult(null); setRowCategories(new Map())
                    setRowConfidence(new Map()); setDuplicateFlags(new Set())
                    setSelectedPresetId(null)
                  }}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setStep('upload'); setFileName(''); setRawRows([]); setHeaders([])
                      setParsed([]); setResult(null); setRowCategories(new Map())
                      setRowConfidence(new Map()); setDuplicateFlags(new Set())
                      setSelectedPresetId(null)
                    }}
                  >
                    Importar otro
                  </Button>
                  <Button onClick={() => router.push('/transactions')}>
                    Ver transacciones
                  </Button>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Modal categoría inline ── */}
      <CategoryCreateModal
        open={categoryModalOpen}
        onClose={() => { setCategoryModalOpen(false); setCategoryModalTargetRow(null) }}
        onCreated={handleCategoryCreated}
      />
    </div>
  )
}
