'use client'

import { useState } from 'react'
import {
  Plus, Pencil, Trash2, Target, CheckCircle2, Calendar, Wallet,
  Plane, Home, Car, Shield, GraduationCap, TrendingUp, Laptop,
  Heart, PiggyBank, Gift, ArrowDownCircle, ArrowUpCircle, Clock,
  ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react'
import { PageHeader }    from '@/components/ui/PageHeader'
import { HelpButton }   from '@/components/help/HelpButton'
import { useGoals }      from '@/hooks/useGoals'
import { useWallets }    from '@/hooks/useWallets'
import { goalsService }  from '@/services/goals.service'
import { useToast }      from '@/components/providers/ToastProvider'
import { Modal }         from '@/components/ui/Modal'
import { Button }        from '@/components/ui/Button'
import { Input }         from '@/components/ui/Input'
import { Select }        from '@/components/ui/Select'
import { EmptyState }    from '@/components/ui/EmptyState'
import { formatCurrency, safeNumber } from '@/utils/format'
import type { Goal, GoalMovement } from '@/types'

// ── Constantes ────────────────────────────────────────────────────────────────

const CURRENCY_OPTS = [
  { value: 'ARS',    label: 'ARS' },
  { value: 'USD',    label: 'USD' },
  { value: 'EUR',    label: 'EUR' },
  { value: 'CRYPTO', label: 'CRYPTO' },
]
const CATEGORY_OPTS = [
  { value: 'ahorro',    label: 'Ahorro' },
  { value: 'inversión', label: 'Inversión' },
  { value: 'compra',    label: 'Compra' },
  { value: 'emergencia',label: 'Emergencia' },
  { value: 'otro',      label: 'Otro' },
]
const COLOR_PRESETS = [
  '#6d3bd7','#a078ff','#EC4899','#F43F5E','#F97316',
  '#F59E0B','#10B981','#14B8A6','#0EA5E9','#3B82F6',
]

// Iconos disponibles — usa solo Lucide icons ya en el proyecto
const GOAL_ICON_OPTS = [
  { value: 'target',      label: 'Meta',        Icon: Target },
  { value: 'plane',       label: 'Viaje',       Icon: Plane },
  { value: 'home',        label: 'Casa',        Icon: Home },
  { value: 'car',         label: 'Auto',        Icon: Car },
  { value: 'shield',      label: 'Emergencia',  Icon: Shield },
  { value: 'graduation',  label: 'Educación',   Icon: GraduationCap },
  { value: 'trending-up', label: 'Inversión',   Icon: TrendingUp },
  { value: 'laptop',      label: 'Tecnología',  Icon: Laptop },
  { value: 'heart',       label: 'Salud',       Icon: Heart },
  { value: 'piggy',       label: 'Ahorro',      Icon: PiggyBank },
  { value: 'gift',        label: 'Regalo',      Icon: Gift },
  { value: 'sparkles',    label: 'Otro',        Icon: Sparkles },
]

function getGoalIcon(iconValue?: string) {
  return GOAL_ICON_OPTS.find(o => o.value === iconValue)?.Icon ?? Target
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Un objetivo está completo si el flag DB está en true O si el acumulado alcanzó el objetivo */
function isEffectivelyComplete(g: Goal): boolean {
  if (g.is_completed) return true
  const t = safeNumber(g.target_amount)
  const c = safeNumber(g.current_amount)
  return t > 0 && c >= t
}

function daysRemaining(targetDate?: string): number | null {
  if (!targetDate) return null
  const diff = new Date(targetDate).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function GoalsPage() {
  const { data: goals,   loading,  refetch }  = useGoals()
  const { data: wallets, loading: walletsLoading } = useWallets()
  const { addToast } = useToast()

  // ── Modal crear/editar ────────────────────────────────────────────────────
  const [editModal, setEditModal]   = useState(false)
  const [editing, setEditing]       = useState<Goal | null>(null)
  const [form, setForm]             = useState<Partial<Goal>>({
    currency: 'ARS', target_amount: 0, current_amount: 0,
    is_completed: false, color: '#6d3bd7', category: 'otro', icon: 'target',
  })
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState<string | null>(null)
  const [deleting, setDeleting]     = useState<string | null>(null)

  // ── Modal depositar/extraer ───────────────────────────────────────────────
  const [movModal, setMovModal]     = useState<{ open: boolean; type: 'deposit' | 'withdraw'; goal: Goal | null }>
                                      ({ open: false, type: 'deposit', goal: null })
  const [movForm, setMovForm]       = useState({ amount: '', walletId: '', note: '' })
  const [movError, setMovError]     = useState<string | null>(null)
  const [movSaving, setMovSaving]   = useState(false)

  // ── Modal detalle ─────────────────────────────────────────────────────────
  const [detailGoal, setDetailGoal]     = useState<Goal | null>(null)
  const [movements, setMovements]       = useState<GoalMovement[]>([])
  const [movLoading, setMovLoading]     = useState(false)

  // ── Derivados ─────────────────────────────────────────────────────────────
  const activeGoals    = goals.filter(g => !isEffectivelyComplete(g))
  const completedGoals = goals.filter(g => isEffectivelyComplete(g))
  const totalSaved     = goals.reduce((s, g) => s + safeNumber(g.current_amount), 0)
  const avgProgress    = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((s, g) => {
        const t = safeNumber(g.target_amount)
        const c = safeNumber(g.current_amount)
        return s + (t > 0 ? Math.min((c / t) * 100, 100) : 0)
      }, 0) / activeGoals.length)
    : 0

  // ── Handlers crear/editar ─────────────────────────────────────────────────
  function openCreate() {
    setEditing(null)
    setForm({ currency: 'ARS', target_amount: 0, current_amount: 0, is_completed: false, color: '#6d3bd7', category: 'otro', icon: 'target' })
    setFormError(null)
    setEditModal(true)
  }
  function openEdit(g: Goal) { setEditing(g); setForm({ ...g }); setFormError(null); setEditModal(true) }

  async function handleSave() {
    if (!form.name) { setFormError('El nombre es obligatorio.'); return }
    setSaving(true); setFormError(null)
    const payload = { ...form, wallet_id: form.wallet_id || null }
    try {
      if (editing?.id) {
        await goalsService.update(editing.id, payload as Partial<Goal>)
        addToast('Objetivo actualizado', 'success')
      } else {
        await goalsService.create(payload as Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
        addToast('Objetivo creado', 'success')
      }
      setEditModal(false); refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar.'
      console.error('[goals] save error:', err)
      setFormError(msg)
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try { await goalsService.delete(id); refetch(); addToast('Objetivo eliminado', 'info') }
    catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar.'
      addToast(msg, 'error')
    } finally { setDeleting(null) }
  }

  // ── Handlers depositar/extraer ────────────────────────────────────────────
  function openDeposit(goal: Goal) {
    setMovModal({ open: true, type: 'deposit', goal })
    setMovForm({ amount: '', walletId: '', note: '' })
    setMovError(null)
  }
  function openWithdraw(goal: Goal) {
    setMovModal({ open: true, type: 'withdraw', goal })
    setMovForm({ amount: '', walletId: '', note: '' })
    setMovError(null)
  }

  async function handleMovement() {
    const { type, goal } = movModal
    if (!goal?.id) return

    const amount = parseFloat(movForm.amount)
    if (!amount || amount <= 0) { setMovError('Ingresá un monto válido mayor a 0'); return }
    if (!movForm.walletId)       { setMovError('Seleccioná una billetera'); return }

    const currency  = goal.currency ?? 'ARS'
    const curAmount = safeNumber(goal.current_amount)

    if (type === 'deposit') {
      const wallet = wallets.find(w => w.id === movForm.walletId)
      if (wallet && safeNumber(wallet.current_balance) < amount) {
        setMovError(`Saldo insuficiente. Disponible: ${formatCurrency(wallet.current_balance, currency)}`)
        return
      }
    }
    if (type === 'withdraw' && amount > curAmount) {
      setMovError(`El objetivo solo tiene ${formatCurrency(curAmount, currency)}`)
      return
    }

    setMovSaving(true); setMovError(null)
    try {
      if (type === 'deposit') {
        await goalsService.deposit({
          goalId: goal.id, goalName: goal.name, walletId: movForm.walletId,
          amount, currency, currentAmount: curAmount,
          targetAmount: safeNumber(goal.target_amount),
          note: movForm.note || undefined,
        })
        addToast('Depósito realizado', 'success')
      } else {
        await goalsService.withdraw({
          goalId: goal.id, goalName: goal.name, walletId: movForm.walletId,
          amount, currency, currentAmount: curAmount, note: movForm.note || undefined,
        })
        addToast('Extracción realizada', 'success')
      }
      setMovModal(m => ({ ...m, open: false }))
      await refetch()
      // Actualizar movimientos si el detalle está abierto para el mismo objetivo
      if (detailGoal?.id === goal.id) {
        const movs = await goalsService.getMovements(goal.id)
        setMovements(movs)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar.'
      console.error('[goals] movement error:', err)
      setMovError(msg)
    } finally { setMovSaving(false) }
  }

  // ── Handler detalle ───────────────────────────────────────────────────────
  async function openDetail(goal: Goal) {
    setDetailGoal(goal)
    setMovLoading(true)
    try {
      const movs = await goalsService.getMovements(goal.id!)
      setMovements(movs)
    } catch {
      setMovements([])
    } finally { setMovLoading(false) }
  }

  // ── Helpers de billeteras ────────────────────────────────────────────────
  function walletName(walletId?: string | null) {
    return wallets.find(w => w.id === walletId)?.name ?? 'Billetera'
  }
  function compatibleWallets(currency?: string) {
    return wallets.filter(w => !currency || w.currency === currency)
  }

  // ── Subcomponente GoalCard ────────────────────────────────────────────────
  function GoalCard({ goal }: { goal: Goal }) {
    const tgt       = safeNumber(goal.target_amount)
    const cur       = safeNumber(goal.current_amount)
    const pct       = tgt > 0 ? Math.min((cur / tgt) * 100, 100) : 0
    const remaining = Math.max(0, tgt - cur)
    const color     = goal.color ?? '#6d3bd7'
    const isComplete= isEffectivelyComplete(goal)
    const GoalIcon  = getGoalIcon(goal.icon)
    const catLabel  = CATEGORY_OPTS.find(o => o.value === goal.category)?.label
    const days      = daysRemaining(goal.target_date)

    return (
      <div
        className="rounded-2xl p-5 transition-all hover:-translate-y-0.5 flex flex-col"
        style={{
          background:  'var(--bg-card)',
          border:      isComplete ? `1px solid ${color}30` : '1px solid var(--border)',
          boxShadow:   isComplete ? `0 4px 20px ${color}18` : 'var(--shadow-sm)',
        }}
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: `${color}15` }}
            >
              {isComplete
                ? <CheckCircle2 size={22} style={{ color: 'var(--income-500)' }} />
                : <GoalIcon size={22} style={{ color }} />
              }
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-sm leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                {goal.name}
              </p>
              {goal.description && (
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{goal.description}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-1">
                {isComplete && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--income-50)', color: 'var(--income-600)' }}>
                    ✓ Completado
                  </span>
                )}
                {goal.category && goal.category !== 'otro' && catLabel && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    {catLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Editar/Eliminar en hover */}
          <div className="flex gap-1 opacity-0 hover:opacity-100 group shrink-0 ml-2"
            style={{ opacity: undefined }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0' }}
          >
            <button onClick={() => openEdit(goal)}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-50)'; e.currentTarget.style.color = 'var(--brand-500)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}>
              <Pencil size={14} />
            </button>
            <button onClick={() => goal.id && handleDelete(goal.id)}
              disabled={deleting === goal.id}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--expense-50)'; e.currentTarget.style.color = 'var(--expense-500)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Montos */}
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Acumulado</p>
            <p className="text-lg font-extrabold tabular-nums" style={{ color }}>
              {formatCurrency(cur, goal.currency ?? 'ARS')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Objetivo</p>
            <p className="text-base font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              {formatCurrency(tgt, goal.currency ?? 'ARS')}
            </p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--bg-subtle)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: isComplete
                ? 'linear-gradient(90deg, var(--income-500), var(--income-600))'
                : `linear-gradient(90deg, ${color}, ${color}bb)`,
            }} />
        </div>

        {/* % y faltan */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold" style={{ color: isComplete ? 'var(--income-600)' : color }}>
            {pct.toFixed(0)}% completado
          </span>
          <div className="flex items-center gap-3">
            {!isComplete && remaining > 0 && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Faltan {formatCurrency(remaining, goal.currency ?? 'ARS')}
              </span>
            )}
            {goal.target_date && days !== null && (
              <span className="text-xs flex items-center gap-1" style={{ color: days <= 0 ? 'var(--expense-500)' : 'var(--text-muted)' }}>
                <Calendar size={11} />
                {days <= 0 ? 'Vencido' : `${days}d`}
              </span>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-3 mt-auto" style={{ borderTop: '1px solid var(--border)' }}>
          {!isComplete && (
            <button onClick={() => openDeposit(goal)}
              className="flex-1 text-xs font-bold py-1.5 rounded-xl transition-all"
              style={{ background: 'var(--income-50)', color: 'var(--income-600)', border: '1px solid var(--income-100)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--income-100)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--income-50)' }}>
              + Depositar
            </button>
          )}
          {!isComplete && cur > 0 && (
            <button onClick={() => openWithdraw(goal)}
              className="flex-1 text-xs font-bold py-1.5 rounded-xl transition-all"
              style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--expense-100)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--expense-50)' }}>
              − Extraer
            </button>
          )}
          <button onClick={() => openDetail(goal)}
            className="px-3 text-xs font-bold py-1.5 rounded-xl transition-all"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
            Ver
          </button>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 md:p-7 max-w-4xl mx-auto space-y-6 animate-fade-in">

      <PageHeader title="Objetivos" subtitle="Definí metas de ahorro e inversión"
        icon={Target} color="#F43F5E" layout="split">
        <HelpButton section="goals" />
        <Button onClick={openCreate} variant="hero-primary"><Plus size={16} /> Nuevo objetivo</Button>
      </PageHeader>

      {/* Stats compactas */}
      {!loading && goals.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'En progreso',    value: activeGoals.length.toString() },
            { label: 'Completados',    value: completedGoals.length.toString() },
            { label: 'Total ahorrado', value: formatCurrency(totalSaved, 'ARS') },
            { label: 'Progreso prom.', value: activeGoals.length > 0 ? `${avgProgress}%` : '—' },
          ].map(stat => (
            <div key={stat.label} className="rounded-2xl px-4 py-3 text-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
              <p className="text-base font-extrabold tabular-nums" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lista de objetivos */}
      {loading ? (
        <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
          <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          Cargando objetivos…
        </div>
      ) : goals.length === 0 ? (
        <EmptyState type="goals" icon={Target}
          title="No tenés objetivos todavía"
          description="Definí una meta de ahorro para separar dinero sin confundirlo con tu saldo disponible. El progreso se calcula automáticamente."
          action={{ label: '+ Nuevo objetivo', onClick: openCreate }} />
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

      {/* ── Modal: Crear / Editar ──────────────────────────────────────────── */}
      <Modal open={editModal} onClose={() => setEditModal(false)}
        title={editing ? 'Editar objetivo' : 'Nuevo objetivo'}>
        <div className="space-y-4">
          {formError && (
            <div className="rounded-xl px-4 py-3 text-sm font-medium"
              style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}>
              {formError}
            </div>
          )}

          <Input label="Nombre del objetivo" required
            value={form.name ?? ''}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Viaje a Europa, Auto nuevo, Fondo emergencia…" />

          <Input label="Descripción (opcional)"
            value={form.description ?? ''}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Más detalles sobre tu objetivo" />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Monto objetivo" type="number" min="0" step="0.01"
              value={form.target_amount ?? 0}
              onChange={e => setForm(f => ({ ...f, target_amount: parseFloat(e.target.value) || 0 }))} />
            <Select label="Moneda"
              value={form.currency ?? 'ARS'}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              options={CURRENCY_OPTS} />
          </div>

          <Input label="Monto actual ahorrado" type="number" min="0" step="0.01"
            value={form.current_amount ?? 0}
            onChange={e => setForm(f => ({ ...f, current_amount: parseFloat(e.target.value) || 0 }))} />

          <Select label="Categoría"
            value={form.category ?? 'otro'}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            options={CATEGORY_OPTS} />

          <Input label="Fecha objetivo (opcional)" type="date"
            value={form.target_date ?? ''}
            onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />

          {/* Selector de icono */}
          <div>
            <label className="text-sm font-semibold block mb-2" style={{ color: 'var(--text-primary)' }}>
              Icono
            </label>
            <div className="grid grid-cols-6 gap-2">
              {GOAL_ICON_OPTS.map(({ value, label, Icon }) => (
                <button key={value} title={label}
                  onClick={() => setForm(f => ({ ...f, icon: value }))}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all text-xs font-medium"
                  style={{
                    background: form.icon === value ? `${form.color ?? '#6d3bd7'}15` : 'var(--bg-subtle)',
                    border:     form.icon === value ? `1.5px solid ${form.color ?? '#6d3bd7'}` : '1.5px solid transparent',
                    color:      form.icon === value ? (form.color ?? '#6d3bd7') : 'var(--text-muted)',
                  }}>
                  <Icon size={18} />
                  <span className="text-[10px] leading-none">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Paleta de colores */}
          <div>
            <label className="text-sm font-semibold block mb-2" style={{ color: 'var(--text-primary)' }}>
              Color
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_PRESETS.map(color => (
                <button key={color} onClick={() => setForm(f => ({ ...f, color }))}
                  className="w-8 h-8 rounded-full transition-all"
                  style={{
                    backgroundColor: color,
                    transform:  form.color === color ? 'scale(1.2)' : 'scale(1)',
                    boxShadow:  form.color === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none',
                  }} />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditModal(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editing ? 'Guardar cambios' : 'Crear objetivo'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Depositar / Extraer ─────────────────────────────────────── */}
      <Modal
        open={movModal.open}
        onClose={() => setMovModal(m => ({ ...m, open: false }))}
        title={movModal.type === 'deposit' ? 'Depositar en objetivo' : 'Extraer del objetivo'}
      >
        <div className="space-y-4">
          {movModal.goal && (
            <div className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              {(() => { const Icon = getGoalIcon(movModal.goal.icon); return <Icon size={18} style={{ color: movModal.goal.color ?? '#6d3bd7' }} /> })()}
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{movModal.goal.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {movModal.type === 'deposit'
                    ? `Acumulado: ${formatCurrency(safeNumber(movModal.goal.current_amount), movModal.goal.currency ?? 'ARS')}`
                    : `Disponible: ${formatCurrency(safeNumber(movModal.goal.current_amount), movModal.goal.currency ?? 'ARS')}`
                  }
                </p>
              </div>
            </div>
          )}

          {movError && (
            <div className="rounded-xl px-4 py-3 text-sm font-medium"
              style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}>
              {movError}
            </div>
          )}

          <Input
            label="Monto" type="number" min="0.01" step="0.01"
            value={movForm.amount}
            onChange={e => setMovForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="0.00"
          />

          {/* Selector de billetera */}
          {(() => {
            const currency = movModal.goal?.currency
            const opts = compatibleWallets(currency)
            if (!walletsLoading && opts.length === 0) {
              return (
                <div className="rounded-xl px-4 py-3 text-sm"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  No tenés billeteras en {currency}. Creá una en la sección Billeteras.
                </div>
              )
            }
            return (
              <Select
                label={movModal.type === 'deposit' ? 'Billetera origen' : 'Billetera destino'}
                value={movForm.walletId}
                onChange={e => setMovForm(f => ({ ...f, walletId: e.target.value }))}
                options={[
                  { value: '', label: 'Elegí una billetera' },
                  ...opts.map(w => ({
                    value: w.id!,
                    label: `${w.name} — ${formatCurrency(w.current_balance, w.currency ?? 'ARS')}`,
                  })),
                ]}
              />
            )
          })()}

          <Input
            label="Nota (opcional)"
            value={movForm.note}
            onChange={e => setMovForm(f => ({ ...f, note: e.target.value }))}
            placeholder="Ej: Aporte mensual, Ahorro extra…"
          />

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setMovModal(m => ({ ...m, open: false }))} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleMovement} loading={movSaving} className="flex-1"
              style={movModal.type === 'withdraw' ? { background: 'linear-gradient(135deg, var(--expense-500), var(--expense-600))' } : undefined}>
              {movModal.type === 'deposit' ? 'Depositar' : 'Extraer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Detalle + Historial ─────────────────────────────────────── */}
      {detailGoal && (
        <Modal
          open={!!detailGoal}
          onClose={() => setDetailGoal(null)}
          title={detailGoal.name}
        >
          {(() => {
            const tgt       = safeNumber(detailGoal.target_amount)
            const cur       = safeNumber(detailGoal.current_amount)
            const pct       = tgt > 0 ? Math.min((cur / tgt) * 100, 100) : 0
            const remaining = Math.max(0, tgt - cur)
            const color     = detailGoal.color ?? '#6d3bd7'
            const days      = daysRemaining(detailGoal.target_date)
            const monthlyNeeded = (days && days > 0 && remaining > 0)
              ? remaining / (days / 30)
              : null
            const GoalIcon  = getGoalIcon(detailGoal.icon)

            return (
              <div className="space-y-5">
                {/* Cabecera visual */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: `${color}15` }}>
                    <GoalIcon size={24} style={{ color }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{detailGoal.name}</p>
                    {detailGoal.description && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{detailGoal.description}</p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Acumulado',  value: formatCurrency(cur, detailGoal.currency ?? 'ARS'), highlight: true },
                    { label: 'Objetivo',   value: formatCurrency(tgt, detailGoal.currency ?? 'ARS'), highlight: false },
                    { label: 'Restante',   value: formatCurrency(remaining, detailGoal.currency ?? 'ARS'), highlight: false },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl px-3 py-2.5 text-center"
                      style={{ background: s.highlight ? `${color}10` : 'var(--bg-subtle)', border: `1px solid ${s.highlight ? `${color}30` : 'var(--border)'}` }}>
                      <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                      <p className="text-sm font-extrabold tabular-nums" style={{ color: s.highlight ? color : 'var(--text-primary)' }}>
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Barra de progreso */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs font-bold" style={{ color }}>{pct.toFixed(1)}%</span>
                    {detailGoal.is_completed && (
                      <span className="text-xs font-bold" style={{ color: 'var(--income-600)' }}>✓ Completado</span>
                    )}
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: detailGoal.is_completed
                          ? 'linear-gradient(90deg, var(--income-500), var(--income-600))'
                          : `linear-gradient(90deg, ${color}, ${color}bb)`,
                      }} />
                  </div>
                </div>

                {/* Fecha e insights */}
                {detailGoal.target_date && (
                  <div className="rounded-xl px-4 py-3 space-y-1.5"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                        <Calendar size={12} /> Meta
                      </span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {new Date(detailGoal.target_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    {days !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                          <Clock size={12} /> Días restantes
                        </span>
                        <span className="text-xs font-semibold"
                          style={{ color: days <= 0 ? 'var(--expense-500)' : days <= 30 ? '#F59E0B' : 'var(--text-primary)' }}>
                          {days <= 0 ? 'Vencido' : `${days} días`}
                        </span>
                      </div>
                    )}
                    {monthlyNeeded && monthlyNeeded > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                          <TrendingUp size={12} /> Ahorro mensual sugerido
                        </span>
                        <span className="text-xs font-bold" style={{ color }}>
                          {formatCurrency(monthlyNeeded, detailGoal.currency ?? 'ARS')}/mes
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Acciones rápidas */}
                {!detailGoal.is_completed && (
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => { setDetailGoal(null); openDeposit(detailGoal) }}>
                      <ArrowDownCircle size={15} /> Depositar
                    </Button>
                    {cur > 0 && (
                      <Button variant="secondary" className="flex-1" onClick={() => { setDetailGoal(null); openWithdraw(detailGoal) }}>
                        <ArrowUpCircle size={15} /> Extraer
                      </Button>
                    )}
                  </div>
                )}

                {/* Historial de movimientos */}
                <div>
                  <p className="text-sm font-extrabold mb-3" style={{ color: 'var(--text-primary)' }}>
                    Historial
                  </p>
                  {movLoading ? (
                    <div className="py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                      <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
                      Cargando movimientos…
                    </div>
                  ) : movements.length === 0 ? (
                    <div className="py-6 text-center rounded-xl"
                      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sin movimientos todavía.</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
                        Los depósitos y extracciones aparecerán acá.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {movements.map(mov => (
                        <div key={mov.id}
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                              style={{
                                background: mov.type === 'deposit' ? 'var(--income-50)' : 'var(--expense-50)',
                              }}>
                              {mov.type === 'deposit'
                                ? <ArrowDownCircle size={14} style={{ color: 'var(--income-600)' }} />
                                : <ArrowUpCircle   size={14} style={{ color: 'var(--expense-600)' }} />
                              }
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                {mov.type === 'deposit' ? 'Depósito' : 'Extracción'}
                                {mov.wallet_id && (
                                  <span className="font-normal" style={{ color: 'var(--text-muted)' }}>
                                    {' · '}{walletName(mov.wallet_id)}
                                  </span>
                                )}
                              </p>
                              {mov.description && (
                                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{mov.description}</p>
                              )}
                              {mov.created_at && (
                                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                                  {new Date(mov.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-extrabold tabular-nums shrink-0 ml-3"
                            style={{ color: mov.type === 'deposit' ? 'var(--income-600)' : 'var(--expense-600)' }}>
                            {mov.type === 'deposit' ? '+' : '−'}
                            {formatCurrency(safeNumber(mov.amount), detailGoal.currency ?? 'ARS')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </Modal>
      )}

    </div>
  )
}
