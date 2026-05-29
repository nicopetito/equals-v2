'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, Plus,
  FileText, Sparkles, ChevronLeft, ChevronRight, BarChart2,
  Zap, RotateCcw,
} from 'lucide-react'
import { HelpButton } from '@/components/help/HelpButton'
import { useTransactions } from '@/hooks/useTransactions'
import { useWallets } from '@/hooks/useWallets'
import { useCategories } from '@/hooks/useCategories'
import { usePendingRefunds } from '@/hooks/useRefunds'
import { useTransactionTemplates } from '@/hooks/useTransactionTemplates'
import { useGoals } from '@/hooks/useGoals'
import { useFixedTerms } from '@/hooks/useFixedTerms'
import { transactionsService } from '@/services/transactions.service'
import { refundService } from '@/services/refund.service'
import { calculateRefundAmount } from '@/utils/refund'
import { EmptyState } from '@/components/ui/EmptyState'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { TypeBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ReportModal } from '@/components/ui/ReportModal'
import { useToast } from '@/components/providers/ToastProvider'
import { NewTransactionModal } from '@/components/transactions/NewTransactionModal'
import { TemplateConfirmModal } from '@/components/transactions/TemplateConfirmModal'
import { seedDemoData } from '@/utils/seed'
import { formatCurrency } from '@/utils/format'
import { calculateNetWorth, calculateSavingsMetrics } from '@/utils/finance'
import { format } from 'date-fns'
import { formatDate, getDateRangeForPeriod, PERIOD_OPTIONS, type Period } from '@/utils/date'
import type { TransactionWithDetails, Currency, TransactionTemplate } from '@/types'
import type { WalletWithBalance } from '@/types/wallet'
import { AnimatedAmount } from '@/components/ui/AnimatedAmount'

// â"€â"€ Design tokens â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Usados de forma consistente en TODOS los componentes de esta pÃ¡gina.

const CARD_SHADOW   = 'var(--shadow-sm)'
const CARD_SHADOW_H = 'var(--shadow-md)'   // on hover
const CARD_BORDER   = '1px solid var(--border)'
const TRANSITION    = 'all 0.15s ease'

function cardHoverOn(el: HTMLElement) {
  el.style.transform = 'translateY(-1px)'
  el.style.boxShadow = CARD_SHADOW_H
}
function cardHoverOff(el: HTMLElement) {
  el.style.transform = ''
  el.style.boxShadow = CARD_SHADOW
}

// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

const CURRENCIES: { value: Currency | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'CRYPTO', label: 'CRYPTO' },
]

const WALLET_COLORS: Record<string, string> = {
  ARS: '#a078ff', USD: '#16a34a', EUR: '#adc6ff', CRYPTO: '#ffb869',
}

// â"€â"€ Filter Bar â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function FilterBar({ period, setPeriod, currency, setCurrency }: {
  period: Period; setPeriod: (v: Period) => void
  currency: Currency | 'all'; setCurrency: (v: Currency | 'all') => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-1 flex-wrap">
        {PERIOD_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setPeriod(opt.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-150"
            style={period === opt.value
              ? { background: 'linear-gradient(135deg,#6d3bd7,#0566d9)', color: '#fff', boxShadow: '0 2px 8px rgba(109,59,215,0.35)' }
              : { color: 'var(--text-muted)' }}
            onMouseEnter={e => { if (period !== opt.value) e.currentTarget.style.color = 'var(--text-secondary)' }}
            onMouseLeave={e => { if (period !== opt.value) e.currentTarget.style.color = 'var(--text-muted)' }}
          >{opt.label}</button>
        ))}
      </div>
      <div className="w-px self-stretch" style={{ background: 'var(--border)' }} />
      <div className="flex items-center gap-1">
        {CURRENCIES.map(opt => (
          <button key={opt.value} onClick={() => setCurrency(opt.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-150"
            style={currency === opt.value
              ? { background: 'rgba(208,188,255,0.18)', color: 'var(--brand-500)', border: '1px solid rgba(208,188,255,0.25)' }
              : { color: 'var(--text-muted)' }}
            onMouseEnter={e => { if (currency !== opt.value) e.currentTarget.style.color = 'var(--text-secondary)' }}
            onMouseLeave={e => { if (currency !== opt.value) e.currentTarget.style.color = 'var(--text-muted)' }}
          >{opt.label}</button>
        ))}
      </div>
    </div>
  )
}

// â"€â"€ Page â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
export default function DashboardPage() {
  const [period, setPeriod]                   = useState<Period>('this_month')
  const [currency, setCurrency]               = useState<Currency | 'all'>('all')
  const [reportOpen, setReportOpen]           = useState(false)
  const [seeding, setSeeding]                 = useState(false)
  const [templateModalOpen, setTemplateModalOpen]   = useState(false)
  const [selectedTemplate, setSelectedTemplate]     = useState<TransactionTemplate | null>(null)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [newTxOpen, setNewTxOpen]                   = useState(false)
  const router = useRouter()
  const { addToast } = useToast()

  const { data: allTransactions, loading: txLoading, refetch: refetchTx }   = useTransactions()
  const { data: wallets, loading: walletsLoading, refetch: refetchWallets } = useWallets()
  const { data: categories } = useCategories()
  const { items: pendingRefunds }   = usePendingRefunds()
  const {
    items: templates,
    loading: templatesLoading,
  } = useTransactionTemplates()

  const { data: goals }       = useGoals()
  const { items: fixedTerms } = useFixedTerms()

  async function handleSeed() {
    setSeeding(true)
    try { await seedDemoData(); await refetchTx(); await refetchWallets() }
    catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar ejemplo'
      addToast(msg, 'error')
    } finally { setSeeding(false) }
  }

  async function handleUseTemplate(
    template: TransactionTemplate,
    overrides: { amount: number; wallet_id: string; date: string; category_id: string; note: string }
  ) {
    const newTx = await transactionsService.create({
      description: template.description ?? template.name,
      amount: overrides.amount,
      type: template.type,
      currency: template.currency as Currency,
      category_id: overrides.category_id || null,
      wallet_id: overrides.wallet_id || null,
      date: overrides.date,
      notes: overrides.note || null,
    })

    if (template.has_refund_rule && template.refund_rule && template.type === 'expense' && newTx?.id) {
      const rule = template.refund_rule
      const refundAmount = calculateRefundAmount(overrides.amount, rule.rule_type, rule.percentage, rule.cap_amount)
      if (refundAmount > 0 && rule.destination_wallet_id) {
        const expectedDate = new Date(overrides.date)
        expectedDate.setDate(expectedDate.getDate() + rule.expected_days)
        try {
          await refundService.create({
            original_transaction_id: newTx.id,
            destination_wallet_id: rule.destination_wallet_id,
            amount: refundAmount,
            currency: template.currency,
            rule_type: rule.rule_type,
            percentage: rule.percentage,
            cap_amount: rule.cap_amount,
            expected_date: expectedDate.toISOString().split('T')[0],
            note: rule.note,
          })
        } catch (e) {
          console.error('[handleUseTemplate] refund creation failed:', e)
        }
      }
    }

    await refetchTx()
    await refetchWallets()
    addToast('Transacción registrada', 'success')
  }

  const { start, end } = getDateRangeForPeriod(period)

  const filtered = useMemo(() => {
    const fromStr = format(start, 'yyyy-MM-dd')
    const toStr   = format(end,   'yyyy-MM-dd')
    return allTransactions.filter(t => {
      const dayStr = t.date.substring(0, 10)
      if (dayStr < fromStr || dayStr > toStr) return false
      if (currency !== 'all' && t.currency !== currency) return false
      return true
    })
  }, [allTransactions, format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'), currency])

  const stats = useMemo(() => {
    if (currency === 'all') {
      const byCurrency: Record<string, { income: number; expenses: number; balance: number }> = {}
      filtered.forEach(t => {
        if (!byCurrency[t.currency]) byCurrency[t.currency] = { income: 0, expenses: 0, balance: 0 }
        if (t.type === 'income') byCurrency[t.currency].income += t.amount
        else byCurrency[t.currency].expenses += t.amount
        byCurrency[t.currency].balance = byCurrency[t.currency].income - byCurrency[t.currency].expenses
      })
      if (!Object.keys(byCurrency).length) return { byCurrency: null, single: { income: 0, expenses: 0, balance: 0 } }
      return { byCurrency, single: null }
    }
    const income   = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { byCurrency: null, single: { income, expenses, balance: income - expenses } }
  }, [filtered, currency])

  const savingsMetrics = useMemo(() => calculateSavingsMetrics(filtered), [filtered])
  const savingsRate    = savingsMetrics.savingsRate

  const walletByCurrency = useMemo(() =>
    wallets.reduce<Record<string, number>>((acc, w) => {
      if (w.currency) acc[w.currency] = (acc[w.currency] ?? 0) + (w.current_balance ?? 0)
      return acc
    }, {}), [wallets])

  const netWorth = useMemo(
    () => calculateNetWorth(wallets, goals, fixedTerms),
    [wallets, goals, fixedTerms]
  )
  const hasNonLiquid = Object.values(netWorth).some(v => v.goals > 0 || v.investments > 0)

  const recentTx = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4),
    [filtered])

  const loading = txLoading || walletsLoading

  const summaryRows = stats.byCurrency
    ? Object.entries(stats.byCurrency).map(([curr, data]) => ({ curr, ...data }))
    : stats.single
    ? [{ curr: currency === 'all' ? 'ARS' : currency, ...stats.single }]
    : []

  const activeCurr = currency === 'all' ? 'ARS' : currency

  return (
    <div className="p-5 md:p-7 max-w-5xl mx-auto space-y-4">

      {/* â"€â"€ HEADER â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <div className="enter-1 hero-animated rounded-3xl px-6 py-5 flex items-center justify-between gap-4 relative overflow-hidden"
        style={{ boxShadow: '0 12px 32px -8px rgba(109,59,215,0.45), 0 0 60px rgba(109,59,215,0.12)' }}>
        <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none opacity-10">
          <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1000 100">
            <path d="M0,80 Q150,20 300,70 T600,40 T900,10 L1000,10 L1000,100 L0,100 Z" fill="white"/>
          </svg>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.20)' }}>
            <TrendingUp size={17} className="text-white" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-white" style={{ fontFamily: 'var(--font-sora)', letterSpacing: '-0.02em' }}>
              Tus finanzas
            </p>
            <p className="text-[11px] text-white/55 mt-0.5">Resumen del período</p>
          </div>
        </div>
        <div className="relative z-10 flex gap-2 shrink-0 flex-wrap justify-end">
          <HelpButton section="dashboard" />
          <button onClick={() => setReportOpen(true)}
            className="hidden sm:flex hero-btn hero-btn-secondary">
            <FileText size={14} /> Exportar
          </button>
          <button
            onClick={() => setTemplatePickerOpen(true)}
            className="hidden sm:flex hero-btn hero-btn-secondary">
            <Zap size={14} /> Transacción rápida
          </button>
          <button onClick={() => setNewTxOpen(true)}
            className="hero-btn hero-btn-primary">
            <Plus size={15} /> Nueva transacción
          </button>
        </div>
      </div>

      {/* â"€â"€ FILTROS â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <div className="enter-2"><FilterBar period={period} setPeriod={setPeriod} currency={currency} setCurrency={v => setCurrency(v as Currency | 'all')} /></div>

      {/* â"€â"€ BANNER DEMO â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      {allTransactions.length === 0 && wallets.length === 0 && !loading && (
        <div className="glass-card rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ boxShadow: CARD_SHADOW }}>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--brand-500)' }}>Tu cuenta está vacía</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Cargá datos de ejemplo para explorar el dashboard.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={handleSeed} loading={seeding}>
            <Sparkles size={14} /> {seeding ? 'Cargando...' : 'Cargar ejemplo'}
          </Button>
        </div>
      )}
      {/* â"€â"€ BALANCE TOTAL + KPIs â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <div className="enter-3">
      {loading ? (
        <div className="space-y-3">
          <div className="rounded-3xl animate-shimmer" style={{ height: 56, border: CARD_BORDER }} />
          <div className="grid grid-cols-3 gap-3">
            {[0,1,2].map(i => <div key={i} className="rounded-2xl animate-shimmer" style={{ height: 88, border: CARD_BORDER }} />)}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Balance total â€" idÃ©ntico al header */}
          {Object.keys(walletByCurrency).length > 0 && (
            <div className="rounded-3xl px-5 py-4 flex flex-wrap items-center gap-3 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)',
                boxShadow: '0 12px 32px -8px rgba(109,59,215,0.45)',
              }}>
              <div className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none opacity-10">
                <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1000 100">
                  <path d="M0,80 Q150,20 300,70 T600,40 T900,10 L1000,10 L1000,100 L0,100 Z" fill="white"/>
                </svg>
              </div>
              <div className="relative z-10 flex items-center gap-2 shrink-0">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.20)' }}>
                  <Wallet size={11} className="text-white" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Balance disponible</span>
              </div>
              <div className="relative z-10 flex flex-wrap gap-2 flex-1">
                {Object.entries(walletByCurrency).map(([curr, bal]) => (
                  <div key={curr} className="flex items-center gap-2 rounded-xl px-3 py-1.5"
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.80)' }}>
                      {curr}
                    </span>
                    <AnimatedAmount value={bal} currency={curr}
                      className="text-sm font-extrabold tabular-nums text-white"
                      style={{ fontFamily: 'var(--font-sora)', letterSpacing: '-0.01em' }} />
                  </div>
                ))}
              </div>
              {savingsRate !== null && (
                <div className="relative z-10 shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5"
                  style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <TrendingUp size={11} style={{ color: savingsRate >= 20 ? 'var(--income-500)' : savingsRate >= 0 ? '#d97706' : 'var(--expense-500)' }} />
                  <span className="text-xs font-bold"
                    style={{ color: savingsRate >= 20 ? 'var(--income-500)' : savingsRate >= 0 ? '#d97706' : 'var(--expense-500)' }}>
                    {savingsRate}%
                  </span>
                  <span className="text-[10px] text-white/50">ahorro</span>
                </div>
              )}
              {hasNonLiquid && (
                <div className="w-full relative z-10 mt-1 pt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Patrimonio</span>
                  {Object.entries(netWorth).map(([curr, breakdown]) => (
                    <div key={curr} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded"
                        style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)' }}>
                        {curr}
                      </span>
                      <AnimatedAmount value={breakdown.total} currency={curr}
                        className="text-xs font-extrabold tabular-nums"
                        style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-sora)', letterSpacing: '-0.01em' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* KPIs */}
          {summaryRows.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <KpiCard label="Ingresos"     icon={TrendingUp}   accent="var(--income-500)" rows={summaryRows.map(r => ({ curr: r.curr, value: r.income }))} />
              <KpiCard label="Gastos"       icon={TrendingDown}  accent="var(--expense-500)" rows={summaryRows.map(r => ({ curr: r.curr, value: r.expenses }))} />
              <KpiCard label="Balance neto" icon={Wallet}        accent="var(--brand-500)" rows={summaryRows.map(r => ({ curr: r.curr, value: r.balance, signed: true }))} />
            </div>
          )}

          {/* Sin datos en período */}
          {!loading && allTransactions.length > 0 && filtered.length === 0 && (
            <div className="rounded-2xl px-4 py-3 text-center"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Sin movimientos en este período.{' '}
                <button
                  onClick={() => setPeriod('this_year')}
                  className="font-semibold hover:underline"
                  style={{ color: 'var(--brand-500)' }}>
                  Ver este año
                </button>
              </p>
            </div>
          )}
        </div>
      )}
      </div>

      {/* â"€â"€ BILLETERAS â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      {/* ── REINTEGROS PENDIENTES ── */}
      {!loading && pendingRefunds.length > 0 && (
        <div
          className="glass-card rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
          style={{ boxShadow: CARD_SHADOW, border: CARD_BORDER }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.18)' }}>
              <RotateCcw size={14} style={{ color: '#10b981' }} />
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                Reintegros esperados
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {pendingRefunds.length} pendiente{pendingRefunds.length > 1 ? 's' : ''} ·{' '}
                +{formatCurrency(pendingRefunds.reduce((s, r) => s + r.amount, 0), pendingRefunds[0]?.currency ?? 'ARS')}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/transactions')}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shrink-0"
            style={{ color: 'var(--brand-500)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-50)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Ver todos
          </button>
        </div>
      )}

      <div className="enter-4">
      {!loading && wallets.length > 0 && (
        <WalletSlider wallets={wallets} onNavigate={() => router.push('/wallets')} />
      )}
      </div>

      {/* ── ACCESO RÁPIDO (Plantillas) ── */}
      <QuickTemplatesBar
        templates={templates.filter(t => t.is_active)}
        loading={templatesLoading}
        onSelectTemplate={t => { setSelectedTemplate(t); setTemplateModalOpen(true) }}
        onNavigateCreate={() => router.push('/quick-transactions')}
        onNavigateManage={() => router.push('/quick-transactions')}
      />

      <TemplateConfirmModal
        open={templateModalOpen}
        template={selectedTemplate}
        wallets={wallets}
        categories={categories}
        onClose={() => { setTemplateModalOpen(false); setSelectedTemplate(null) }}
        onConfirm={overrides => handleUseTemplate(selectedTemplate!, overrides)}
      />

      <TemplatePickerModal
        open={templatePickerOpen}
        templates={templates.filter(t => t.is_active)}
        onSelect={t => { setTemplatePickerOpen(false); setSelectedTemplate(t); setTemplateModalOpen(true) }}
        onClose={() => setTemplatePickerOpen(false)}
        onNavigateCreate={() => { setTemplatePickerOpen(false); router.push('/quick-transactions') }}
      />

      <NewTransactionModal
        open={newTxOpen}
        wallets={wallets}
        categories={categories}
        onClose={() => setNewTxOpen(false)}
        onSaved={() => { refetchTx(); refetchWallets() }}
      />



      {/* â"€â"€ RESUMEN POR CATEGORÃA â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <div className="enter-5">
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickCategoryBreakdown transactions={filtered} type="expense" currency={activeCurr} />
          <QuickCategoryBreakdown transactions={filtered} type="income"  currency={activeCurr} />
        </div>
      )}
      </div>

      {/* â"€â"€ ÃšLTIMAS TRANSACCIONES â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <div className="enter-6 glass-card rounded-2xl overflow-hidden" style={{ boxShadow: CARD_SHADOW, border: CARD_BORDER }}>
        <div className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid var(--border-light)' }}>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Últimas transacciones
          </span>
          <button onClick={() => router.push('/transactions')}
            className="text-xs font-semibold flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all"
            style={{ color: 'var(--brand-500)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-50)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            Ver todas <ArrowUpRight size={12} />
          </button>
        </div>
        {recentTx.length === 0
          ? <EmptyState title="Sin transacciones" description="No hay movimientos en este período." />
          : <div>{recentTx.map((tx, i) => <TxRow key={tx.id} tx={tx} index={i} last={i === recentTx.length - 1} />)}</div>
        }
      </div>

      {/* â"€â"€ CTA ESTADÃSTICAS â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <button onClick={() => router.push('/estadisticas')}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-semibold uppercase tracking-wider transition-all"
        style={{ background: 'var(--bg-subtle)', border: '1px dashed var(--border)', color: 'var(--text-faint)' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(173,198,255,0.28)'; e.currentTarget.style.color = 'var(--brand-500)'; e.currentTarget.style.background = 'rgba(173,198,255,0.04)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}>
        <BarChart2 size={13} /> Ver estadísticas detalladas
      </button>

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)}
        transactions={filtered} period={PERIOD_OPTIONS.find(p => p.value === period)?.label ?? period} currency={currency} />
    </div>
  )
}

// â"€â"€ KPI Card â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function KpiCard({ label, icon: Icon, accent, rows }: {
  label: string; icon: React.ElementType; accent: string
  rows: { curr: string; value: number; signed?: boolean }[]
}) {
  return (
    <div className="glass-card rounded-2xl p-4 cursor-default"
      style={{ boxShadow: CARD_SHADOW, border: CARD_BORDER, transition: TRANSITION }}
      onMouseEnter={e => cardHoverOn(e.currentTarget as HTMLElement)}
      onMouseLeave={e => cardHoverOff(e.currentTarget as HTMLElement)}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-subtle)' }}>
          <Icon size={13} style={{ color: accent }} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <div className="space-y-1.5">
        {rows.map(({ curr, value, signed }) => {
          const signedPos = signed && value >= 0
          const signedNeg = signed && value < 0
          const rowColor = signedPos ? 'var(--income-500)' : signedNeg ? 'var(--expense-500)' : accent
          return (
            <div key={curr} className="flex items-center justify-between">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>{curr}</span>
              <span className="text-sm font-bold tabular-nums flex items-center"
                style={{ color: rowColor, fontFamily: 'var(--font-sora)' }}>
                {signedNeg && <span>-</span>}
                <AnimatedAmount value={Math.abs(value)} currency={curr} duration={900} />
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// â"€â"€ Wallet Slider â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Card compacta horizontal dentro de un contenedor glass consistente.

function WalletSlider({ wallets, onNavigate }: { wallets: WalletWithBalance[]; onNavigate: () => void }) {
  const [idx, setIdx] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const total = wallets.length + 1

  const prev = () => setIdx(i => Math.max(0, i - 1))
  const next = () => setIdx(i => Math.min(total - 1, i + 1))

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return
    const delta = touchStart - e.changedTouches[0].clientX
    if (delta > 48) next()
    else if (delta < -48) prev()
    setTouchStart(null)
  }

  const w     = wallets[idx]
  const color = w ? (WALLET_COLORS[w.currency ?? ''] ?? '#a078ff') : '#a078ff'
  const bal   = w ? (w.current_balance ?? 0) : 0

  return (
    <div className="glass-card rounded-2xl p-3.5 space-y-2.5"
      style={{ boxShadow: CARD_SHADOW, border: CARD_BORDER }}>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Billetera
        </span>
        <div className="flex items-center gap-1.5">
          <button onClick={prev} disabled={idx === 0}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-all disabled:opacity-25"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <ChevronLeft size={12} />
          </button>
          <button onClick={next} disabled={idx === total - 1}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-all disabled:opacity-25"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <ChevronRight size={12} />
          </button>
          <button onClick={onNavigate}
            className="text-xs font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ml-0.5"
            style={{ color: 'var(--brand-500)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-50)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            Ver todas <ArrowUpRight size={11} />
          </button>
        </div>
      </div>

      {/* Wallet card â€" compacta horizontal */}
      <div onTouchStart={e => setTouchStart(e.touches[0].clientX)} onTouchEnd={handleTouchEnd}>
        {w ? (
          <div className="flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 cursor-pointer glass-card"
            style={{ transition: TRANSITION }}
            onClick={onNavigate}
            onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-1px)'; el.style.boxShadow = 'var(--shadow-md)'; el.style.borderColor = `${color}40` }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.transform = ''; el.style.boxShadow = 'var(--shadow-sm)'; el.style.borderColor = 'var(--border)' }}>
            {/* Ãcono + moneda */}
            <div className="shrink-0 flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-subtle)' }}>
                <Wallet size={15} style={{ color }} />
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--bg-subtle)', color }}>{w.currency}</span>
            </div>
            {/* Nombre */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{w.name}</p>
              {w.transaction_count != null && (
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {w.transaction_count} movimientos
                </p>
              )}
            </div>
            {/* Balance */}
            <div className="shrink-0 text-right">
              <AnimatedAmount value={bal} currency={w.currency ?? 'ARS'} duration={750}
                className="text-base font-semibold tabular-nums leading-tight block"
                style={{ color: bal >= 0 ? 'var(--income-500)' : 'var(--expense-500)', fontFamily: 'var(--font-sora)', letterSpacing: '-0.02em' }} />
            </div>
          </div>
        ) : (
          <button onClick={onNavigate}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3.5 transition-all"
            style={{ background: 'var(--bg-subtle)', border: '1px dashed var(--border)', transition: TRANSITION }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}30`; e.currentTarget.style.background = `${color}05` }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-subtle)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-100)' }}>
              <Plus size={13} style={{ color: 'var(--brand-500)' }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Agregar billetera</span>
          </button>
        )}
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className="rounded-full transition-all duration-200"
            style={{ width: i === idx ? 18 : 5, height: 5, background: i === idx ? 'var(--brand-500)' : 'var(--border)' }} />
        ))}
      </div>
    </div>
  )
}

// â"€â"€ Quick Category Breakdown â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function QuickCategoryBreakdown({ transactions, type, currency }: {
  transactions: TransactionWithDetails[]; type: 'expense' | 'income'; currency: string
}) {
  const relevant = transactions.filter(t => t.type === type)
  const total    = relevant.reduce((s, t) => s + t.amount, 0)

  const byCategory = useMemo(() => {
    const map: Record<string, { amount: number; color: string }> = {}
    relevant.forEach(t => {
      const name = t.category_name ?? 'Sin categoría'
      if (!map[name]) map[name] = { amount: 0, color: t.category_color ?? (type === 'expense' ? 'var(--expense-500)' : 'var(--income-500)') }
      map[name].amount += t.amount
    })
    return Object.entries(map).sort(([,a],[,b]) => b.amount - a.amount).slice(0, 4)
  }, [relevant, type])

  if (total === 0 || byCategory.length === 0) return null

  const accent = type === 'expense' ? 'var(--expense-500)' : 'var(--income-500)'
  const Icon   = type === 'expense' ? TrendingDown : TrendingUp
  const label  = type === 'expense' ? 'Gastos' : 'Ingresos'

  return (
    <div className="glass-card rounded-2xl p-4"
      style={{ boxShadow: CARD_SHADOW, border: CARD_BORDER, transition: TRANSITION }}
      onMouseEnter={e => cardHoverOn(e.currentTarget as HTMLElement)}
      onMouseLeave={e => cardHoverOff(e.currentTarget as HTMLElement)}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${accent}14` }}>
          <Icon size={11} style={{ color: accent }} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {label} por categoría
        </span>
        <span className="ml-auto text-[10px] font-semibold" style={{ color: 'var(--text-faint)' }}>
          {formatCurrency(total, currency)}
        </span>
      </div>
      <div className="space-y-2.5">
        {byCategory.map(([name, data]) => {
          const pct = total > 0 ? (data.amount / total) * 100 : 0
          return (
            <div key={name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: data.color }} />
                  <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{name}</span>
                </div>
                <span className="text-xs font-bold tabular-nums ml-2 shrink-0"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
                  {pct.toFixed(0)}%
                </span>
              </div>
              <div className="h-1 rounded-full" style={{ background: 'var(--border-light)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: data.color, opacity: 0.80 }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// â"€â"€ Transaction Row â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

// ── Quick Templates Bar ──────────────────────────────────────────────────────

function QuickTemplatesBar({
  templates,
  loading,
  onSelectTemplate,
  onNavigateCreate,
  onNavigateManage,
}: {
  templates: TransactionTemplate[]
  loading: boolean
  onSelectTemplate: (t: TransactionTemplate) => void
  onNavigateCreate: () => void
  onNavigateManage: () => void
}) {
  if (loading) return (
    <div className="glass-card rounded-2xl p-4" style={{ boxShadow: CARD_SHADOW, border: CARD_BORDER }}>
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {[1, 2, 3].map(i => (
          <div key={i} className="shrink-0 rounded-2xl animate-shimmer"
            style={{ width: 110, height: 60, background: 'var(--bg-subtle)', border: CARD_BORDER }} />
        ))}
      </div>
    </div>
  )

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3"
      style={{ boxShadow: CARD_SHADOW, border: CARD_BORDER }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--brand-50)' }}>
            <Zap size={11} style={{ color: 'var(--brand-500)' }} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Acceso rápido
          </span>
        </div>
        <button
          onClick={onNavigateManage}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all"
          style={{ color: 'var(--brand-500)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-50)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          Gestionar
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-3"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            No tenés plantillas activas todavía.
          </p>
          <button
            onClick={onNavigateCreate}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white shrink-0 transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#6d3bd7,#0566d9)' }}
          >
            Crear plantilla
          </button>
        </div>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {templates.map(t => {
            const accentColor = t.color ?? (t.type === 'income' ? 'var(--income-500)' : 'var(--expense-500)')
            return (
              <button
                key={t.id}
                onClick={() => onSelectTemplate(t)}
                className="shrink-0 flex flex-col gap-1.5 rounded-2xl overflow-hidden transition-all"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-xs)',
                  minWidth: 108,
                  paddingTop: 10,
                  paddingBottom: 10,
                  paddingLeft: 12,
                  paddingRight: 12,
                  transition: TRANSITION,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = accentColor }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                {/* Icon row */}
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">
                    {t.icon ?? (t.type === 'income' ? '↑' : '↓')}
                  </span>
                  <p className="text-xs font-bold leading-tight text-left truncate max-w-[72px]"
                    style={{ color: 'var(--text-primary)' }}>
                    {t.name}
                  </p>
                </div>
                {/* Amount */}
                {t.suggested_amount != null ? (
                  <p className="text-[11px] font-semibold tabular-nums text-left"
                    style={{ color: t.type === 'income' ? 'var(--income-500)' : 'var(--expense-500)' }}>
                    {t.type === 'income' ? '+' : '−'}{formatCurrency(t.suggested_amount, t.currency)}
                  </p>
                ) : (
                  <p className="text-[10px] text-left" style={{ color: 'var(--text-faint)' }}>
                    {t.type === 'income' ? 'Ingreso' : 'Gasto'}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Template Picker Modal ─────────────────────────────────────────────────────

function TemplatePickerModal({
  open, templates, onSelect, onClose, onNavigateCreate,
}: {
  open: boolean
  templates: TransactionTemplate[]
  onSelect: (t: TransactionTemplate) => void
  onClose: () => void
  onNavigateCreate: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Transacción rápida" size="sm">
      {templates.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-100)' }}>
            <Zap size={20} style={{ color: 'var(--brand-400)' }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Todavía no tenés plantillas
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Creá plantillas para registrar tus gastos frecuentes en un click.
            </p>
          </div>
          <button
            onClick={() => { onClose(); onNavigateCreate() }}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'var(--grad-brand)', color: 'white', boxShadow: '0 4px 12px rgba(109,59,215,0.30)' }}
          >
            Crear plantilla
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => { onSelect(t); onClose() }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = t.color ?? 'var(--brand-200)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <span className="text-xl shrink-0">{t.icon ?? (t.type === 'income' ? '↑' : '↓')}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                {t.suggested_amount != null && (
                  <p className="text-xs tabular-nums"
                    style={{ color: t.type === 'income' ? 'var(--income-600)' : 'var(--expense-600)' }}>
                    {t.type === 'income' ? '+' : '−'}{formatCurrency(t.suggested_amount, t.currency)}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ── Transaction Row ───────────────────────────────────────────────────────────

function TxRow({ tx, last }: { tx: TransactionWithDetails; index: number; last: boolean }) {
  const isIncome = tx.type === 'income'
  return (
    <div className="flex items-center gap-3 px-5 py-3 transition-all cursor-default"
      style={{ borderBottom: last ? 'none' : '1px solid var(--border-light)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: isIncome ? 'rgba(78,222,163,0.10)' : 'rgba(255,180,171,0.10)' }}>
        {isIncome
          ? <TrendingUp size={13} style={{ color: 'var(--income-500)' }} />
          : <TrendingDown size={13} style={{ color: 'var(--expense-500)' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{tx.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{formatDate(tx.date)}</span>
          {tx.category_name && <CategoryBadge name={tx.category_name} color={tx.category_color} />}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold tabular-nums"
          style={{ color: isIncome ? 'var(--income-500)' : 'var(--expense-500)', fontFamily: 'var(--font-sora)' }}>
          {isIncome ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
        </p>
        <TypeBadge type={tx.type} />
      </div>
    </div>
  )
}







