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
import type { RecurringTransaction, RecurringTransactionWithDetails } from '@/types'

const CURRENCY_OPTS = [
  { value: 'ARS', label: 'ARS' }, { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' }, { value: 'CRYPTO', label: 'CRYPTO' },
]
const CARD_STYLE = { background: '#fff', boxShadow: '0 2px 4px rgba(70,51,151,0.08)', border: '1px solid #f3f0ff' }

export default function ScheduledPage() {
  const [items, setItems]     = useState<RecurringTransactionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const { data: categories }  = useCategories()
  const { data: wallets }     = useWallets()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringTransactionWithDetails | null>(null)
  const [form, setForm]       = useState<Partial<RecurringTransaction>>({ type: 'expense', currency: 'ARS', cadence: 'monthly', next_date: new Date().toISOString().split('T')[0], active: true })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await recurringService.list()) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() { setEditing(null); setForm({ type: 'expense', currency: 'ARS', cadence: 'monthly', next_date: new Date().toISOString().split('T')[0], active: true }); setError(null); setModalOpen(true) }
  function openEdit(item: RecurringTransactionWithDetails) { setEditing(item); setForm({ ...item }); setError(null); setModalOpen(true) }

  async function handleSave() {
    if (!form.description || !form.amount) { setError('Completá los campos obligatorios.'); return }
    setSaving(true); setError(null)
    try {
      if (editing?.id) await recurringService.update(editing.id, form as Partial<RecurringTransaction>)
      else await recurringService.create(form as Omit<RecurringTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
      setModalOpen(false); load()
    } catch { setError('Error al guardar.') }
    finally { setSaving(false) }
  }

  const cadenceOptions   = RECURRING_CADENCES.map(c => ({ value: c.value, label: c.label }))
  const categoryOptions  = [{ value: '', label: 'Sin categoría' }, ...categories.map(c => ({ value: c.id!, label: c.name }))]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#463397' }}>Operaciones Futuras</h1>
          <p className="text-gray-500 text-sm mt-1">{items.length} operaciones programadas</p>
        </div>
        <Button onClick={openCreate} size="sm"><Plus size={16} />Nueva operación</Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando…</div>
      ) : items.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Sin operaciones programadas" description="Configurá gastos o ingresos recurrentes para no olvidarte de ninguno." action={{ label: 'Nueva operación', onClick: openCreate }} />
      ) : (
        <div className="rounded-2xl overflow-hidden divide-y divide-gray-50" style={CARD_STYLE}>
          {items.map(item => (
            <div key={item.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-violet-50/40 transition-colors group ${!item.active ? 'opacity-50' : ''}`}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: item.type === 'income' ? '#d1fae5' : '#fee2e2' }}>
                <CalendarClock size={18} style={{ color: item.type === 'income' ? '#059669' : '#dc2626' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800">{item.description}</p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">Próxima: {formatDate(item.next_date)}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(70,51,151,0.08)', color: '#463397' }}>{item.cadence}</span>
                  {item.category_name && <CategoryBadge name={item.category_name} color={item.category_color} />}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold tabular-nums" style={{ color: item.type === 'income' ? '#059669' : '#dc2626' }}>
                  {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount, item.currency ?? 'ARS')}
                </p>
                <p className="text-xs text-gray-400">{item.currency}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity items-center">
                <button onClick={() => item.id && recurringService.toggle(item.id, item.active ?? true).then(load)} className="p-1.5 rounded-lg hover:bg-violet-100 text-gray-400">
                  {item.active ? <ToggleRight size={16} style={{ color: '#463397' }} /> : <ToggleLeft size={16} />}
                </button>
                <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-violet-100 text-gray-400 hover:text-violet-700"><Pencil size={14} /></button>
                <button onClick={() => item.id && recurringService.delete(item.id).then(load)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar operación' : 'Nueva operación'}>
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}
          <Select label="Tipo" value={form.type ?? 'expense'} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'income' | 'expense' }))} options={[{ value: 'expense', label: 'Gasto' }, { value: 'income', label: 'Ingreso' }]} />
          <Input label="Descripción" value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Monto" type="number" min="0" step="0.01" value={form.amount ?? ''} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
            <Select label="Moneda" value={form.currency ?? 'ARS'} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} options={CURRENCY_OPTS} />
          </div>
          <Select label="Frecuencia" value={form.cadence ?? 'monthly'} onChange={e => setForm(f => ({ ...f, cadence: e.target.value as RecurringTransaction['cadence'] }))} options={cadenceOptions} />
          <Input label="Próxima fecha" type="date" value={form.next_date ?? ''} onChange={e => setForm(f => ({ ...f, next_date: e.target.value }))} />
          <Select label="Categoría" value={form.category_id ?? ''} onChange={e => setForm(f => ({ ...f, category_id: e.target.value || null }))} options={categoryOptions} />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
