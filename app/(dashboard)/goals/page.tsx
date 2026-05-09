'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Target, CheckCircle2 } from 'lucide-react'
import { useGoals } from '@/hooks/useGoals'
import { goalsService } from '@/services/goals.service'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/format'
import type { Goal } from '@/types'

const CURRENCY_OPTS = [
  { value: 'ARS', label: 'ARS' }, { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' }, { value: 'CRYPTO', label: 'CRYPTO' },
]
const COLOR_PRESETS = ['#463397','#9850eb','#6d38c7','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899']
const CARD_STYLE = { background: '#fff', boxShadow: '0 2px 4px rgba(70,51,151,0.08)', border: '1px solid #f3f0ff' }

export default function GoalsPage() {
  const { data: goals, loading, refetch } = useGoals()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Goal | null>(null)
  const [form, setForm]           = useState<Partial<Goal>>({ currency: 'ARS', target_amount: 0, current_amount: 0, is_completed: false, color: '#463397' })
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)

  function openCreate() { setEditing(null); setForm({ currency: 'ARS', target_amount: 0, current_amount: 0, is_completed: false, color: '#463397' }); setError(null); setModalOpen(true) }
  function openEdit(g: Goal) { setEditing(g); setForm({ ...g }); setError(null); setModalOpen(true) }

  async function handleSave() {
    if (!form.name) { setError('El nombre es obligatorio.'); return }
    setSaving(true); setError(null)
    try {
      if (editing?.id) await goalsService.update(editing.id, form as Partial<Goal>)
      else await goalsService.create(form as Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
      setModalOpen(false); refetch()
    } catch { setError('Error al guardar.') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try { await goalsService.delete(id); refetch() }
    finally { setDeleting(null) }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#463397' }}>Objetivos</h1>
          <p className="text-gray-500 text-sm mt-1">{goals.filter(g => !g.is_completed).length} activos · {goals.filter(g => g.is_completed).length} completados</p>
        </div>
        <Button onClick={openCreate} size="sm"><Plus size={16} />Nuevo objetivo</Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando…</div>
      ) : goals.length === 0 ? (
        <EmptyState icon={Target} title="Sin objetivos" description="Definí tus metas de ahorro e inversión." action={{ label: 'Nuevo objetivo', onClick: openCreate }} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map(goal => {
            const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0
            const color = goal.color ?? '#463397'
            return (
              <div key={goal.id} className="rounded-2xl p-5 group hover:border-violet-300 transition-all hover:-translate-y-0.5" style={CARD_STYLE}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                      {goal.is_completed
                        ? <CheckCircle2 size={20} className="text-emerald-500" />
                        : <Target size={20} style={{ color }} />
                      }
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{goal.name}</p>
                      {goal.description && <p className="text-xs text-gray-400">{goal.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(goal)} className="p-1.5 rounded-lg hover:bg-violet-100 text-gray-400 hover:text-violet-700"><Pencil size={14} /></button>
                    <button onClick={() => goal.id && handleDelete(goal.id)} disabled={deleting === goal.id} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-medium">
                    <span>{formatCurrency(goal.current_amount, goal.currency ?? 'ARS')}</span>
                    <span style={{ color }} className="font-bold">{pct.toFixed(0)}%</span>
                    <span>{formatCurrency(goal.target_amount, goal.currency ?? 'ARS')}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${color},${color}aa)` }} />
                  </div>
                </div>
                {goal.target_date && (
                  <p className="text-xs text-gray-400">Meta: {new Date(goal.target_date).toLocaleDateString('es-AR')}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar objetivo' : 'Nuevo objetivo'}>
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}
          <Input label="Nombre" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Viaje a Europa" required />
          <Input label="Descripción (opcional)" value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Monto objetivo" type="number" min="0" step="0.01" value={form.target_amount ?? 0} onChange={e => setForm(f => ({ ...f, target_amount: parseFloat(e.target.value) || 0 }))} />
            <Select label="Moneda" value={form.currency ?? 'ARS'} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} options={CURRENCY_OPTS} />
          </div>
          <Input label="Monto actual" type="number" min="0" step="0.01" value={form.current_amount ?? 0} onChange={e => setForm(f => ({ ...f, current_amount: parseFloat(e.target.value) || 0 }))} />
          <Input label="Fecha objetivo (opcional)" type="date" value={form.target_date ?? ''} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_PRESETS.map(color => (
                <button key={color} onClick={() => setForm(f => ({ ...f, color }))} className="w-7 h-7 rounded-full border-2 transition-all" style={{ backgroundColor: color, borderColor: form.color === color ? '#1f1635' : 'transparent', transform: form.color === color ? 'scale(1.15)' : 'scale(1)' }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
