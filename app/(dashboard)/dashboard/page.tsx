'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, Plus,
  FileText, Sparkles, ChevronLeft, ChevronRight, BarChart2,
  Zap, RotateCcw, AlertTriangle, Tag, ChevronDown, Clock, Archive, Info,
} from 'lucide-react'
import { HelpButton } from '@/components/help/HelpButton'
import { useTransactions } from '@/hooks/useTransactions'
import { useWallets } from '@/hooks/useWallets'
import { useCategories } from '@/hooks/useCategories'
import { usePendingRefunds } from '@/hooks/useRefunds'
import { usePendingPaymentsSummary } from '@/hooks/usePendingPayments'
import { useTransactionTemplates } from '@/hooks/useTransactionTemplates'
import { useGoals } from '@/hooks/useGoals'
import { useFixedTerms } from '@/hooks/useFixedTerms'
import { useReservations } from '@/hooks/useReservations'
import { useDollar } from '@/hooks/useDollar'
import { transactionsService } from '@/services/transactions.service'
import { refundService } from '@/services/refund.service'
import { calculateRefundAmount } from '@/utils/refund'
import { EmptyState } from '@/components/ui/EmptyState'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { TypeBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import dynamic from 'next/dynamic'
const ReportModal = dynamic(
  () => import('@/components/ui/ReportModal').then(m => ({ default: m.ReportModal })),
  { ssr: false, loading: () => null }
)
import { useToast } from '@/components/providers/ToastProvider'
import { NewTransactionModal } from '@/components/transactions/NewTransactionModal'
import { TemplateConfirmModal } from '@/components/transactions/TemplateConfirmModal'
import { seedDemoData } from '@/utils/seed'
import { formatCurrency, plural } from '@/utils/format'
import { calculateNetWorth, calculateSavingsMetrics, calculateYieldForPeriod } from '@/utils/finance'
import { INTERNAL_LABELS, INITIAL_BALANCE_LABEL, REAL_TRANSACTION_KINDS } from '@/utils/constants'
import { YieldBanner } from '@/components/ui/YieldBanner'
import { useYieldCalculator } from '@/hooks/useYieldCalculator'
import { format } from 'date-fns'
import { formatDateSmart, getDateRangeForPeriod, PERIOD_OPTIONS, type Period } from '@/utils/date'
import type { TransactionWithDetails, Currency, TransactionTemplate } from '@/types'
import type { WalletWithBalance } from '@/types/wallet'
import { AnimatedAmount } from '@/components/ui/AnimatedAmount'
import { DashboardFilters } from '@/components/dashboard/DashboardFilters'
import { motion, AnimatePresence } from 'motion/react'
import { staggerContainer, staggerItem, fadeUp } from '@/utils/animations'
import { getErrorMessage } from '@/utils/errors'

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

const WALLET_COLORS: Record<string, string> = {
  ARS: '#a078ff', USD: '#16a34a', EUR: '#adc6ff', CRYPTO: '#ffb869',
}

// â"€â"€ Page â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
export default function DashboardPage() {
  const [period, setPeriod]                   = useState<Period>('this_month')
  const [alertsOpen, setAlertsOpen]           = useState(true)
  const [currency, setCurrency]               = useState<Currency | 'all'>('all')
  const [reportOpen, setReportOpen]           = useState(false)
  const [seeding, setSeeding]                 = useState(false)
  const [templateModalOpen, setTemplateModalOpen]   = useState(false)
  const [selectedTemplate, setSelectedTemplate]     = useState<TransactionTemplate | null>(null)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [newTxOpen, setNewTxOpen]                   = useState(false)
  const router = useRouter()
  const { addToast } = useToast()
  const { calculatePendingYields, formatYieldToast } = useYieldCalculator()
  const hasCalculatedYields = useRef(false)

  const fromStr = useMemo(() => format(getDateRangeForPeriod(period).start, 'yyyy-MM-dd'), [period])
  const toStr   = useMemo(() => format(getDateRangeForPeriod(period).end,   'yyyy-MM-dd'), [period])

  const { data: allTransactions, loading: txLoading, refetch: refetchTx } = useTransactions({ from: fromStr, to: toStr })
  const { data: wallets, loading: walletsLoading, refetch: refetchWallets } = useWallets()
  const { data: categories } = useCategories()
  const { items: pendingRefunds }   = usePendingRefunds()
  const {
    items: templates,
    loading: templatesLoading,
  } = useTransactionTemplates()

  const { data: goals }        = useGoals()
  const { items: fixedTerms }  = useFixedTerms()
  const { data: reservations } = useReservations()
  const { summary: pendingSummary, loading: pendingLoading } = usePendingPaymentsSummary()
  const { data: dollarRates }  = useDollar(300_000)

  // Auto-cálculo de rendimientos al cargar el dashboard (idempotente por RPC)
  useEffect(() => {
    if (!wallets.length || hasCalculatedYields.current) return
    hasCalculatedYields.current = true
    calculatePendingYields(wallets).then(results => {
      results.forEach(r => addToast(formatYieldToast(r), 'success'))
      if (results.length > 0) { refetchTx(); refetchWallets() }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets.length])

  async function handleSeed() {
    setSeeding(true)
    try { await seedDemoData(); await refetchTx(); await refetchWallets() }
    catch (e) {
      const msg = getErrorMessage(e, 'Error al cargar ejemplo')
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

  const filtered = useMemo(() => {
    if (currency === 'all') return allTransactions
    return allTransactions.filter(t => t.currency === currency)
  }, [allTransactions, currency])

  // walletIds antes de los KPIs para poder excluir huérfanas de los cálculos
  const walletIds = useMemo(() => new Set(wallets.map(w => w.id).filter(Boolean) as string[]), [wallets])

  // Transacciones del período que tienen billetera válida — base para los KPIs financieros.
  // Las huérfanas se muestran en el banner de alertas pero no distorsionan los números.
  const kpiFiltered = useMemo(() =>
    filtered.filter(t => !!(t.wallet_id && walletIds.has(t.wallet_id))),
    [filtered, walletIds])

  // Excluir movimientos internos de los KPIs (transfers, ajustes, reservas, saldo inicial).
  // Usa transaction_kind cuando está disponible (post-migration 037), cae en label para legacy.
  const kpiFilteredClean = useMemo(
    () => kpiFiltered.filter(t => {
      if (t.transaction_kind) return REAL_TRANSACTION_KINDS.has(t.transaction_kind) || t.transaction_kind === 'yield'
      return !(t.label && INTERNAL_LABELS.has(t.label))
    }),
    [kpiFiltered]
  )

  // Para métricas de comportamiento (tasa de ahorro): excluye además saldo inicial y yield.
  // Detecta tanto transacciones nuevas (por transaction_kind) como históricas (por label/category_name).
  const kpiFilteredForMetrics = useMemo(
    () => kpiFilteredClean.filter(t => {
      if (t.transaction_kind) return t.transaction_kind !== 'yield' && t.transaction_kind !== 'initial_balance'
      return t.label !== INITIAL_BALANCE_LABEL && t.category_name !== 'Saldo inicial'
    }),
    [kpiFilteredClean]
  )

  const saldoInicialRows = useMemo(() => {
    const map: Record<string, number> = {}
    // Filtrar desde kpiFiltered (pre-INTERNAL_LABELS) porque initial_balance
    // ya está en INTERNAL_LABELS y no llegaría a kpiFilteredClean.
    kpiFiltered
      .filter(t =>
        (t.transaction_kind === 'initial_balance' ||
         t.label === INITIAL_BALANCE_LABEL ||
         t.category_name === 'Saldo inicial') &&
        t.type === 'income'
      )
      .forEach(t => { map[t.currency] = (map[t.currency] ?? 0) + t.amount })
    return Object.entries(map).map(([curr, amount]) => ({ curr, amount }))
  }, [kpiFiltered])

  const stats = useMemo(() => {
    if (currency === 'all') {
      const byCurrency: Record<string, { income: number; expenses: number; balance: number }> = {}
      kpiFilteredClean.forEach(t => {
        if (!byCurrency[t.currency]) byCurrency[t.currency] = { income: 0, expenses: 0, balance: 0 }
        if (t.type === 'income') byCurrency[t.currency].income += t.amount
        else byCurrency[t.currency].expenses += t.amount
        byCurrency[t.currency].balance = byCurrency[t.currency].income - byCurrency[t.currency].expenses
      })
      if (!Object.keys(byCurrency).length) return { byCurrency: null, single: { income: 0, expenses: 0, balance: 0 } }
      return { byCurrency, single: null }
    }
    const income   = kpiFilteredClean.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = kpiFilteredClean.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { byCurrency: null, single: { income, expenses, balance: income - expenses } }
  }, [kpiFilteredClean, currency])

  const savingsMetrics = useMemo(() => calculateSavingsMetrics(kpiFilteredForMetrics), [kpiFilteredForMetrics])
  const savingsRate    = savingsMetrics.savingsRate

  const yieldTotal = useMemo(() => calculateYieldForPeriod(kpiFilteredClean), [kpiFilteredClean])

  const yieldRows = useMemo(() => {
    const byCurrency: Record<string, number> = {}
    kpiFilteredClean.filter(tx => tx.subtype === 'yield').forEach(tx => {
      byCurrency[tx.currency] = (byCurrency[tx.currency] ?? 0) + tx.amount
    })
    return Object.entries(byCurrency).map(([curr, value]) => ({ curr, value }))
  }, [kpiFilteredClean])

  const internalCount = useMemo(
    () => kpiFiltered.length - kpiFilteredClean.length,
    [kpiFiltered, kpiFilteredClean]
  )

  const walletByCurrency = useMemo(() =>
    wallets.reduce<Record<string, number>>((acc, w) => {
      if (w.currency) acc[w.currency] = (acc[w.currency] ?? 0) + (w.current_balance ?? 0)
      return acc
    }, {}), [wallets])

  const usdEquivARS = useMemo(() => {
    const usdBal = walletByCurrency['USD'] ?? 0
    if (!usdBal) return null
    const blue = dollarRates.find(r => r.currency === 'Blue')
    if (!blue?.sell) return null
    return usdBal * blue.sell
  }, [walletByCurrency, dollarRates])

  const orphanStats = useMemo(() => {
    if (txLoading || walletsLoading) return null
    const orphans = allTransactions.filter(t => !t.wallet_id || !walletIds.has(t.wallet_id))
    if (!orphans.length) return null
    const income   = orphans.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = orphans.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { count: orphans.length, income, expenses }
  }, [allTransactions, walletIds, txLoading, walletsLoading])

  const uncategorizedStats = useMemo(() => {
    if (txLoading) return null
    const count = allTransactions.filter(t => {
      if (t.category_id) return false
      if (t.transaction_kind) return REAL_TRANSACTION_KINDS.has(t.transaction_kind)
      return !(t.label && INTERNAL_LABELS.has(t.label)) && t.label !== INITIAL_BALANCE_LABEL
    }).length
    return count > 0 ? { count } : null
  }, [allTransactions, txLoading])

  const netWorth = useMemo(
    () => calculateNetWorth(wallets, goals, fixedTerms, reservations),
    [wallets, goals, fixedTerms, reservations]
  )
  const hasNonLiquid = Object.values(netWorth).some(v => v.goals > 0 || v.investments > 0 || v.reserved > 0)

  // Totales de reservas por moneda para mostrar en el balance card
  const reservedByCurrency = useMemo(
    () => reservations.reduce<Record<string, number>>((acc, r) => {
      if (r.status === 'active' && r.amount > 0) {
        acc[r.currency] = (acc[r.currency] ?? 0) + r.amount
      }
      return acc
    }, {}),
    [reservations]
  )

  const recentTx = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
    [filtered])

  const loading = txLoading || walletsLoading

  const summaryRows = stats.byCurrency
    ? Object.entries(stats.byCurrency).map(([curr, data]) => ({ curr, ...data }))
    : stats.single
    ? [{ curr: currency === 'all' ? 'ARS' : currency, ...stats.single }]
    : []

  const activeCurr = currency === 'all' ? 'ARS' : currency

  return (
    <div className="p-5 md:p-7 max-w-5xl mx-auto space-y-4 animate-fade-in">

      {wallets.length > 0 && (
        <YieldBanner onConfigure={() => router.push('/wallets')} />
      )}

      {/* â"€â"€ HEADER â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <div className="enter-1 hero-animated rounded-3xl px-4 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative overflow-hidden"
        style={{ boxShadow: '0 12px 32px -8px rgba(109,59,215,0.45), 0 0 60px rgba(109,59,215,0.12)' }}>
        <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none opacity-10">
          <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1000 100">
            <path d="M0,80 Q150,20 300,70 T600,40 T900,10 L1000,10 L1000,100 L0,100 Z" fill="white"/>
          </svg>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
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
        <div className="relative z-10 flex gap-2 flex-wrap">
          <HelpButton section="dashboard" />
          <button onClick={() => setReportOpen(true)}
            className="hero-btn hero-btn-secondary">
            <FileText size={14} /> <span className="hidden sm:inline">Exportar</span>
          </button>
          <button
            onClick={() => setTemplatePickerOpen(true)}
            className="hero-btn hero-btn-secondary">
            <Zap size={14} /> <span className="hidden sm:inline">Transacción rápida</span>
          </button>
          <button onClick={() => setNewTxOpen(true)}
            className="hero-btn hero-btn-primary">
            <Plus size={15} /> Nueva transacción
          </button>
        </div>
      </div>

      {/* â"€â"€ FILTROS â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <div className="enter-2">
        <DashboardFilters
          selectedPeriod={period}
          onPeriodChange={setPeriod}
          selectedCurrency={currency}
          onCurrencyChange={v => setCurrency(v as Currency | 'all')}
        />
      </div>

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

      {/* Panel de alertas (acordeón) */}
      <AnimatePresence>
      {(orphanStats || uncategorizedStats) && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          {/* Header colapsable */}
          <button
            onClick={() => setAlertsOpen(v => !v)}
            className="w-full flex items-center gap-2.5 px-4 py-3 transition-colors"
            style={{ borderBottom: alertsOpen ? '1px solid var(--border-light)' : 'none' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--expense-50)', border: '1px solid var(--expense-100)' }}
            >
              <AlertTriangle size={11} style={{ color: 'var(--expense-500)' }} />
            </div>
            <span className="text-sm font-bold flex-1 text-left" style={{ color: 'var(--text-primary)' }}>
              Necesita atención
            </span>
            <span
              className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}
            >
              {(orphanStats ? 1 : 0) + (uncategorizedStats ? 1 : 0)}
            </span>
            <ChevronDown
              size={14}
              className="shrink-0 transition-transform duration-200"
              style={{ color: 'var(--text-muted)', transform: alertsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>

          {/* Cards de alerta individuales */}
          {alertsOpen && (
            <div className="p-3 space-y-2">

              {orphanStats && (
                <div
                  className="rounded-xl p-3.5 flex items-center gap-3"
                  style={{ background: 'var(--expense-50)', border: '1px solid var(--expense-100)' }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'white', border: '1px solid var(--expense-150, var(--expense-200))' }}
                  >
                    <Wallet size={15} style={{ color: 'var(--expense-500)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--expense-800, var(--expense-700))' }}>
                      {orphanStats.count} movimiento{orphanStats.count !== 1 ? 's' : ''} sin billetera
                    </p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--expense-600)' }}>
                      No se incluyen en los KPIs ni en el saldo disponible.{' '}
                      +{formatCurrency(orphanStats.income, 'ARS')} en ingresos · −{formatCurrency(orphanStats.expenses, 'ARS')} en gastos
                    </p>
                  </div>
                  <button
                    onClick={() => router.push('/transactions?orphan=true')}
                    className="text-xs font-semibold whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'white', color: 'var(--expense-600)', border: '1px solid var(--expense-200)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--expense-100)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'white' }}
                  >
                    Revisar →
                  </button>
                </div>
              )}

              {uncategorizedStats && (
                <div
                  className="rounded-xl p-3.5 flex items-center gap-3"
                  style={{ background: 'var(--goal-50)', border: '1px solid var(--goal-100)' }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'white', border: '1px solid var(--goal-200)' }}
                  >
                    <Tag size={15} style={{ color: 'var(--goal-500)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--goal-700)' }}>
                      {uncategorizedStats.count} movimiento{uncategorizedStats.count !== 1 ? 's' : ''} sin categoría
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--goal-600)' }}>
                      Sin categoría, los gráficos y reportes por rubro pueden estar incompletos.
                    </p>
                  </div>
                  <button
                    onClick={() => router.push('/transactions?no_category=true')}
                    className="text-xs font-semibold whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'white', color: 'var(--goal-600)', border: '1px solid var(--goal-200)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--goal-100)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'white' }}
                  >
                    Revisar →
                  </button>
                </div>
              )}

            </div>
          )}
        </motion.div>
      )}
      </AnimatePresence>

      {/* â"€â"€ BALANCE TOTAL + KPIs â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <div className="enter-3">
      {loading ? (
        <div className="space-y-3">
          <div className="rounded-3xl animate-shimmer" style={{ height: 56, border: CARD_BORDER }} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    <span className="text-sm font-extrabold tabular-nums text-white flex items-center"
                      style={{ fontFamily: 'var(--font-sora)', letterSpacing: '-0.01em' }}>
                      {bal < 0 && <span>-</span>}
                      <AnimatedAmount value={Math.abs(bal)} currency={curr}
                        className="text-sm font-extrabold tabular-nums text-white"
                        style={{ fontFamily: 'var(--font-sora)', letterSpacing: '-0.01em' }} />
                    </span>
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
              {Object.keys(reservedByCurrency).length > 0 && (
                <div className="w-full relative z-10 mt-1 pt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Archive size={10} className="text-white/50" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Reservado</span>
                  </div>
                  {Object.entries(reservedByCurrency).map(([curr, amount]) => (
                    <div key={curr} className="flex items-center gap-2 rounded-xl px-3 py-1.5"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)' }}>
                        {curr}
                      </span>
                      <AnimatedAmount value={amount} currency={curr}
                        className="text-sm font-extrabold tabular-nums text-white"
                        style={{ fontFamily: 'var(--font-sora)', letterSpacing: '-0.01em' }} />
                    </div>
                  ))}
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
              {usdEquivARS !== null && (
                <div className="w-full relative z-10 mt-1 pt-2 flex items-center gap-2"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    USD blue equiv.
                  </span>
                  <span className="text-[10px] text-white/40">≈</span>
                  <span className="text-xs font-bold tabular-nums text-white/65"
                    style={{ fontFamily: 'var(--font-sora)' }}>
                    {formatCurrency(usdEquivARS, 'ARS')}
                  </span>
                  <span className="text-[9px] text-white/30 ml-auto">estimado · cotiz. blue</span>
                </div>
              )}
            </div>
          )}

          {/* Aviso saldo inicial */}
          {saldoInicialRows.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl px-4 py-3"
              style={{ background: 'rgba(109,59,215,0.06)', border: '1px solid rgba(109,59,215,0.15)' }}>
              <Info size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--brand-500)' }} />
              <div className="min-w-0">
                <p className="text-xs font-semibold" style={{ color: 'var(--brand-500)' }}>Incluye saldo inicial de billeteras</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {saldoInicialRows.map(r => formatCurrency(r.amount, r.curr as import('@/types').Currency)).join(' · ')} corresponden al capital que ya tenías al registrar tus billeteras en la app. No se cuenta en la tasa de ahorro.
                </p>
              </div>
            </div>
          )}

          {/* KPIs */}
          {summaryRows.length > 0 && (
            <motion.div
              className={`grid gap-3 ${yieldRows.length > 0 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'}`}
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={staggerItem}><KpiCard label="Ingresos"     icon={TrendingUp}   accent="var(--income-500)"  bgTint="var(--income-50)"  rows={summaryRows.map(r => ({ curr: r.curr, value: r.income }))} /></motion.div>
              <motion.div variants={staggerItem}><KpiCard label="Gastos"       icon={TrendingDown}  accent="var(--expense-500)" bgTint="var(--expense-50)" rows={summaryRows.map(r => ({ curr: r.curr, value: r.expenses }))} /></motion.div>
              <motion.div variants={staggerItem}><KpiCard label="Balance neto" tooltip="Ingresás menos Gastás en el período. El saldo total de tus billeteras está disponible en el inicio." icon={Wallet} accent="var(--brand-500)" bgTint="var(--brand-50)" rows={summaryRows.map(r => ({ curr: r.curr, value: r.balance, signed: true }))} /></motion.div>
              {yieldRows.length > 0 && (
                <motion.div variants={staggerItem}><KpiCard label="Rendimientos" tooltip="Rendimientos estimados acreditados en el período. Los montos son estimados." icon={TrendingUp} accent="#6d3bd7" bgTint="var(--brand-50)" rows={yieldRows} /></motion.div>
              )}
            </motion.div>
          )}

          {/* Transparencia de cálculo de KPIs */}
          {summaryRows.length > 0 && (
            <details className="group">
              <summary
                className="flex items-center gap-1.5 cursor-pointer list-none select-none w-fit"
                style={{ color: 'var(--text-faint)' }}
              >
                <Info size={11} />
                <span className="text-[11px] font-medium group-open:hidden">¿Cómo se calculan estos números?</span>
                <span className="text-[11px] font-medium hidden group-open:inline">¿Cómo se calculan estos números?</span>
              </summary>
              <div
                className="mt-2 rounded-xl px-3 py-2.5 space-y-1"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Ingresos y Gastos</span>
                  {' '}incluyen solo movimientos reales. Excluyen transferencias entre billeteras, saldos iniciales, ajustes y reservas.
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Rendimientos</span>
                  {' '}se muestran separados y no se incluyen en la tasa de ahorro.
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Ahorro %</span>
                  {' '}se calcula sobre ingresos y gastos reales, sin rendimientos ni aportes a objetivos.
                </p>
                {internalCount > 0 && (
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-faint)' }}>
                    Este período: {internalCount} movimiento{internalCount !== 1 ? 's' : ''} interno{internalCount !== 1 ? 's' : ''} excluido{internalCount !== 1 ? 's' : ''} de los KPIs.
                  </p>
                )}
              </div>
            </details>
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
      {/* ── PAGOS PENDIENTES ── */}
      {!pendingLoading && (
        <div
          className="glass-card rounded-2xl overflow-hidden"
          style={{ boxShadow: CARD_SHADOW, border: CARD_BORDER, transition: TRANSITION }}
          onMouseEnter={e => cardHoverOn(e.currentTarget)}
          onMouseLeave={e => cardHoverOff(e.currentTarget)}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(109,59,215,0.09)', border: '1px solid rgba(109,59,215,0.16)' }}
              >
                <Clock size={14} style={{ color: 'var(--brand-500)' }} />
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  Pagos pendientes
                </p>
                {pendingSummary.overdue > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}
                  >
                    {pendingSummary.overdue} vencido{pendingSummary.overdue !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => router.push('/pending')}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shrink-0"
              style={{ color: 'var(--brand-500)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-50)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Ver todos
            </button>
          </div>
          {pendingSummary.count === 0 ? (
            <p className="px-4 pb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              No tenés pagos pendientes
            </p>
          ) : (
            <div className="px-4 pb-3 space-y-3">
              {Object.entries(pendingSummary.byCurrency).map(([cur, group]) => (
                <div key={cur} className="space-y-1.5">
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    {cur}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.receivable > 0 && (
                      <div
                        className="flex-1 min-w-[130px] rounded-xl px-3 py-2"
                        style={{ background: 'var(--income-50)', border: '1px solid var(--income-100)' }}
                      >
                        <p
                          className="text-[10px] font-bold uppercase tracking-wide"
                          style={{ color: 'var(--income-600)' }}
                        >
                          A cobrar
                        </p>
                        <p
                          className="text-sm font-extrabold mt-0.5 tabular-nums"
                          style={{ color: 'var(--income-600)', fontFamily: 'var(--font-sora)' }}
                        >
                          +{formatCurrency(group.receivable, cur)}
                        </p>
                      </div>
                    )}
                    {group.payable > 0 && (
                      <div
                        className="flex-1 min-w-[130px] rounded-xl px-3 py-2"
                        style={{ background: 'var(--expense-50)', border: '1px solid var(--expense-100)' }}
                      >
                        <p
                          className="text-[10px] font-bold uppercase tracking-wide"
                          style={{ color: 'var(--expense-600)' }}
                        >
                          A pagar
                        </p>
                        <p
                          className="text-sm font-extrabold mt-0.5 tabular-nums"
                          style={{ color: 'var(--expense-600)', fontFamily: 'var(--font-sora)' }}
                        >
                          -{formatCurrency(group.payable, cur)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
          ? <EmptyState
              type="transactions"
              title={wallets.length > 0 ? 'Registrá tu primer movimiento' : 'Sin transacciones'}
              description={wallets.length > 0
                ? 'Anotá un gasto o ingreso para empezar a controlar tus finanzas.'
                : 'No hay movimientos en este período.'
              }
              action={wallets.length > 0
                ? { label: '+ Nueva transacción', onClick: () => router.push('/transactions') }
                : undefined
              }
            />
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

function KpiCard({ label, icon: Icon, accent, bgTint, rows, tooltip }: {
  label: string; icon: React.ElementType; accent: string; bgTint?: string
  rows: { curr: string; value: number; signed?: boolean }[]
  tooltip?: string
}) {
  return (
    <div className="glass-card rounded-2xl p-4 cursor-default"
      style={{ boxShadow: CARD_SHADOW, border: CARD_BORDER, transition: TRANSITION, background: bgTint ?? undefined }}
      onMouseEnter={e => cardHoverOn(e.currentTarget as HTMLElement)}
      onMouseLeave={e => cardHoverOff(e.currentTarget as HTMLElement)}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-subtle)' }}>
          <Icon size={13} style={{ color: accent }} />
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}
          title={tooltip}
        >{label}{tooltip && <span className="ml-1 opacity-50">ⓘ</span>}</span>
      </div>
      <div className="space-y-1.5">
        {rows.map(({ curr, value, signed }) => {
          const signedPos = signed && value > 0
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
            onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-1px)'; el.style.boxShadow = 'var(--shadow-md)' }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.transform = ''; el.style.boxShadow = 'var(--shadow-sm)' }}>
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
                  {w.transaction_count} {plural(w.transaction_count, 'movimiento', 'movimientos')}
                </p>
              )}
            </div>
            {/* Balance */}
            <div className="shrink-0 text-right">
              <span className="text-base font-semibold tabular-nums leading-tight flex items-center justify-end"
                style={{ color: bal >= 0 ? 'var(--income-500)' : 'var(--expense-500)', fontFamily: 'var(--font-sora)', letterSpacing: '-0.02em' }}>
                {bal < 0 && <span>-</span>}
                <AnimatedAmount value={Math.abs(bal)} currency={w.currency ?? 'ARS'} duration={750}
                  className="text-base font-semibold tabular-nums leading-tight"
                  style={{ color: bal >= 0 ? 'var(--income-500)' : 'var(--expense-500)', fontFamily: 'var(--font-sora)', letterSpacing: '-0.02em' }} />
              </span>
            </div>
          </div>
        ) : (
          <button onClick={onNavigate}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3.5 transition-all"
            style={{ background: 'var(--bg-subtle)', border: '1px dashed var(--border)', transition: TRANSITION }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-subtle)' }}>
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
        <div className="relative">
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
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-xs)' }}
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
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8"
          style={{ background: 'linear-gradient(to right, transparent, var(--bg-card))' }} />
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
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.boxShadow = 'none' }}
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
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{formatDateSmart(tx.date)}</span>
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







