'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Target, CheckCircle2, Calendar } from 'lucide-react'
import { useGoals } from '@/hooks/useGoals'
import { goalsService } from '@/services/goals.service'
import { useToast } from '@/components/providers/ToastProvider'
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
const COLOR_PRESETS = [
  '#6366F1','#8B5CF6','#EC4899','#F43F5E','#F97316',
  '#F59E0B','#10B981','#14B8A6','#0EA5E9','#3B82F6',
]

export default function GoalsPage() {
  const { data: goals, loading, refetch } = useGoals()
  const { addToast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Goal | null>(null)
  const [form, setForm]           = useState<Partial<Goal>>({
    currency: 'ARS', target_amount: 0, current_amount: 0, is_completed: false, color: '#6366F1',
  })
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const activeGoals    = goals.filter(g => !g.is_completed)
  const completedGoals = goals.filter(g => g.is_completed)

  function openCreate() {
    setEditing(null)
    setForm({ currency: 'ARS', target_amount: 0, current_amount: 0, is_completed: false, color: '#6366F1' })
    setError(null)
    setModalOpen(true)
  }
  function openEdit(g: Goal) { setEditing(g); setForm({ ...g }); setError(null); setModalOpen(true) }

  async function handleSave() {
    if (!form.name) { setError('El nombre es obligatorio.'); return }
    setSaving(true); setError(null)
    const payload = { ...form, wallet_id: form.wallet_id || null }
    try {
      if (editing?.id) {
        await goalsService.update(editing.id, payload as Partial<Goal>)
        addToast('Objetivo actualizado', 'success')
      } else {
        await goalsService.create(payload as Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
        addToast('Objetivo creado', 'success')
      }
      setModalOpen(false); refetch()
    } catch {
      setError('Error al guardar.')
      addToast('Error al guardar', 'error')
    }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try { await goalsService.delete(id); refetch(); addToast('Objetivo eliminado', 'info') }
    finally { setDeleting(null) }
  }

  function GoalCard({ goal }: { goal: Goal }) {
    const pct   = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0
    const color = goal.color ?? '#6366F1'
    const isComplete = goal.is_completed

    return (
      <div
        className="rounded-2xl p-5 group transition-all hover:-translate-y-0.5"
        style={{
          background: 'var(--bg-card)',
          border: isComplete ? `1px solid ${color}30` : '1px solid var(--border)',
          boxShadow: isComplete ? `0 4px 20px ${color}18` : 'var(--shadow-sm)',
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: `${color}15` }}
            >
              {isComplete
                ? <CheckCircle2 size={22} style={{ color: 'var(--income-500)' }} />
                : <Target size={22} style={{ color }} />
              }
            </div>
            <div>
              <p className="font-extrabold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
                {goal.name}
              </p>
              {goal.description && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{goal.description}</p>
              )}
              {isComplete && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block"
                  style={{ background: 'var(--income-50)', color: 'var(--income-600)' }}
                >
                  ✓ Completado
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
            <button
              onClick={() => openEdit(goal)}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-50)'; e.currentTarget.style.color = 'var(--brand-500)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => goal.id && handleDelete(goal.id)}
              disabled={deleting === goal.id}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--expense-50)'; e.currentTarget.style.color = 'var(--expense-500)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Montos */}
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Acumulado</p>
            <p className="text-lg font-extrabold tabular-nums" style={{ color }}>
              {formatCurrency(goal.current_amount, goal.currency ?? 'ARS')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Objetivo</p>
            <p className="text-base font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              {formatCurrency(goal.target_amount, goal.currency ?? 'ARS')}
            </p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="h-2.5 rounded-full overflow-hidden mb-2" style={{ background: 'var(--bg-subtle)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}bb)` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold" style={{ color }}>
            {pct.toFixed(0)}% completado
          </span>
          {goal.target_date && (
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Calendar size={11} />
              Meta: {new Date(goal.target_date).toLocaleDateString('es-AR')}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 md:p-7 max-w-4xl mx-auto space-y-6 animate-fade-in">

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Objetivos
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {activeGoals.length} activos · {completedGoals.length} completados
          </p>
        </div>
        <Button onClick={openCreate} size="md">
          <Plus size={16} /> Nuevo objetivo
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
          <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          Cargando objetivos…
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Sin objetivos"
          description="Definí tus metas de ahorro e inversión para mantenerte motivado."
          action={{ label: '+ Nuevo objetivo', onClick: openCreate }}
        />
      ) : (
        <div className="space-y-6">
          {activeGoals.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>En progreso</span>
                <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeGoals.map(goal => <GoalCard key={goal.id} goal={goal} />)}
              </div>
            </div>
          )}
          {completedGoals.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-extrabold" style={{ color: 'var(--income-600)' }}>Completados ✓</span>
                <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {completedGoals.map(goal => <GoalCard key={goal.id} goal={goal} />)}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar objetivo' : 'Nuevo objetivo'}>
        <div className="space-y-4">
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm font-medium"
              style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}
            >
              {error}
            </div>
          )}
          <Input
            label="Nombre del objetivo"
            value={form.name ?? ''}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Viaje a Europa, Auto nuevo, Fondo emergencia…"
            required
          />
          <Input
            label="Descripción (opcional)"
            value={form.description ?? ''}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Más detalles sobre tu objetivo"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monto objetivo"
              type="number" min="0" step="0.01"
              value={form.target_amount ?? 0}
              onChange={e => setForm(f => ({ ...f, target_amount: parseFloat(e.target.value) || 0 }))}
            />
            <Select
              label="Moneda"
              value={form.currency ?? 'ARS'}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              options={CURRENCY_OPTS}
            />
          </div>
          <Input
            label="Monto actual ahorrado"
            type="number" min="0" step="0.01"
            value={form.current_amount ?? 0}
            onChange={e => setForm(f => ({ ...f, current_amount: parseFloat(e.target.value) || 0 }))}
          />
          <Input
            label="Fecha objetivo (opcional)"
            type="date"
            value={form.target_date ?? ''}
            onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
          />
          {/* Paleta de colores */}
          <div>
            <label className="text-sm font-semibold block mb-2" style={{ color: 'var(--text-primary)' }}>
              Color del objetivo
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_PRESETS.map(color => (
                <button
                  key={color}
                  onClick={() => setForm(f => ({ ...f, color }))}
                  className="w-8 h-8 rounded-full transition-all"
                  style={{
                    backgroundColor: color,
                    transform: form.color === color ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: form.color === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editing ? 'Guardar cambios' : 'Crear objetivo'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
