'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, CalendarClock, ToggleLeft, ToggleRight } from 'lucide-react'
import { recurringService } from '@/services/recurring.service'
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
import type { RecurringTransaction, RecurringTransactionWithDetails, Currency } from '@/types'

const CURRENCY_OPTS = [
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'CRYPTO', label: 'CRYPTO' },
]

export default function ScheduledPage() {
  const [items, setItems] = useState<RecurringTransactionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const { data: categories } = useCategories()
  const { data: wallets } = useWallets()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringTransactionWithDetails | null>(null)
  const [form, setForm] = useState<Partial<RecurringTransaction>>({
    type: 'expense',
    currency: 'ARS',
    cadence: 'monthly',
    next_date: new Date().toISOString().split('T')[0],
    active: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await recurringService.list()
      setItems(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm({ type: 'expense', currency: 'ARS', cadence: 'monthly', next_date: new Date().toISOString().split('T')[0], active: true })
    setError(null)
    setModalOpen(true)
  }

  function openEdit(item: RecurringTransactionWithDetails) {
    setEditing(item)
    setForm({ ...item })
    setError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.description || !form.amount) { setError('Completá los campos obligatorios.'); return }
    setSaving(true)
    setError(null)
    try {
      if (editing?.id) {
        await recurringService.update(editing.id, form as Partial<RecurringTransaction>)
      } else {
        await recurringService.create(form as Omit<RecurringTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
      }
      setModalOpen(false)
      load()
    } catch { setError('Error al guardar.') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    await recurringService.delete(id)
    load()
  }

  async function handleToggle(id: string, active: boolean) {
    await recurringService.toggle(id, !active)
    load()
  }

  const cadenceOptions = RECURRING_CADENCES.map((c) => ({ value: c.value, label: c.label }))
  const categoryOptions = [{ value: '', label: 'Sin categoría' }, ...categories.map((c) => ({ value: c.id!, label: c.name }))]
  const walletOptions = [{ value: '', label: 'Sin billetera' }, ...wallets.map((w) => ({ value: w.id!, label: w.name }))]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Operaciones Futuras</h1>
          <p className="text-gray-500 text-sm mt-1">{items.length} programadas</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus size={16} />
          Nueva operación
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Cargando…</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Sin operaciones programadas"
          description="Configurá gastos o ingresos recurrentes para no olvidarte de ninguno."
          action={{ label: 'Nueva operación', onClick: openCreate }}
        />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
          {items.map((item) => (
            <div key={item.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-800/40 transition-colors group ${!item.active ? 'opacity-50' : ''}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                <CalendarClock size={18} className={item.type === 'income' ? 'text-emerald-400' : 'text-red-400'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200">{item.description}</p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">
                    Próxima: {formatDate(item.next_date)}
                  </span>
                  <span className="text-xs text-indigo-400 capitalize">{item.cadence}</span>
                  {item.category_name && <CategoryBadge name={item.category_name} color={item.category_color} />}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-bold tabular-nums ${item.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount, item.currency ?? 'ARS')}
                </p>
                <p className="text-xs text-gray-600">{item.currency}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity items-center">
                <button onClick={() => item.id && handleToggle(item.id, item.active ?? true)} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-500 hover:text-gray-200">
                  {item.active ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} />}
                </button>
                <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-500 hover:text-gray-200">
                  <Pencil size={14} />
                </button>
                <button onClick={() => item.id && handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar operación' : 'Nueva operación'}>
        <div className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">{error}</div>
          )}
          <Select
            label="Tipo"
            value={form.type ?? 'expense'}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'income' | 'expense' }))}
            options={[{ value: 'expense', label: 'Gasto' }, { value: 'income', label: 'Ingreso' }]}
          />
          <Input
            label="Descripción"
            value={form.description ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monto"
              type="number"
              min="0"
              step="0.01"
              value={form.amount ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
            />
            <Select
              label="Moneda"
              value={form.currency ?? 'ARS'}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              options={CURRENCY_OPTS}
            />
          </div>
          <Select
            label="Frecuencia"
            value={form.cadence ?? 'monthly'}
            onChange={(e) => setForm((f) => ({ ...f, cadence: e.target.value as RecurringTransaction['cadence'] }))}
            options={cadenceOptions}
          />
          <Input
            label="Próxima fecha"
            type="date"
            value={form.next_date ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, next_date: e.target.value }))}
          />
          <Select
            label="Categoría"
            value={form.category_id ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value || null }))}
            options={categoryOptions}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
