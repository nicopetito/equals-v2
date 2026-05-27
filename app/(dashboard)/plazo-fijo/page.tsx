'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  PiggyBank, Plus, TrendingUp, Calendar, Percent, Wallet,
  RefreshCw, ArrowDownCircle, Clock, CheckCircle2, XCircle,
  ChevronRight, Calculator,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { HelpButton } from '@/components/help/HelpButton'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/providers/ToastProvider'
import { useFixedTerms } from '@/hooks/useFixedTerms'
import { useWallets } from '@/hooks/useWallets'
import { fixedTermService } from '@/services/fixed_term.service'
import { safeNumber, formatCurrency } from '@/utils/format'
import type { FixedTerm } from '@/types'

// ─── helpers ─────────────────────────────────────────────────────────────────

function calcFT(principal: number, tna: number, days: number) {
  const p = safeNumber(principal)
  const r = safeNumber(tna)
  const d = safeNumber(days)
  if (p <= 0 || d <= 0) return { interest: 0, total: p, yieldPct: 0, dailyGain: 0 }
  const interest = p * (r / 100) * (d / 365)
  const safe = isFinite(interest) ? interest : 0
  return {
    interest: safe,
    total: p + safe,
    yieldPct: p > 0 ? (safe / p) * 100 : 0,
    dailyGain: d > 0 ? safe / d : 0,
  }
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

function daysFromToday(dateStr: string): number {
  return daysBetween(new Date().toISOString().split('T')[0], dateStr)
}

function isEffectivelyMatured(ft: FixedTerm): boolean {
  return ft.status === 'active' && daysFromToday(ft.maturity_date) < 0
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const TODAY = new Date().toISOString().split('T')[0]

const CURRENCY_OPTS = [
  { value: 'ARS', label: 'ARS — Peso argentino' },
  { value: 'USD', label: 'USD — Dólar' },
]

const TERM_PRESETS = [30, 60, 90]

// ─── types ────────────────────────────────────────────────────────────────────

type Tab = 'investments' | 'simulator'
type ActionTab = 'withdraw' | 'reinvest'

interface NewForm {
  name: string; principal: string; currency: string
  tna: string; term_days: string; start_date: string; wallet_id: string; note: string
}

interface WithdrawForm { wallet_id: string; amount: string }

interface ReinvestForm {
  capital_mode: 'same' | 'total'
  tna: string; term_days: string
}

const DEFAULT_NEW: NewForm = {
  name: '', principal: '', currency: 'ARS',
  tna: '', term_days: '30', start_date: TODAY,
  wallet_id: '', note: '',
}

// ─── sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ ft }: { ft: FixedTerm }) {
  const matured = isEffectivelyMatured(ft)
  const status = matured ? 'matured' : ft.status

  const cfg: Record<string, { label: string; bg: string; color: string; border: string; icon: React.ReactNode }> = {
    active:    { label: 'Activo',    bg: 'var(--brand-50)',  color: 'var(--brand-600)',  border: 'var(--brand-100)',   icon: <Clock size={11} /> },
    matured:   { label: 'Vencido',   bg: '#fefce8',          color: '#92400e',           border: '#fde68a',            icon: <CheckCircle2 size={11} /> },
    withdrawn: { label: 'Retirado',  bg: 'var(--bg-subtle)', color: 'var(--text-muted)', border: 'var(--border)',      icon: <ArrowDownCircle size={11} /> },
    reinvested:{ label: 'Renovado',  bg: 'var(--goal-50)',   color: 'var(--goal-600)',   border: 'var(--goal-100)',    icon: <RefreshCw size={11} /> },
    cancelled: { label: 'Cancelado', bg: 'var(--expense-50)',color: 'var(--expense-600)',border: 'var(--expense-100)', icon: <XCircle size={11} /> },
  }
  const s = cfg[status] ?? cfg.active
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {s.icon} {s.label}
    </span>
  )
}

function ProgressBar({ ft }: { ft: FixedTerm }) {
  const elapsed = Math.max(0, daysBetween(ft.start_date, TODAY))
  const total   = Math.max(1, ft.term_days)
  const pct     = Math.min(100, Math.round((elapsed / total) * 100))
  const remaining = daysFromToday(ft.maturity_date)

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {elapsed} de {total} días
        </span>
        <span className="text-xs font-semibold" style={{ color: remaining < 0 ? '#92400e' : remaining <= 7 ? '#d97706' : 'var(--text-muted)' }}>
          {remaining < 0 ? 'Vencido' : remaining === 0 ? 'Vence hoy' : `Restan ${remaining} días`}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: pct >= 100
              ? '#d97706'
              : pct >= 75
              ? 'var(--brand-400)'
              : 'var(--brand-500)',
          }}
        />
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export default function FixedTermPage() {
  const { items, loading, error: loadError, refetch } = useFixedTerms()
  const { data: wallets } = useWallets()
  const { addToast } = useToast()

  // tabs
  const [activeTab, setActiveTab] = useState<Tab>('investments')

  // new modal
  const [newOpen, setNewOpen]   = useState(false)
  const [newForm, setNewForm]   = useState<NewForm>(DEFAULT_NEW)
  const [newError, setNewError] = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)

  // action modal (withdraw / reinvest)
  const [actionItem, setActionItem]   = useState<FixedTerm | null>(null)
  const [actionTab, setActionTab]     = useState<ActionTab>('withdraw')
  const [withdrawForm, setWithdrawForm] = useState<WithdrawForm>({ wallet_id: '', amount: '' })
  const [reinvestForm, setReinvestForm] = useState<ReinvestForm>({ capital_mode: 'same', tna: '', term_days: '30' })
  const [actionError, setActionError] = useState<string | null>(null)
  const [actioning, setActioning]     = useState(false)

  // simulator
  const [sim, setSim] = useState({ principal: '', currency: 'ARS', tna: '', days: '30', start_date: TODAY })

  // ── derived ────────────────────────────────────────────────────────────────

  const walletOpts = useMemo(() => [
    { value: '', label: 'Seleccioná una billetera' },
    ...wallets.map(w => ({ value: w.id ?? '', label: `${w.name} (${formatCurrency(w.current_balance, w.currency ?? 'ARS')} ${w.currency ?? ''})` })),
  ], [wallets])

  const activeItems = useMemo(() =>
    items.filter(ft => ft.status === 'active' || isEffectivelyMatured(ft)),
  [items])

  const historyItems = useMemo(() =>
    items.filter(ft => ft.status === 'withdrawn' || ft.status === 'reinvested' || ft.status === 'cancelled'),
  [items])

  const summary = useMemo(() => {
    const byCurrency: Record<string, { capital: number; interest: number; total: number; count: number }> = {}
    for (const ft of activeItems) {
      if (!byCurrency[ft.currency]) byCurrency[ft.currency] = { capital: 0, interest: 0, total: 0, count: 0 }
      byCurrency[ft.currency].capital   += ft.principal_amount
      byCurrency[ft.currency].interest  += ft.estimated_interest
      byCurrency[ft.currency].total     += ft.estimated_total
      byCurrency[ft.currency].count     += 1
    }
    return byCurrency
  }, [activeItems])

  // new form derived
  const newTermDays = safeNumber(newForm.term_days)
  const newMaturityDate = newForm.start_date && newTermDays > 0 ? addDays(newForm.start_date, newTermDays) : ''
  const newCalc = calcFT(safeNumber(newForm.principal), safeNumber(newForm.tna), newTermDays)
  const showNewPreview = safeNumber(newForm.principal) > 0 && safeNumber(newForm.tna) >= 0 && newTermDays > 0

  // simulator derived
  const simDays    = safeNumber(sim.days)
  const simCalc    = calcFT(safeNumber(sim.principal), safeNumber(sim.tna), simDays)
  const simMatDate = sim.start_date && simDays > 0 ? addDays(sim.start_date, simDays) : ''

  // action modal derived
  const actionMatured = actionItem ? isEffectivelyMatured(actionItem) || actionItem.status === 'matured' : false
  const reinvestDays  = safeNumber(reinvestForm.term_days)
  const reinvestTna   = safeNumber(reinvestForm.tna || String(actionItem?.tna ?? 0))
  const reinvestCapital = actionItem
    ? reinvestForm.capital_mode === 'total'
      ? actionItem.estimated_total
      : actionItem.principal_amount
    : 0
  const reinvestCalc    = calcFT(reinvestCapital, reinvestTna, reinvestDays)
  const reinvestNewStart = TODAY
  const reinvestNewEnd   = addDays(reinvestNewStart, reinvestDays)

  // ── handlers ──────────────────────────────────────────────────────────────

  function openNew() {
    setNewForm(DEFAULT_NEW)
    setNewError(null)
    setNewOpen(true)
  }

  function openAction(ft: FixedTerm) {
    setActionItem(ft)
    setActionTab('withdraw')
    setWithdrawForm({ wallet_id: ft.wallet_id ?? '', amount: String(ft.estimated_total) })
    setReinvestForm({ capital_mode: 'same', tna: String(ft.tna), term_days: String(ft.term_days) })
    setActionError(null)
  }

  const handleCreate = useCallback(async () => {
    setNewError(null)
    const principal = safeNumber(newForm.principal)
    const tna       = safeNumber(newForm.tna)
    const term_days = safeNumber(newForm.term_days)

    if (!newForm.name.trim())       return setNewError('El nombre es obligatorio.')
    if (principal <= 0)             return setNewError('El capital debe ser mayor a 0.')
    if (tna < 0)                    return setNewError('La TNA no puede ser negativa.')
    if (term_days <= 0)             return setNewError('El plazo debe ser mayor a 0 días.')
    if (!newForm.start_date)        return setNewError('La fecha de inicio es obligatoria.')
    if (!newForm.wallet_id)         return setNewError('Seleccioná una billetera de origen.')

    const wallet = wallets.find(w => w.id === newForm.wallet_id)
    if (wallet && wallet.current_balance < principal) {
      return setNewError(`Saldo insuficiente. La billetera tiene ${formatCurrency(wallet.current_balance, wallet.currency ?? 'ARS')} ${wallet.currency ?? ''}.`)
    }

    const calc = calcFT(principal, tna, term_days)

    setSaving(true)
    try {
      await fixedTermService.createAtomic({
        name:               newForm.name.trim(),
        principal_amount:   principal,
        currency:           newForm.currency,
        tna,
        term_days,
        start_date:         newForm.start_date,
        maturity_date:      newMaturityDate,
        estimated_interest: calc.interest,
        estimated_total:    calc.total,
        wallet_id:          newForm.wallet_id,
        note:               newForm.note.trim() || undefined,
      })
      await refetch()
      setNewOpen(false)
      addToast('Plazo fijo creado y capital descontado de la billetera.', 'success')
    } catch (e) {
      setNewError(e instanceof Error ? e.message : 'Error al guardar el plazo fijo.')
    } finally {
      setSaving(false)
    }
  }, [newForm, newMaturityDate, wallets, refetch, addToast])

  const handleWithdraw = useCallback(async () => {
    if (!actionItem) return
    setActionError(null)
    const amount = safeNumber(withdrawForm.amount)
    if (!withdrawForm.wallet_id) return setActionError('Seleccioná una billetera destino.')
    if (amount <= 0)             return setActionError('El monto debe ser mayor a 0.')

    setActioning(true)
    try {
      await fixedTermService.withdrawAtomic({
        fixedTermId: actionItem.id,
        walletId:    withdrawForm.wallet_id,
        amount,
        currency:    actionItem.currency,
      })
      await refetch()
      setActionItem(null)
      addToast(`Retiro de ${formatCurrency(amount, actionItem.currency)} registrado.`, 'success')
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Error al retirar.')
    } finally {
      setActioning(false)
    }
  }, [actionItem, withdrawForm, refetch, addToast])

  const handleReinvest = useCallback(async () => {
    if (!actionItem) return
    setActionError(null)
    if (reinvestDays <= 0)  return setActionError('El plazo debe ser mayor a 0 días.')
    if (reinvestTna < 0)    return setActionError('La TNA no puede ser negativa.')
    if (reinvestCapital <= 0) return setActionError('El capital debe ser mayor a 0.')
    if (!actionItem.wallet_id) return setActionError('Este plazo no tiene billetera de origen.')

    setActioning(true)
    try {
      await fixedTermService.reinvestAtomic({
        oldFixedTermId:    actionItem.id,
        walletId:          actionItem.wallet_id,
        oldTotal:          actionItem.estimated_total,
        newPrincipal:      reinvestCapital,
        currency:          actionItem.currency,
        tna:               reinvestTna,
        termDays:          reinvestDays,
        startDate:         reinvestNewStart,
        maturityDate:      reinvestNewEnd,
        estimatedInterest: reinvestCalc.interest,
        estimatedTotal:    reinvestCalc.total,
      })
      await refetch()
      setActionItem(null)
      addToast(`Plazo fijo renovado por ${reinvestDays} días.`, 'success')
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Error al renovar.')
    } finally {
      setActioning(false)
    }
  }, [actionItem, reinvestDays, reinvestTna, reinvestCapital, reinvestCalc, reinvestNewStart, reinvestNewEnd, refetch, addToast])

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 md:p-7 max-w-4xl mx-auto space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <PageHeader
        title="Plazo fijo"
        subtitle="Simulá rendimientos y seguí tus inversiones"
        icon={PiggyBank}
        color="#d0bcff"
        layout="split"
      >
        <div className="flex gap-2 relative z-10 shrink-0">
          <HelpButton section="plazo-fijo" />
          <button
            onClick={() => setActiveTab('simulator')}
            className="hero-btn hero-btn-secondary"
          >
            <Calculator size={14} /> Simular
          </button>
          <button
            onClick={openNew}
            className="hero-btn hero-btn-primary"
          >
            <Plus size={14} /> Nuevo plazo fijo
          </button>
        </div>
      </PageHeader>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {([['investments', 'Mis inversiones'], ['simulator', 'Simulador']] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2.5 text-sm font-semibold transition-all -mb-px"
            style={{
              borderBottom: activeTab === tab ? '2px solid var(--brand-500)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--brand-600)' : 'var(--text-muted)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════ TAB: INVESTMENTS ═══════════════════════════════════ */}
      {activeTab === 'investments' && (
        <div className="space-y-6">

          {/* Load error */}
          {loadError && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}>
              {loadError}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[0, 1].map(i => (
                <div key={i} className="rounded-2xl p-5 animate-pulse h-52"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} />
              ))}
            </div>
          )}

          {!loading && (
            <>
              {/* Summary strip */}
              {Object.keys(summary).length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(summary).map(([curr, data]) => (
                    <div key={curr} className="rounded-2xl p-4"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-50)' }}>
                          <PiggyBank size={14} style={{ color: 'var(--brand-500)' }} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          Resumen {curr} · {data.count} activo{data.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { label: 'Capital', value: formatCurrency(data.capital, curr), color: 'var(--text-primary)' },
                          { label: 'Interés est.', value: '+' + formatCurrency(data.interest, curr), color: 'var(--income-600)' },
                          { label: 'Total est.', value: formatCurrency(data.total, curr), color: 'var(--brand-600)' },
                        ].map(({ label, value, color }) => (
                          <div key={label}>
                            <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                            <p className="text-sm font-extrabold tabular-nums" style={{ color }}>{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {items.length === 0 && (
                <EmptyState
                  icon={PiggyBank}
                  title="No tenés plazos fijos activos"
                  description="Simulá un rendimiento o registrá una inversión para seguir su evolución."
                  action={{ label: '+ Nuevo plazo fijo', onClick: openNew }}
                />
              )}

              {/* Active / matured cards */}
              {activeItems.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>Activos</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeItems.map(ft => {
                      const matured = isEffectivelyMatured(ft)
                      return (
                        <div
                          key={ft.id}
                          className="rounded-2xl p-5 transition-all hover:-translate-y-0.5"
                          style={{
                            background: 'var(--bg-card)',
                            border: matured ? '1px solid #fde68a' : '1px solid var(--border)',
                            boxShadow: 'var(--shadow-sm)',
                          }}
                        >
                          {/* Card header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                                style={{ background: matured ? '#fef3c7' : 'var(--brand-50)' }}>
                                <PiggyBank size={18} style={{ color: matured ? '#d97706' : 'var(--brand-500)' }} />
                              </div>
                              <div>
                                <p className="font-extrabold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
                                  {ft.name}
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                  {ft.currency} · TNA {ft.tna}%
                                </p>
                              </div>
                            </div>
                            <StatusBadge ft={ft} />
                          </div>

                          {/* Data grid */}
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            <DataCell label="Capital" icon={<Wallet size={10} />}>
                              <span className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                                {formatCurrency(ft.principal_amount, ft.currency)}
                              </span>
                            </DataCell>
                            <DataCell label="Plazo" icon={<Calendar size={10} />}>
                              <span className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
                                {ft.term_days} días
                              </span>
                            </DataCell>
                            <DataCell label="Inicio" icon={<Calendar size={10} />}>
                              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                                {fmtDate(ft.start_date)}
                              </span>
                            </DataCell>
                            <DataCell label="Vencimiento" icon={<Calendar size={10} />}>
                              <span className="text-xs font-semibold" style={{ color: matured ? '#d97706' : 'var(--text-secondary)' }}>
                                {fmtDate(ft.maturity_date)}
                              </span>
                            </DataCell>
                          </div>

                          {/* Progress */}
                          <div className="mb-4">
                            <ProgressBar ft={ft} />
                          </div>

                          {/* Result row */}
                          <div className="rounded-xl p-3 flex items-center justify-between mb-4"
                            style={{ background: 'var(--income-50)', border: '1px solid var(--income-100)' }}>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp size={13} style={{ color: 'var(--income-600)' }} />
                              <span className="text-sm font-bold" style={{ color: 'var(--income-600)' }}>
                                +{formatCurrency(ft.estimated_interest, ft.currency)}
                              </span>
                              <span className="text-xs" style={{ color: 'var(--income-600)' }}>
                                ({(ft.principal_amount > 0 ? (ft.estimated_interest / ft.principal_amount) * 100 : 0).toFixed(1)}%)
                              </span>
                            </div>
                            <span className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--brand-600)' }}>
                              = {formatCurrency(ft.estimated_total, ft.currency)}
                            </span>
                          </div>

                          {/* Action buttons for matured */}
                          {matured && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => { openAction(ft); setActionTab('withdraw') }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                                style={{ background: 'var(--income-50)', color: 'var(--income-700)', border: '1px solid var(--income-200)' }}
                              >
                                <ArrowDownCircle size={13} /> Retirar
                              </button>
                              <button
                                onClick={() => { openAction(ft); setActionTab('reinvest') }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                                style={{ background: 'var(--brand-50)', color: 'var(--brand-600)', border: '1px solid var(--brand-100)' }}
                              >
                                <RefreshCw size={13} /> Renovar
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* History */}
              {historyItems.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>Historial</h3>
                  <div className="rounded-2xl overflow-hidden"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                    {historyItems.map((ft, i) => (
                      <div key={ft.id}
                        className="flex items-center justify-between px-4 py-3"
                        style={{ borderTop: i > 0 ? '1px solid var(--border-light)' : 'none' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-subtle)' }}>
                            <PiggyBank size={14} style={{ color: 'var(--text-muted)' }} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ft.name}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {fmtDate(ft.start_date)} → {fmtDate(ft.maturity_date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                              {formatCurrency(ft.estimated_total, ft.currency)}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--income-600)' }}>
                              +{formatCurrency(ft.estimated_interest, ft.currency)}
                            </p>
                          </div>
                          <StatusBadge ft={ft} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════ TAB: SIMULATOR ═══════════════════════════════════ */}
      {activeTab === 'simulator' && (
        <div className="space-y-5">
          <div className="rounded-2xl p-5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-50)' }}>
                <Calculator size={15} style={{ color: 'var(--brand-500)' }} />
              </div>
              <div>
                <p className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>Simulador de rendimiento</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Solo cálculo — no impacta tu billetera</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              <Input
                label="Capital"
                type="number" min="0" step="0.01"
                value={sim.principal}
                onChange={e => setSim(s => ({ ...s, principal: e.target.value }))}
                placeholder="100000"
              />
              <Select
                label="Moneda"
                value={sim.currency}
                onChange={e => setSim(s => ({ ...s, currency: e.target.value }))}
                options={CURRENCY_OPTS}
              />
              <Input
                label="TNA (%)"
                type="number" min="0" max="9999" step="0.1"
                value={sim.tna}
                onChange={e => setSim(s => ({ ...s, tna: e.target.value }))}
                placeholder="40"
                hint="Tasa nominal anual"
              />
              <Input
                label="Plazo (días)"
                type="number" min="1"
                value={sim.days}
                onChange={e => setSim(s => ({ ...s, days: e.target.value }))}
                placeholder="30"
              />
              <Input
                label="Fecha de inicio"
                type="date"
                value={sim.start_date}
                onChange={e => setSim(s => ({ ...s, start_date: e.target.value }))}
              />
            </div>

            {/* Result */}
            {safeNumber(sim.principal) > 0 && safeNumber(sim.tna) >= 0 && simDays > 0 && (
              <div className="rounded-xl p-4 mb-4"
                style={{ background: 'var(--income-50)', border: '1px solid var(--income-100)' }}>
                <p className="text-xs font-bold mb-3" style={{ color: 'var(--income-700)' }}>Resultado estimado</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Interés', value: formatCurrency(simCalc.interest, sim.currency), color: 'var(--income-600)', prefix: '+' },
                    { label: 'Total al vencer', value: formatCurrency(simCalc.total, sim.currency), color: 'var(--brand-600)' },
                    { label: 'Rendimiento', value: `${simCalc.yieldPct.toFixed(2)}%`, color: 'var(--text-primary)' },
                    { label: 'Ganancia diaria', value: formatCurrency(simCalc.dailyGain, sim.currency), color: 'var(--text-secondary)' },
                  ].map(({ label, value, color, prefix }) => (
                    <div key={label} className="text-center">
                      <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                      <p className="text-sm font-extrabold tabular-nums" style={{ color }}>
                        {prefix}{value}
                      </p>
                    </div>
                  ))}
                </div>
                {simMatDate && (
                  <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
                    Fecha de vencimiento: <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{fmtDate(simMatDate)}</span>
                  </p>
                )}
              </div>
            )}

            {/* CTA */}
            {safeNumber(sim.principal) > 0 && (
              <button
                onClick={() => {
                  setNewForm(f => ({
                    ...f,
                    principal: sim.principal,
                    currency:  sim.currency,
                    tna:       sim.tna,
                    term_days: sim.days,
                    start_date: sim.start_date,
                  }))
                  setActiveTab('investments')
                  setNewOpen(true)
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80"
                style={{ background: 'var(--brand-50)', color: 'var(--brand-600)', border: '1px solid var(--brand-100)' }}
              >
                <ChevronRight size={14} /> Guardar como inversión real
              </button>
            )}
          </div>

          {/* Comparador de escenarios */}
          {safeNumber(sim.principal) > 0 && safeNumber(sim.tna) > 0 && (
            <div className="rounded-2xl p-5"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <p className="text-sm font-extrabold mb-4" style={{ color: 'var(--text-primary)' }}>
                Comparador de escenarios
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Plazo', 'Interés', 'Total', 'Rendimiento'].map(h => (
                        <th key={h} className="pb-2 text-xs font-bold text-left"
                          style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...TERM_PRESETS, simDays].filter((d, i, arr) => arr.indexOf(d) === i && d > 0).sort((a, b) => a - b).map(d => {
                      const c = calcFT(safeNumber(sim.principal), safeNumber(sim.tna), d)
                      const isActive = d === simDays
                      return (
                        <tr key={d}
                          style={{
                            borderTop: '1px solid var(--border-light)',
                            background: isActive ? 'var(--bg-accent-soft)' : undefined,
                          }}>
                          <td className="py-2.5 font-semibold" style={{ color: isActive ? 'var(--brand-600)' : 'var(--text-secondary)' }}>
                            {d} días {isActive && d !== 30 && d !== 60 && d !== 90 && <span className="text-xs">(personalizado)</span>}
                          </td>
                          <td className="py-2.5 font-bold tabular-nums" style={{ color: 'var(--income-600)' }}>
                            +{formatCurrency(c.interest, sim.currency)}
                          </td>
                          <td className="py-2.5 font-extrabold tabular-nums" style={{ color: 'var(--brand-600)' }}>
                            {formatCurrency(c.total, sim.currency)}
                          </td>
                          <td className="py-2.5 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            {c.yieldPct.toFixed(2)}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════ MODAL: NUEVO PLAZO FIJO ══════════════════════════ */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Nuevo plazo fijo">
        <div className="space-y-4">
          {newError && (
            <div className="rounded-xl px-4 py-3 text-sm font-medium"
              style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}>
              {newError}
            </div>
          )}

          <Input
            label="Nombre"
            value={newForm.name}
            onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ej: PF Banco Nación junio"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Capital"
              type="number" min="0" step="0.01"
              value={newForm.principal}
              onChange={e => setNewForm(f => ({ ...f, principal: e.target.value }))}
              placeholder="100000"
              required
            />
            <Select
              label="Moneda"
              value={newForm.currency}
              onChange={e => setNewForm(f => ({ ...f, currency: e.target.value }))}
              options={CURRENCY_OPTS}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="TNA (%)"
              type="number" min="0" max="9999" step="0.1"
              value={newForm.tna}
              onChange={e => setNewForm(f => ({ ...f, tna: e.target.value }))}
              placeholder="40"
              hint="Tasa nominal anual"
              required
            />
            <Input
              label="Plazo (días)"
              type="number" min="1"
              value={newForm.term_days}
              onChange={e => setNewForm(f => ({ ...f, term_days: e.target.value }))}
              placeholder="30"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fecha de inicio"
              type="date"
              value={newForm.start_date}
              onChange={e => setNewForm(f => ({ ...f, start_date: e.target.value }))}
              required
            />
            <Input
              label="Fecha de vencimiento"
              type="date"
              value={newMaturityDate}
              readOnly
              hint="Calculada automáticamente"
            />
          </div>

          <Select
            label="Billetera de origen"
            value={newForm.wallet_id}
            onChange={e => setNewForm(f => ({ ...f, wallet_id: e.target.value }))}
            options={walletOpts}
          />
          <p className="text-xs -mt-2" style={{ color: 'var(--text-muted)' }}>El capital se descuenta de esta billetera</p>

          <Input
            label="Nota (opcional)"
            value={newForm.note}
            onChange={e => setNewForm(f => ({ ...f, note: e.target.value }))}
            placeholder="Ej: Renovación automática, tasa negociada…"
          />

          {/* Preview */}
          {showNewPreview && (
            <div className="rounded-xl p-4"
              style={{ background: 'var(--income-50)', border: '1px solid var(--income-100)' }}>
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--income-700)' }}>Vista previa del rendimiento</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: `${newTermDays} días`, value: `${newTermDays}d`, color: 'var(--text-primary)' },
                  { label: 'Interés estimado', value: '+' + formatCurrency(newCalc.interest, newForm.currency), color: 'var(--income-600)' },
                  { label: 'Total al vencer', value: formatCurrency(newCalc.total, newForm.currency), color: 'var(--brand-600)' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    <p className="font-extrabold text-sm tabular-nums" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setNewOpen(false)} className="flex-1" disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} className="flex-1" loading={saving}>
              Crear plazo fijo
            </Button>
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════ MODAL: ACCIÓN AL VENCIMIENTO ═════════════════════ */}
      <Modal
        open={!!actionItem}
        onClose={() => setActionItem(null)}
        title={actionItem ? `¿Qué hacés con "${actionItem.name}"?` : ''}
      >
        {actionItem && (
          <div className="space-y-4">
            {/* Info pill */}
            <div className="rounded-xl p-3 flex items-center justify-between"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Capital invertido</p>
                <p className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(actionItem.principal_amount, actionItem.currency)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total al vencer</p>
                <p className="text-sm font-extrabold" style={{ color: 'var(--income-600)' }}>
                  {formatCurrency(actionItem.estimated_total, actionItem.currency)}
                  <span className="text-xs ml-1" style={{ color: 'var(--income-600)' }}>
                    (+{formatCurrency(actionItem.estimated_interest, actionItem.currency)})
                  </span>
                </p>
              </div>
            </div>

            {/* Inner tabs */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
              {([['withdraw', 'Retirar', ArrowDownCircle], ['reinvest', 'Renovar', RefreshCw]] as const).map(([tab, label, Icon]) => (
                <button
                  key={tab}
                  onClick={() => { setActionTab(tab); setActionError(null) }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: actionTab === tab ? 'var(--bg-card)' : 'transparent',
                    color:      actionTab === tab ? 'var(--brand-600)' : 'var(--text-muted)',
                    boxShadow:  actionTab === tab ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            {actionError && (
              <div className="rounded-xl px-4 py-3 text-sm font-medium"
                style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}>
                {actionError}
              </div>
            )}

            {/* Withdraw form */}
            {actionTab === 'withdraw' && (
              <div className="space-y-3">
                <Select
                  label="Billetera destino"
                  value={withdrawForm.wallet_id}
                  onChange={e => setWithdrawForm(f => ({ ...f, wallet_id: e.target.value }))}
                  options={walletOpts}
                />
                <Input
                  label="Monto a retirar"
                  type="number" min="0" step="0.01"
                  value={withdrawForm.amount}
                  onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
                  hint={`Total estimado: ${formatCurrency(actionItem.estimated_total, actionItem.currency)}`}
                />
                <div className="flex gap-3 pt-1">
                  <Button variant="secondary" onClick={() => setActionItem(null)} className="flex-1" disabled={actioning}>
                    Cancelar
                  </Button>
                  <Button onClick={handleWithdraw} className="flex-1" loading={actioning}>
                    Confirmar retiro
                  </Button>
                </div>
              </div>
            )}

            {/* Reinvest form */}
            {actionTab === 'reinvest' && (
              <div className="space-y-3">
                {/* Capital mode */}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Capital a reinvertir</p>
                  <div className="flex gap-2">
                    {([
                      ['same',  `Solo capital (${formatCurrency(actionItem.principal_amount, actionItem.currency)})`],
                      ['total', `Capital + interés (${formatCurrency(actionItem.estimated_total, actionItem.currency)})`],
                    ] as const).map(([mode, label]) => (
                      <button
                        key={mode}
                        onClick={() => setReinvestForm(f => ({ ...f, capital_mode: mode }))}
                        className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all text-left"
                        style={{
                          background: reinvestForm.capital_mode === mode ? 'var(--brand-50)' : 'var(--bg-subtle)',
                          color:      reinvestForm.capital_mode === mode ? 'var(--brand-600)' : 'var(--text-muted)',
                          border:     `1px solid ${reinvestForm.capital_mode === mode ? 'var(--brand-100)' : 'var(--border)'}`,
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Nueva TNA (%)"
                    type="number" min="0" max="9999" step="0.1"
                    value={reinvestForm.tna}
                    onChange={e => setReinvestForm(f => ({ ...f, tna: e.target.value }))}
                    placeholder={String(actionItem.tna)}
                  />
                  <Input
                    label="Nuevo plazo (días)"
                    type="number" min="1"
                    value={reinvestForm.term_days}
                    onChange={e => setReinvestForm(f => ({ ...f, term_days: e.target.value }))}
                    placeholder={String(actionItem.term_days)}
                  />
                </div>

                {/* Reinvest preview */}
                {reinvestCapital > 0 && reinvestDays > 0 && (
                  <div className="rounded-xl p-3"
                    style={{ background: 'var(--income-50)', border: '1px solid var(--income-100)' }}>
                    <p className="text-xs font-bold mb-2" style={{ color: 'var(--income-700)' }}>
                      Nueva inversión: {reinvestDays} días · vence {fmtDate(reinvestNewEnd)}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: 'Capital', value: formatCurrency(reinvestCapital, actionItem.currency), color: 'var(--text-primary)' },
                        { label: 'Interés est.', value: '+' + formatCurrency(reinvestCalc.interest, actionItem.currency), color: 'var(--income-600)' },
                        { label: 'Total est.', value: formatCurrency(reinvestCalc.total, actionItem.currency), color: 'var(--brand-600)' },
                      ].map(({ label, value, color }) => (
                        <div key={label}>
                          <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                          <p className="text-sm font-extrabold tabular-nums" style={{ color }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <Button variant="secondary" onClick={() => setActionItem(null)} className="flex-1" disabled={actioning}>
                    Cancelar
                  </Button>
                  <Button onClick={handleReinvest} className="flex-1" loading={actioning}>
                    Confirmar renovación
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

// ─── DataCell helper ──────────────────────────────────────────────────────────
function DataCell({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-2.5" style={{ background: 'var(--bg-subtle)' }}>
      <p className="flex items-center gap-1 text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
        {icon} {label}
      </p>
      {children}
    </div>
  )
}
