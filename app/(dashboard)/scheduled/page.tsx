'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, CalendarClock, ToggleLeft, ToggleRight, Clock } from 'lucide-react'
import { recurringService } from '@/services/recurring.service'
import { useToast } from '@/components/providers/ToastProvider'
import { useCategories } from '@/hooks/useCategories'
import { useWallets } from '@/hooks/useWallets'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { formatCurrency } from '@/utils/format'
import { formatDate } from '@/utils/date'
import { RECURRING_CADENCES } from '@/types'
import type { RecurringTransaction, RecurringTransactionWithDetails } from '@/types'

const CURRENCY_OPTS = [
  { value: 'ARS', label: 'ARS' }, { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' }, { value: 'CRYPTO', label: 'CRYPTO' },
]

const CADENCE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  daily:     { label: 'Diario',     color: '#F59E0B', bg: '#FFFBEB' },
  weekly:    { label: 'Semanal',    color: '#0EA5E9', bg: '#F0F9FF' },
  biweekly:  { label: 'Quincenal', color: '#8B5CF6', bg: '#F5F3FF' },
  monthly:   { label: 'Mensual',   color: '#6366F1', bg: '#EEF2FF' },
  quarterly: { label: 'Trimestral',color: '#10B981', bg: '#ECFDF5' },
  yearly:    { label: 'Anual',     color: '#F43F5E', bg: '#FFF1F2' },
}

export default function ScheduledPage() {
  const [items, setItems]     = useState<RecurringTransactionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const { data: categories }  = useCategories()
  const { data: wallets }     = useWallets()
  const { addToast }          = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringTransactionWithDetails | null>(null)
  const [form, setForm]       = useState<Partial<RecurringTransaction>>({
    type: 'expense', currency: 'ARS', cadence: 'monthly',
    next_date: new Date().toISOString().split('T')[0], active: true,
  })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await recurringService.list()) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm({ type: 'expense', currency: 'ARS', cadence: 'monthly', next_date: new Date().toISOString().split('T')[0], active: true })
    setError(null)
    setModalOpen(true)
  }
  function openEdit(item: RecurringTransactionWithDetails) {
    setEditing(item); setForm({ ...item }); setError(null); setModalOpen(true)
  }

  async function handleSave() {
    if (!form.description || !form.amount) { setError('Completá descripción y monto.'); return }
    setSaving(true); setError(null)
    const payload = { ...form, category_id: form.category_id || null, wallet_id: form.wallet_id || null }
    try {
      if (editing?.id) {
        await recurringService.update(editing.id, payload as Partial<RecurringTransaction>)
        addToast('Operación actualizada', 'success')
      } else {
        await recurringService.create(payload as Omit<RecurringTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
        addToast('Operación creada', 'success')
      }
      setModalOpen(false); load()
    } catch {
      setError('Error al guardar.')
      addToast('Error al guardar', 'error')
    }
    finally { setSaving(false) }
  }

  const cadenceOptions  = RECURRING_CADENCES.map(c => ({ value: c.value, label: c.label }))
  const categoryOptions = [{ value: '', label: 'Sin categoría' }, ...categories.map(c => ({ value: c.id!, label: c.name }))]

  return (
    <div className="p-5 md:p-7 max-w-4xl mx-auto space-y-6 animate-fade-in">

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Operaciones Futuras
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {items.length} operaciones programadas · gastos e ingresos recurrentes
          </p>
        </div>
        <Button onClick={openCreate} size="md">
          <Plus size={16} /> Nueva operación
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
          <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          Cargando operaciones…
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Sin operaciones programadas"
          description="Configurá gastos o ingresos recurrentes para nunca olvidarte de ningún movimiento."
          action={{ label: '+ Nueva operación', onClick: openCreate }}
        />
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          {items.map((item, i) => {
            const isIncome = item.type === 'income'
            const cadence  = CADENCE_LABELS[item.cadence ?? 'monthly'] ?? CADENCE_LABELS.monthly
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 px-5 py-4 group transition-colors"
                style={{
                  borderBottom: i < items.length - 1 ? '1px solid var(--border-light)' : 'none',
                  opacity: item.active ? 1 : 0.45,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: isIncome ? 'var(--income-50)' : 'var(--expense-50)' }}
                >
                  <CalendarClock size={19} style={{ color: isIncome ? 'var(--income-500)' : 'var(--expense-500)' }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {item.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <Clock size={10} /> Próxima: {formatDate(item.next_date)}
                    </span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: cadence.bg, color: cadence.color }}
                    >
                      {cadence.label}
                    </span>
                    {item.category_name && (
                      <CategoryBadge name={item.category_name} color={item.category_color} />
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 mr-2">
                  <p
                    className="text-base font-extrabold tabular-nums"
                    style={{ color: isIncome ? 'var(--income-600)' : 'var(--expense-600)' }}
                  >
                    {isIncome ? '+' : '−'}{formatCurrency(item.amount, item.currency ?? 'ARS')}
                  </p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-faint)' }}>
                    {item.currency}
                  </p>
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity items-center shrink-0">
                  <button
                    onClick={() => item.id && recurringService.toggle(item.id, item.active ?? true).then(load)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                    style={{ color: item.active ? 'var(--income-500)' : 'var(--text-muted)' }}
                    title={item.active ? 'Desactivar' : 'Activar'}
                  >
                    {item.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-50)'; e.currentTarget.style.color = 'var(--brand-500)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => item.id && recurringService.delete(item.id).then(() => { load(); addToast('Operación eliminada', 'info') })}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--expense-50)'; e.currentTarget.style.color = 'var(--expense-500)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar operación' : 'Nueva operación recurrente'}>
        <div className="space-y-4">
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm font-medium"
              style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}
            >
              {error}
            </div>
          )}
          {/* Tipo */}
          <div className="flex gap-2">
            {(['expense', 'income'] as ('expense' | 'income')[]).map(t => (
              <button
                key={t}
                onClick={() => setForm(f => ({ ...f, type: t }))}
                className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
                style={form.type === t
                  ? t === 'income'
                    ? { background: 'var(--income-50)', color: 'var(--income-600)', border: '2px solid var(--income-500)' }
                    : { background: 'var(--expense-50)', color: 'var(--expense-600)', border: '2px solid var(--expense-500)' }
                  : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '2px solid transparent' }
                }
              >
                {t === 'income' ? '↑ Ingreso' : '↓ Gasto'}
              </button>
            ))}
          </div>
          <Input
            label="Descripción"
            value={form.description ?? ''}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Ej: Alquiler mensual, Netflix, Sueldo…"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monto"
              type="number" min="0" step="0.01"
              value={form.amount ?? ''}
              onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
            />
            <Select
              label="Moneda"
              value={form.currency ?? 'ARS'}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              options={CURRENCY_OPTS}
            />
          </div>
          <Select
            label="Frecuencia"
            value={form.cadence ?? 'monthly'}
            onChange={e => setForm(f => ({ ...f, cadence: e.target.value as RecurringTransaction['cadence'] }))}
            options={cadenceOptions}
          />
          <Input
            label="Próxima fecha"
            type="date"
            value={form.next_date ?? ''}
            onChange={e => setForm(f => ({ ...f, next_date: e.target.value }))}
          />
          <Select
            label="Categoría (opcional)"
            value={form.category_id ?? ''}
            onChange={e => setForm(f => ({ ...f, category_id: e.target.value || null }))}
            options={categoryOptions}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editing ? 'Guardar cambios' : 'Crear operación'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
