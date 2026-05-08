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
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'CRYPTO', label: 'CRYPTO' },
]

const COLOR_PRESETS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4']

export default function GoalsPage() {
  const { data: goals, loading, refetch } = useGoals()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [form, setForm] = useState<Partial<Goal>>({
    currency: 'ARS',
    target_amount: 0,
    current_amount: 0,
    is_completed: false,
    color: '#6366f1',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setForm({ currency: 'ARS', target_amount: 0, current_amount: 0, is_completed: false, color: '#6366f1' })
    setError(null)
    setModalOpen(true)
  }

  function openEdit(g: Goal) {
    setEditing(g)
    setForm({ ...g })
    setError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name) { setError('El nombre es obligatorio.'); return }
    setSaving(true)
    setError(null)
    try {
      if (editing?.id) {
        await goalsService.update(editing.id, form as Partial<Goal>)
      } else {
        await goalsService.create(form as Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
      }
      setModalOpen(false)
      refetch()
    } catch { setError('Error al guardar.') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try { await goalsService.delete(id); refetch() }
    finally { setDeleting(null) }
  }

  const active = goals.filter((g) => !g.is_completed)
  const completed = goals.filter((g) => g.is_completed)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Objetivos</h1>
          <p className="text-gray-500 text-sm mt-1">{active.length} activos · {completed.length} completados</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus size={16} />
          Nuevo objetivo
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Cargando…</div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Sin objetivos"
          description="Definí tus metas de ahorro e inversión."
          action={{ label: 'Nuevo objetivo', onClick: openCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0
            const clampedProgress = Math.min(progress, 100)
            return (
              <div key={goal.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 group hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${goal.color ?? '#6366f1'}20` }}>
                      {goal.is_completed
                        ? <CheckCircle2 size={18} className="text-emerald-400" />
                        : <Target size={18} style={{ color: goal.color ?? '#6366f1' }} />
                      }
                    </div>
                    <div>
                      <p className="font-semibold text-gray-200 text-sm">{goal.name}</p>
                      {goal.description && <p className="text-xs text-gray-600">{goal.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(goal)} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-500 hover:text-gray-200">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => goal.id && handleDelete(goal.id)}
                      disabled={deleting === goal.id}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>{formatCurrency(goal.current_amount, goal.currency ?? 'ARS')}</span>
                    <span>{clampedProgress.toFixed(0)}%</span>
                    <span>{formatCurrency(goal.target_amount, goal.currency ?? 'ARS')}</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${clampedProgress}%`, backgroundColor: goal.color ?? '#6366f1' }}
                    />
                  </div>
                </div>

                {goal.target_date && (
                  <p className="text-xs text-gray-600">
                    Meta: {new Date(goal.target_date).toLocaleDateString('es-AR')}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar objetivo' : 'Nuevo objetivo'}>
        <div className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">{error}</div>
          )}
          <Input
            label="Nombre"
            value={form.name ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Viaje a Europa"
            required
          />
          <Input
            label="Descripción (opcional)"
            value={form.description ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monto objetivo"
              type="number"
              min="0"
              step="0.01"
              value={form.target_amount ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, target_amount: parseFloat(e.target.value) || 0 }))}
            />
            <Select
              label="Moneda"
              value={form.currency ?? 'ARS'}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              options={CURRENCY_OPTS}
            />
          </div>
          <Input
            label="Monto actual"
            type="number"
            min="0"
            step="0.01"
            value={form.current_amount ?? 0}
            onChange={(e) => setForm((f) => ({ ...f, current_amount: parseFloat(e.target.value) || 0 }))}
          />
          <Input
            label="Fecha objetivo (opcional)"
            type="date"
            value={form.target_date ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-300">Color</label>
            <div className="flex gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === color ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
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
