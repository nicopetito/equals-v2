'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus, Pencil, Trash2, CalendarClock, ToggleLeft, ToggleRight,
  Clock, Search, Bell, BellOff, Repeat, Mail, Activity,
  ArrowUpCircle, ArrowDownCircle, Wallet, AlertCircle, Tag, CheckCircle2,
} from 'lucide-react'
import { parseISO, differenceInDays } from 'date-fns'
import { recurringService } from '@/services/recurring.service'
import { useToast } from '@/components/providers/ToastProvider'
import { useCategories } from '@/hooks/useCategories'
import { useWallets } from '@/hooks/useWallets'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { HelpButton } from '@/components/help/HelpButton'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, safeNumber } from '@/utils/format'
import { formatDate } from '@/utils/date'
import { RECURRING_CADENCES } from '@/types'
import type { RecurringTransaction, RecurringTransactionWithDetails } from '@/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const CURRENCY_OPTS = [
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'CRYPTO', label: 'CRYPTO' },
]

const CADENCE_INFO: Record<string, { label: string; color: string; bg: string; monthly: number; days: number }> = {
  daily:     { label: 'Diario',     color: '#F59E0B', bg: '#FFFBEB',                   monthly: 30,     days: 1     },
  weekly:    { label: 'Semanal',    color: '#0EA5E9', bg: '#F0F9FF',                   monthly: 4.33,   days: 7     },
  biweekly:  { label: 'Quincenal',  color: '#a078ff', bg: 'rgba(160,120,255,0.10)',     monthly: 2.17,   days: 14    },
  monthly:   { label: 'Mensual',    color: '#6d3bd7', bg: 'rgba(109,59,215,0.10)',      monthly: 1,      days: 30.4  },
  quarterly: { label: 'Trimestral', color: '#10B981', bg: '#ECFDF5',                   monthly: 0.333,  days: 91.25 },
  yearly:    { label: 'Anual',      color: '#F43F5E', bg: '#FFF1F2',                   monthly: 0.0833, days: 365   },
}

const CADENCE_UNIT: Record<string, string> = {
  daily: 'días', weekly: 'semanas', biweekly: 'quincenas',
  monthly: 'meses', quarterly: 'trimestres', yearly: 'años',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthlyEquiv(amount: number, cadence: string): number {
  return safeNumber(amount) * (CADENCE_INFO[cadence]?.monthly ?? 1)
}

function elapsedPeriods(createdAt?: string, cadence?: string): number {
  if (!createdAt) return 0
  try {
    const dpp = CADENCE_INFO[cadence ?? 'monthly']?.days ?? 30
    const d = differenceInDays(new Date(), parseISO(createdAt))
    return Math.max(0, Math.floor(d / dpp))
  } catch { return 0 }
}

function progressInfo(createdAt?: string, endDate?: string | null, cadence?: string) {
  if (!endDate || !createdAt) return null
  try {
    const dpp   = CADENCE_INFO[cadence ?? 'monthly']?.days ?? 30
    const start = parseISO(createdAt)
    const end   = parseISO(endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null
    const total = Math.max(1, Math.ceil(differenceInDays(end, start) / dpp))
    const done  = Math.min(Math.max(0, Math.floor(differenceInDays(new Date(), start) / dpp)), total)
    const pct   = Math.max(0, Math.min(100, Math.round((done / total) * 100)))
    return { total, done, pct, startLabel: formatDate(createdAt), endLabel: formatDate(endDate) }
  } catch { return null }
}

function isDueSoon(nextDate: string): boolean {
  try { return differenceInDays(parseISO(nextDate), new Date()) <= 7 }
  catch { return false }
}

function isOverdue(nextDate: string): boolean {
  try { return differenceInDays(parseISO(nextDate), new Date()) <= 0 }
  catch { return false }
}

function relativeDateLabel(nextDate: string): string {
  try {
    const days = differenceInDays(parseISO(nextDate), new Date())
    if (days < 0)   return formatDate(nextDate)
    if (days === 0) return 'Hoy'
    if (days === 1) return 'Mañana'
    if (days <= 14) return `En ${days} días`
    return formatDate(nextDate)
  } catch { return '—' }
}

// ─── Extended form type (UI-only fields not persisted to DB) ─────────────────

type FormState = Partial<RecurringTransaction> & {
  end_date?: string
  email_reminder?: boolean
  reminder_email?: string
  active: boolean
  type: 'income' | 'expense'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScheduledPage() {
  const [items, setItems]     = useState<RecurringTransactionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const { data: categories }  = useCategories()
  const { data: wallets }     = useWallets()
  const { addToast }          = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<RecurringTransactionWithDetails | null>(null)
  const [form, setForm]           = useState<FormState>({
    type: 'expense', currency: 'ARS', cadence: 'monthly',
    next_date: new Date().toISOString().split('T')[0],
    active: true, email_reminder: false,
  })
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [filterType,   setFilterType]   = useState<'all' | 'income' | 'expense'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused' | 'due_soon'>('all')
  const [search, setSearch]             = useState('')

  const [execModal,    setExecModal]    = useState<{ item: RecurringTransactionWithDetails } | null>(null)
  const [execWalletId, setExecWalletId] = useState('')
  const [executing,    setExecuting]    = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await recurringService.list()) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    const active         = items.filter(i => i.active)
    const incomesActive  = active.filter(i => i.type === 'income').length
    const expensesActive = active.filter(i => i.type === 'expense').length
    const nextDue        = items.find(i => i.active)
    const monthlyIncome  = active.filter(i => i.type === 'income').reduce((s, i) => s + monthlyEquiv(safeNumber(i.amount), i.cadence), 0)
    const monthlyExpense = active.filter(i => i.type === 'expense').reduce((s, i) => s + monthlyEquiv(safeNumber(i.amount), i.cadence), 0)
    return { incomesActive, expensesActive, nextDue, monthlyIncome, monthlyExpense }
  }, [items])

  const filtered = useMemo(() => items.filter(item => {
    if (filterType === 'income'  && item.type !== 'income')  return false
    if (filterType === 'expense' && item.type !== 'expense') return false
    if (filterStatus === 'active'   && !item.active)  return false
    if (filterStatus === 'paused'   &&  item.active)  return false
    if (filterStatus === 'due_soon' && (!item.active || !isDueSoon(item.next_date))) return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !item.description?.toLowerCase().includes(q) &&
        !item.category_name?.toLowerCase().includes(q) &&
        !item.wallet_name?.toLowerCase().includes(q)
      ) return false
    }
    return true
  }), [items, filterType, filterStatus, search])

  function openCreate() {
    setEditing(null)
    setForm({
      type: 'expense', currency: 'ARS', cadence: 'monthly',
      next_date: new Date().toISOString().split('T')[0],
      active: true, email_reminder: false,
    })
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(item: RecurringTransactionWithDetails) {
    setEditing(item)
    setForm({ ...item, active: item.active ?? true, type: item.type, email_reminder: false })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.description?.trim() || !form.amount) {
      setFormError('Completá descripción y monto.')
      return
    }
    setSaving(true)
    setFormError(null)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { end_date: _ed, email_reminder: _er, reminder_email: _re, ...dbPayload } = form
    const payload = { ...dbPayload, category_id: dbPayload.category_id || null, wallet_id: dbPayload.wallet_id || null }

    try {
      if (editing?.id) {
        await recurringService.update(editing.id, payload as Partial<RecurringTransaction>)
        addToast('Operación actualizada', 'success')
      } else {
        await recurringService.create(payload as Omit<RecurringTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
        addToast('Operación creada', 'success')
      }
      setModalOpen(false)
      load()
    } catch {
      setFormError('Error al guardar.')
      addToast('Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(item: RecurringTransactionWithDetails) {
    if (!item.id) return
    await recurringService.toggle(item.id, !item.active)
    addToast(item.active ? 'Operación pausada' : 'Operación reactivada', 'info')
    load()
  }

  async function doExecute(item: RecurringTransactionWithDetails, walletId: string) {
    if (item.type === 'expense') {
      const wallet = wallets.find(w => w.id === walletId)
      if (wallet && safeNumber(wallet.current_balance) < safeNumber(item.amount)) {
        addToast('Saldo insuficiente en la billetera seleccionada', 'error')
        return
      }
    }
    setExecuting(prev => new Set([...prev, item.id!]))
    try {
      await recurringService.executeAtomic(item.id!, walletId)
      addToast(`${item.type === 'expense' ? 'Pago' : 'Cobro'} registrado correctamente`, 'success')
      setExecModal(null)
      load()
    } catch {
      addToast('Error al registrar el movimiento', 'error')
    } finally {
      setExecuting(prev => { const s = new Set(prev); s.delete(item.id!); return s })
    }
  }

  function handleExecute(item: RecurringTransactionWithDetails) {
    if (item.wallet_id) {
      doExecute(item, item.wallet_id)
    } else {
      setExecWalletId(wallets[0]?.id ?? '')
      setExecModal({ item })
    }
  }

  async function handleDelete(item: RecurringTransactionWithDetails) {
    if (!item.id) return
    await recurringService.delete(item.id)
    addToast('Operación eliminada', 'info')
    load()
  }

  const cadenceOptions  = RECURRING_CADENCES.map(c => ({ value: c.value, label: c.label }))
  const categoryOptions = [{ value: '', label: 'Sin categoría' }, ...categories.map(c => ({ value: c.id!, label: c.name }))]
  const walletOptions   = [{ value: '', label: 'Sin billetera' }, ...wallets.map(w => ({ value: w.id!, label: w.name }))]

  const net = safeNumber(stats.monthlyIncome) - safeNumber(stats.monthlyExpense)

  return (
    <div className="p-5 md:p-7 max-w-5xl mx-auto space-y-4 animate-fade-in">

      {/* ─── Header ─── */}
      <div
        className="rounded-2xl px-5 py-4 flex items-center gap-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)', boxShadow: '0 8px 24px -4px rgba(109,59,215,0.30)' }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 800 80">
            <path d="M0,60 Q200,20 400,50 T800,20 L800,80 L0,80 Z" fill="white" />
          </svg>
        </div>
        <div className="relative z-10 w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <CalendarClock size={18} style={{ color: 'rgba(255,255,255,0.9)' }} />
        </div>
        <div className="relative z-10 flex-1 min-w-0">
          <h1 className="text-lg font-black tracking-tight leading-none" style={{ color: 'rgba(255,255,255,0.96)', fontFamily: 'var(--font-sora)' }}>
            Operaciones programadas
          </h1>
          <p className="text-xs font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Gestioná ingresos y gastos fijos
          </p>
        </div>
        <div className="relative z-10 shrink-0 flex gap-2">
          <HelpButton section="scheduled" />
          <button
            onClick={openCreate}
            className="hero-btn hero-btn-primary"
          >
            <Plus size={14} />
            Nueva operación
          </button>
        </div>
      </div>

      {/* ─── Mini stats ─── */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { label: 'Ingresos activos',  value: String(stats.incomesActive),  icon: ArrowUpCircle,   color: 'var(--income-500)',  bg: 'var(--income-50)'  },
            { label: 'Gastos activos',    value: String(stats.expensesActive), icon: ArrowDownCircle, color: 'var(--expense-500)', bg: 'var(--expense-50)' },
            { label: 'Próx. vencimiento', value: stats.nextDue ? relativeDateLabel(stats.nextDue.next_date) : '—', icon: Clock, color: '#D97706', bg: '#FFFBEB' },
            { label: 'Proy. mensual',     value: formatCurrency(Math.abs(net), 'ARS'), icon: Activity, color: 'var(--brand-500)', bg: 'var(--brand-50)' },
            { label: 'Recordatorios',     value: '0 activos', icon: Bell, color: 'var(--sky-500)', bg: 'var(--sky-50)' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} style={{ padding: '8px 10px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
                <Icon size={11} style={{ color }} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
                <p style={{ fontSize: '10px', color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── "Este mes impactarán" — línea compacta ─── */}
      {!loading && items.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 14px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '3px 0' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '6px', whiteSpace: 'nowrap' }}>Este mes impactarán</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--income-600)', whiteSpace: 'nowrap' }}>
            +{formatCurrency(safeNumber(stats.monthlyIncome), 'ARS')} ingresos
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-faint)', margin: '0 6px' }}>·</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--expense-600)', whiteSpace: 'nowrap' }}>
            −{formatCurrency(safeNumber(stats.monthlyExpense), 'ARS')} gastos
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-faint)', margin: '0 6px' }}>·</span>
          <span style={{ fontSize: '12px', fontWeight: 800, color: net >= 0 ? 'var(--income-600)' : 'var(--expense-600)', whiteSpace: 'nowrap' }}>
            {net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(net), 'ARS')} neto
          </span>
        </div>
      )}

      {/* ─── Filtros ─── */}
      {!loading && items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'income', 'expense'] as const).map(val => {
            const labels = { all: 'Todas', income: 'Ingresos', expense: 'Gastos' }
            return (
              <button key={val} onClick={() => setFilterType(val)} className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={filterType === val ? { background: 'var(--brand-500)', color: 'white' } : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {labels[val]}
              </button>
            )
          })}
          <div className="w-px h-4 shrink-0" style={{ background: 'var(--border)' }} />
          {(['all', 'active', 'paused', 'due_soon'] as const).map(val => {
            const labels = { all: 'Todas', active: 'Activas', paused: 'Pausadas', due_soon: 'Vencen pronto' }
            return (
              <button key={val} onClick={() => setFilterStatus(val)} className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={filterStatus === val ? { background: 'var(--brand-500)', color: 'white' } : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {labels[val]}
              </button>
            )
          })}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full flex-1 min-w-44" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Search size={13} style={{ color: 'var(--text-faint)' }} />
            <input type="text" placeholder="Buscar por nombre, categoría, billetera…" value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-xs" style={{ color: 'var(--text-primary)' }} />
          </div>
        </div>
      )}

      {/* ─── Contenido ─── */}
      {loading ? (
        <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
          <div className="w-7 h-7 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Cargando operaciones…</p>
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No tenés operaciones programadas"
          description="Registrá pagos fijos como sueldo, alquiler o suscripciones para no olvidar ningún movimiento recurrente."
          action={{ label: '+ Nueva operación', onClick: openCreate }} />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <Search size={22} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Sin resultados</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Probá con otros filtros o términos de búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(item => (
            <ScheduledCard
              key={item.id}
              item={item}
              onEdit={openEdit}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onExecute={handleExecute}
              isExecuting={executing.has(item.id ?? '')}
            />
          ))}
        </div>
      )}

      {/* ─── Modal selección billetera para ejecutar ─── */}
      <Modal open={!!execModal} onClose={() => setExecModal(null)} title="Seleccioná una billetera">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Esta operación no tiene billetera asignada. ¿En qué billetera querés registrar el movimiento?
          </p>
          <Select
            label="Billetera"
            value={execWalletId}
            onChange={e => setExecWalletId(e.target.value)}
            options={wallets.map(w => ({ value: w.id!, label: w.name }))}
          />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setExecModal(null)} className="flex-1">Cancelar</Button>
            <Button
              onClick={() => execModal && doExecute(execModal.item, execWalletId)}
              loading={execModal ? executing.has(execModal.item.id ?? '') : false}
              className="flex-1"
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Modal ─── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar operación' : 'Nueva operación programada'}>
        <div className="space-y-4">
          {formError && (
            <div className="rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2"
              style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}>
              <AlertCircle size={14} />{formError}
            </div>
          )}

          <div className="flex gap-2">
            {(['expense', 'income'] as const).map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all"
                style={form.type === t
                  ? t === 'income' ? { background: 'var(--income-50)', color: 'var(--income-600)', border: '2px solid var(--income-500)' }
                    : { background: 'var(--expense-50)', color: 'var(--expense-600)', border: '2px solid var(--expense-500)' }
                  : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '2px solid transparent' }}>
                {t === 'income' ? '↑ Ingreso' : '↓ Gasto'}
              </button>
            ))}
          </div>

          <Input label="Nombre / Descripción" value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ej: Alquiler, Netflix, Sueldo…" required />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Monto" type="number" min="0" step="0.01" value={form.amount ?? ''} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
            <Select label="Moneda" value={form.currency ?? 'ARS'} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} options={CURRENCY_OPTS} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select label="Frecuencia" value={form.cadence ?? 'monthly'} onChange={e => setForm(f => ({ ...f, cadence: e.target.value as RecurringTransaction['cadence'] }))} options={cadenceOptions} />
            <Input label="Próxima fecha" type="date" value={form.next_date ?? ''} onChange={e => setForm(f => ({ ...f, next_date: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select label="Categoría (opcional)" value={form.category_id ?? ''} onChange={e => setForm(f => ({ ...f, category_id: e.target.value || null }))} options={categoryOptions} />
            <Select label="Billetera (opcional)" value={form.wallet_id ?? ''} onChange={e => setForm(f => ({ ...f, wallet_id: e.target.value || null }))} options={walletOptions} />
          </div>

          <Input label="Fecha de finalización (opcional)" type="date" value={form.end_date ?? ''} onChange={e => setForm(f => ({ ...f, end_date: e.target.value || undefined }))} />

          {/* Toggle recordatorio */}
          <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={13} style={{ color: 'var(--sky-500)', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Recordatorio por mail</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-faint)', paddingLeft: '19px' }}>
                  Te avisaremos antes de la ejecución
                </span>
              </div>
              <button type="button" onClick={() => setForm(f => ({ ...f, email_reminder: !f.email_reminder }))}
                style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '10px', border: 'none', cursor: 'pointer', flexShrink: 0, outline: 'none', background: form.email_reminder ? 'var(--brand-500)' : 'var(--border)', transition: 'background 0.2s ease' }}>
                <span style={{ position: 'absolute', top: '2px', left: form.email_reminder ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s ease', display: 'block', pointerEvents: 'none' }} />
              </button>
            </div>
            {form.email_reminder && (
              <div style={{ marginTop: '10px' }}>
                <Input label="Email de recordatorio" type="email" value={form.reminder_email ?? ''} onChange={e => setForm(f => ({ ...f, reminder_email: e.target.value }))} placeholder="tu@email.com" />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Estado inicial</span>
            <div className="flex gap-1.5">
              {(['active', 'paused'] as const).map(s => (
                <button key={s} onClick={() => setForm(f => ({ ...f, active: s === 'active' }))} className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                  style={(s === 'active') === form.active ? { background: 'var(--brand-500)', color: 'white' } : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  {s === 'active' ? 'Activa' : 'Pausada'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{editing ? 'Guardar cambios' : 'Crear operación'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Scheduled Card ───────────────────────────────────────────────────────────

interface ScheduledCardProps {
  item: RecurringTransactionWithDetails
  onEdit: (item: RecurringTransactionWithDetails) => void
  onToggle: (item: RecurringTransactionWithDetails) => void
  onDelete: (item: RecurringTransactionWithDetails) => void
  onExecute: (item: RecurringTransactionWithDetails) => void
  isExecuting?: boolean
}

function ScheduledCard({ item, onEdit, onToggle, onDelete, onExecute, isExecuting }: ScheduledCardProps) {
  const isIncome  = item.type === 'income'
  const cadence   = CADENCE_INFO[item.cadence ?? 'monthly'] ?? CADENCE_INFO.monthly
  const dueSoon   = item.active && isDueSoon(item.next_date)
  const safeAmt   = safeNumber(item.amount)
  const currency  = item.currency ?? 'ARS'
  const monthly   = monthlyEquiv(safeAmt, item.cadence)
  const elapsed   = elapsedPeriods(item.created_at, item.cadence)
  const accrued   = elapsed * safeAmt
  const unitLabel = CADENCE_UNIT[item.cadence ?? 'monthly'] ?? 'períodos'

  // progress applies when end_date exists — UI-only field, prepared for when DB column is added
  const progress    = progressInfo(item.created_at, undefined, item.cadence)
  const totalImpact = progress ? safeAmt * progress.total : null
  const pending     = totalImpact !== null ? Math.max(0, totalImpact - accrued) : null

  const statusBadge = item.active
    ? dueSoon
      ? { label: 'Vence pronto', color: '#92400E', bg: '#FEF3C7' }
      : { label: 'Activa',       color: 'var(--income-600)', bg: 'var(--income-50)' }
    : { label: 'Pausada',        color: 'var(--text-muted)', bg: 'var(--bg-subtle)' }

  const nextLabel = relativeDateLabel(item.next_date)

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        opacity: item.active ? 1 : 0.6,
        transition: 'box-shadow 0.18s ease, transform 0.18s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        e.currentTarget.style.transform = ''
      }}
    >
      {/* Acento superior — solo si vence pronto */}
      {dueSoon && (
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #F59E0B 0%, #FCD34D 55%, transparent 100%)', flexShrink: 0 }} />
      )}

      {/* ── Header ── */}
      <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, marginTop: '1px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isIncome ? 'var(--income-50)' : 'var(--expense-50)',
        }}>
          {isIncome
            ? <ArrowUpCircle size={17} style={{ color: 'var(--income-500)' }} />
            : <ArrowDownCircle size={17} style={{ color: 'var(--expense-500)' }} />
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', lineHeight: 1.2 }}>
            {item.description}
          </p>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '99px', background: statusBadge.bg, color: statusBadge.color }}>
              {statusBadge.label}
            </span>
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '99px', background: cadence.bg, color: cadence.color }}>
              {cadence.label}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: isIncome ? 'var(--income-600)' : 'var(--expense-600)' }}>
            {isIncome ? '+' : '−'}{formatCurrency(safeAmt, currency)}
          </p>
          <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '2px' }}>{currency}</p>
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: '1px', background: 'var(--border-light)', margin: '0 16px' }} />

      {/* ── Metadatos ── */}
      <div style={{ padding: '11px 16px 8px', display: 'flex', flexWrap: 'wrap', gap: '5px 16px' }}>
        <InfoPill icon={Clock}  value={nextLabel} highlight={nextLabel === 'Hoy' || nextLabel === 'Mañana'} />
        <InfoPill icon={Repeat} value={cadence.label} />
        {item.wallet_name   && <InfoPill icon={Wallet} value={item.wallet_name} />}
        {item.category_name && <InfoPill icon={Tag}    value={item.category_name} />}
      </div>

      {/* ── Impacta en ── */}
      {(item.wallet_name || item.category_name) && (
        <div style={{ padding: '0 16px 11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0, background: isIncome ? 'var(--income-500)' : 'var(--expense-500)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Impacta en{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {[item.wallet_name, item.category_name].filter(Boolean).join(' · ')}
            </strong>
          </span>
        </div>
      )}

      {/* ── Divider ── */}
      <div style={{ height: '1px', background: 'var(--border-light)', margin: '0 16px' }} />

      {/* ── Progreso / Continua ── */}
      {progress ? (
        // Con fecha de finalización — barra temporal con fechas + impacto
        <div style={{ padding: '13px 16px' }}>
          {/* Fechas de inicio y fin */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-faint)' }}>Inicio: <strong style={{ color: 'var(--text-secondary)' }}>{progress.startLabel}</strong></span>
            <span style={{ fontSize: '10px', color: 'var(--text-faint)' }}>Finaliza: <strong style={{ color: 'var(--text-secondary)' }}>{progress.endLabel}</strong></span>
          </div>
          {/* Barra de progreso */}
          <div style={{ height: '6px', borderRadius: '99px', background: 'var(--border)', overflow: 'hidden', marginBottom: '6px' }}>
            <div style={{ height: '100%', width: `${progress.pct}%`, background: 'var(--grad-brand)', borderRadius: '99px', transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
          {/* Períodos */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {progress.done} de {progress.total} {unitLabel} · Restan {progress.total - progress.done}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-500)' }}>{progress.pct}%</span>
          </div>
          {/* Impacto total */}
          {totalImpact !== null && (
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <StatMini label="Impacto total" value={formatCurrency(totalImpact, currency)} />
              <StatMini label="Acumulado" value={formatCurrency(accrued, currency)} color={isIncome ? 'var(--income-600)' : 'var(--expense-600)'} />
              <StatMini label="Pendiente" value={formatCurrency(pending ?? 0, currency)} />
            </div>
          )}
        </div>
      ) : (
        // Sin fecha de finalización — ∞ + períodos + métricas
        <div style={{ padding: '11px 16px 13px' }}>
          {/* Fila: badge + texto de períodos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, background: 'var(--brand-50)', color: 'var(--brand-500)' }}>
              ∞ Continua
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>·</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {elapsed === 0
                ? 'Primer período pendiente'
                : <><strong style={{ color: 'var(--text-primary)' }}>{elapsed}</strong> {unitLabel} transcurridos</>
              }
            </span>
          </div>
          {/* Grid de 3 métricas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px 8px' }}>
            <StatMini label="Proy. mensual" value={formatCurrency(monthly, currency)} />
            <StatMini label="Impacto anual est." value={formatCurrency(monthly * 12, currency)} />
            <StatMini label="Acum. estimado" value={formatCurrency(accrued, currency)} color={isIncome ? 'var(--income-600)' : 'var(--expense-600)'} />
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ padding: '9px 16px 11px', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <BellOff size={11} style={{ color: 'var(--text-faint)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Sin recordatorio</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {/* Registrar pago / cobro — solo si activo y vencido */}
          {item.active && isOverdue(item.next_date) && (
            <button
              onClick={() => onExecute(item)}
              disabled={isExecuting}
              style={{
                display: 'flex', alignItems: 'center', gap: '3px',
                padding: '5px 9px', borderRadius: '7px',
                fontSize: '11px', fontWeight: 700,
                color: isIncome ? 'var(--income-600)' : 'var(--expense-600)',
                background: isIncome ? 'var(--income-50)' : 'var(--expense-50)',
                border: 'none', cursor: isExecuting ? 'wait' : 'pointer',
                opacity: isExecuting ? 0.6 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              <CheckCircle2 size={13} />
              {isExecuting ? 'Registrando…' : item.type === 'expense' ? 'Registrar pago' : 'Registrar cobro'}
            </button>
          )}
          {/* Pausar / Reactivar */}
          <button
            onClick={() => onToggle(item)}
            style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '5px 9px', borderRadius: '7px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = item.active ? 'var(--brand-50)' : 'var(--income-50)'; e.currentTarget.style.color = item.active ? 'var(--brand-600)' : 'var(--income-600)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            {item.active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
            {item.active ? 'Pausar' : 'Reactivar'}
          </button>
          {/* Editar */}
          <button onClick={() => onEdit(item)} title="Editar"
            style={{ width: '28px', height: '28px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-50)'; e.currentTarget.style.color = 'var(--brand-500)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}>
            <Pencil size={13} />
          </button>
          {/* Eliminar */}
          <button onClick={() => onDelete(item)} title="Eliminar"
            style={{ width: '28px', height: '28px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--expense-50)'; e.currentTarget.style.color = 'var(--expense-500)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoPill({ icon: Icon, value, highlight }: { icon: React.ElementType; value: string; highlight?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <Icon size={11} style={{ color: highlight ? 'var(--brand-500)' : 'var(--text-faint)', flexShrink: 0 }} />
      <span style={{ fontSize: '12px', fontWeight: highlight ? 600 : 500, color: highlight ? 'var(--brand-600)' : 'var(--text-secondary)' }}>
        {value}
      </span>
    </span>
  )
}

function StatMini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginBottom: '1px' }}>{label}</p>
      <p style={{ fontSize: '12px', fontWeight: 700, color: color ?? 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    </div>
  )
}
