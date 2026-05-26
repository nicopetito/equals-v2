'use client'

import { useState, useMemo } from 'react'
import { FileText, TrendingDown, Wallet, BarChart2, Trophy } from 'lucide-react'
import { subDays, subMonths, startOfMonth, endOfMonth, startOfYear } from 'date-fns'
import { useTransactions } from '@/hooks/useTransactions'
import { useWallets } from '@/hooks/useWallets'
import { useGoals } from '@/hooks/useGoals'
import { useFixedTerms } from '@/hooks/useFixedTerms'
import { HealthScore } from '@/components/ui/HealthScore'
import { CategoryDonutChart } from '@/components/ui/CategoryDonutChart'
import { IncomeExpenseChart } from '@/components/ui/IncomeExpenseChart'
import { NetWorthSparkline } from '@/components/ui/NetWorthSparkline'
import { ReportModal } from '@/components/ui/ReportModal'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { HelpButton } from '@/components/help/HelpButton'
import { formatCurrency, safeNumber } from '@/utils/format'
import { calculateNetWorth, calculateSavingsMetrics } from '@/utils/finance'
import { getDateRangeForPeriod, PERIOD_OPTIONS, type Period } from '@/utils/date'
import type { Currency } from '@/types'

const CURRENCIES: { value: Currency | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'CRYPTO', label: 'CRYPTO' },
]

const WALLET_COLORS: Record<string, string> = {
  ARS: '#a078ff', USD: '#4edea3', EUR: '#adc6ff', CRYPTO: '#ffb869',
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function getPrevDateRange(period: Period): { prevStart: Date; prevEnd: Date } {
  const today = new Date()
  switch (period) {
    case '7_days':
      return { prevStart: subDays(today, 14), prevEnd: subDays(today, 7) }
    case '30_days':
      return { prevStart: subDays(today, 60), prevEnd: subDays(today, 30) }
    case '90_days':
      return { prevStart: subDays(today, 180), prevEnd: subDays(today, 90) }
    case 'this_month': {
      const prev = subMonths(today, 1)
      return { prevStart: startOfMonth(prev), prevEnd: endOfMonth(prev) }
    }
    case 'last_month': {
      const twoBack = subMonths(today, 2)
      return { prevStart: startOfMonth(twoBack), prevEnd: endOfMonth(twoBack) }
    }
    case 'this_year': {
      const prevYear = new Date(today.getFullYear() - 1, 0, 1)
      return { prevStart: startOfYear(prevYear), prevEnd: new Date(today.getFullYear() - 1, 11, 31) }
    }
  }
}

function FilterBar({ period, setPeriod, currency, setCurrency }: {
  period: Period; setPeriod: (v: Period) => void
  currency: Currency | 'all'; setCurrency: (v: Currency | 'all') => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
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

function SectionLabel({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-3">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{title}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>{desc}</p>
    </div>
  )
}

export default function EstadisticasPage() {
  const [period, setPeriod]         = useState<Period>('30_days')
  const [currency, setCurrency]     = useState<Currency | 'all'>('all')
  const [reportOpen, setReportOpen] = useState(false)

  const { data: allTransactions, loading: txLoading } = useTransactions()
  const { data: wallets, loading: walletsLoading }    = useWallets()
  const { data: goals }       = useGoals()
  const { items: fixedTerms } = useFixedTerms()
  const loading = txLoading || walletsLoading

  const { start, end } = getDateRangeForPeriod(period)
  const { prevStart, prevEnd } = getPrevDateRange(period)
  const startISO    = start.toISOString()
  const endISO      = end.toISOString()
  const prevStartISO = prevStart.toISOString()
  const prevEndISO   = prevEnd.toISOString()

  const filtered = useMemo(() =>
    allTransactions.filter(t => {
      const d = new Date(t.date)
      if (d < start || d > end) return false
      if (currency !== 'all' && t.currency !== currency) return false
      return true
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [allTransactions, startISO, endISO, currency])

  const prevFiltered = useMemo(() =>
    allTransactions.filter(t => {
      const d = new Date(t.date)
      if (d < prevStart || d > prevEnd) return false
      if (currency !== 'all' && t.currency !== currency) return false
      return true
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [allTransactions, prevStartISO, prevEndISO, currency])

  const stats = useMemo(() => {
    if (currency === 'all') {
      const byCurrency: Record<string, { income: number; expenses: number; balance: number }> = {}
      filtered.forEach(t => {
        if (!byCurrency[t.currency]) byCurrency[t.currency] = { income: 0, expenses: 0, balance: 0 }
        if (t.type === 'income') byCurrency[t.currency].income += safeNumber(t.amount)
        else byCurrency[t.currency].expenses += safeNumber(t.amount)
        byCurrency[t.currency].balance = byCurrency[t.currency].income - byCurrency[t.currency].expenses
      })
      if (!Object.keys(byCurrency).length) return { byCurrency: null, single: { income: 0, expenses: 0, balance: 0 } }
      return { byCurrency, single: null }
    }
    const income   = filtered.filter(t => t.type === 'income').reduce((s, t) => s + safeNumber(t.amount), 0)
    const expenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + safeNumber(t.amount), 0)
    return { byCurrency: null, single: { income, expenses, balance: income - expenses } }
  }, [filtered, currency])

  const totalIncome   = stats.single?.income   ?? Object.values(stats.byCurrency ?? {}).reduce((s, v) => s + v.income, 0)
  const totalExpenses = stats.single?.expenses ?? Object.values(stats.byCurrency ?? {}).reduce((s, v) => s + v.expenses, 0)

  const savingsMetrics = useMemo(() => calculateSavingsMetrics(filtered), [filtered])
  const savingsRate    = savingsMetrics.savingsRate

  const prevIncome   = useMemo(() =>
    prevFiltered.filter(t => t.type === 'income').reduce((s, t) => s + safeNumber(t.amount), 0),
  [prevFiltered])

  const prevExpenses = useMemo(() =>
    prevFiltered.filter(t => t.type === 'expense').reduce((s, t) => s + safeNumber(t.amount), 0),
  [prevFiltered])

  const incomeDelta   = prevIncome   > 0 ? ((totalIncome   - prevIncome)   / prevIncome)   * 100 : null
  const expensesDelta = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : null

  const activeCurr = currency === 'all' ? 'ARS' : currency
  const txCount    = filtered.length
  const catCount   = new Set(filtered.map(t => t.category_name).filter(Boolean)).size

  const avgExpense = useMemo(() => {
    const g = filtered.filter(t => t.type === 'expense')
    return g.length > 0 ? g.reduce((s, t) => s + safeNumber(t.amount), 0) / g.length : null
  }, [filtered])

  const maxIncome = useMemo(() => {
    const incomes = filtered.filter(t => t.type === 'income').map(t => safeNumber(t.amount))
    return incomes.length > 0 ? Math.max(...incomes) : 0
  }, [filtered])

  const topExpCategories = useMemo(() => {
    const map: Record<string, { amount: number; count: number; color: string }> = {}
    filtered.filter(t => t.type === 'expense').forEach(t => {
      const name = t.category_name ?? 'Sin categoría'
      if (!map[name]) map[name] = { amount: 0, count: 0, color: t.category_color ?? '#ffb4ab' }
      map[name].amount += safeNumber(t.amount)
      map[name].count++
    })
    const total = Object.values(map).reduce((s, v) => s + v.amount, 0)
    return Object.entries(map)
      .sort(([,a],[,b]) => b.amount - a.amount)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data, pct: total > 0 ? (data.amount / total) * 100 : 0 }))
  }, [filtered])

  const topIncCategories = useMemo(() => {
    const map: Record<string, { amount: number; count: number; color: string }> = {}
    filtered.filter(t => t.type === 'income').forEach(t => {
      const name = t.category_name ?? 'Sin categoría'
      if (!map[name]) map[name] = { amount: 0, count: 0, color: t.category_color ?? '#4edea3' }
      map[name].amount += safeNumber(t.amount)
      map[name].count++
    })
    const total = Object.values(map).reduce((s, v) => s + v.amount, 0)
    return Object.entries(map)
      .sort(([,a],[,b]) => b.amount - a.amount)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data, pct: total > 0 ? (data.amount / total) * 100 : 0 }))
  }, [filtered])

  const spendingByDay = useMemo(() => {
    const expTx = filtered.filter(t => t.type === 'expense')
    if (expTx.length < 7) return null
    const totals = new Array(7).fill(0)
    expTx.forEach(t => { totals[new Date(t.date).getDay()] += safeNumber(t.amount) })
    const max = Math.max(...totals)
    return totals.map((v, i) => ({ day: DAY_LABELS[i], value: v, pct: max > 0 ? (v / max) * 100 : 0 }))
  }, [filtered])

  const walletByCurrency = useMemo(() =>
    wallets.reduce<Record<string, number>>((acc, w) => {
      if (w.currency) acc[w.currency] = (acc[w.currency] ?? 0) + safeNumber(w.current_balance)
      return acc
    }, {}), [wallets])

  const netWorth = useMemo(
    () => calculateNetWorth(wallets, goals, fixedTerms),
    [wallets, goals, fixedTerms]
  )

  const showContent = loading || filtered.length > 0

  return (
    <div className="p-5 md:p-7 max-w-6xl mx-auto space-y-6 animate-fade-in">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <PageHeader
        layout="split"
        icon={BarChart2}
        title="Estadísticas"
        subtitle="Analizá tu actividad financiera en profundidad"
      >
        <HelpButton section="estadisticas" variant="glass" />
        <button
          onClick={() => setReportOpen(true)}
          className="hero-btn hero-btn-secondary">
          <FileText size={14} /> Exportar
        </button>
      </PageHeader>

      {/* ── FILTROS ────────────────────────────────────────────── */}
      <FilterBar period={period} setPeriod={setPeriod} currency={currency}
        setCurrency={v => setCurrency(v as Currency | 'all')} />

      {/* ── EMPTY STATE ────────────────────────────────────────── */}
      {!loading && filtered.length === 0 && (
        <EmptyState
          type="transactions"
          title="Sin movimientos en este período"
          description="Ajustá el filtro de fechas o agregá transacciones para ver el análisis."
        />
      )}

      {showContent && (
        <>
          {/* ── KPIs RÁPIDOS ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              {
                label: 'Transacciones',
                value: String(txCount),
                icon: Wallet,
                color: 'var(--brand-500)',
                delta: null,
                deltaPositiveIsGood: true,
              },
              {
                label: 'Categorías',
                value: String(catCount),
                icon: BarChart2,
                color: 'var(--brand-600)',
                delta: null,
                deltaPositiveIsGood: true,
              },
              {
                label: 'Promedio gasto',
                value: avgExpense ? formatCurrency(avgExpense, activeCurr) : '—',
                icon: TrendingDown,
                color: 'var(--expense-500)',
                delta: currency !== 'all' ? expensesDelta : null,
                deltaPositiveIsGood: false,
              },
              {
                label: 'Mayor ingreso',
                value: maxIncome > 0 ? formatCurrency(maxIncome, activeCurr) : '—',
                icon: Trophy,
                color: 'var(--income-500)',
                delta: currency !== 'all' ? incomeDelta : null,
                deltaPositiveIsGood: true,
              },
            ] as const).map(item => (
              <div key={item.label} className="glass-card rounded-2xl px-4 py-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <item.icon size={11} style={{ color: item.color }} />
                    <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                  </div>
                  {item.delta !== null && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: (item.deltaPositiveIsGood ? item.delta >= 0 : item.delta <= 0) ? 'var(--income-50)' : 'var(--expense-50)',
                        color: (item.deltaPositiveIsGood ? item.delta >= 0 : item.delta <= 0) ? 'var(--income-600)' : 'var(--expense-600)',
                      }}>
                      {item.delta >= 0 ? '▲' : '▼'} {Math.abs(item.delta).toFixed(1)}%
                    </span>
                  )}
                </div>
                <p className="text-lg font-extrabold tabular-nums" style={{ color: item.color, fontFamily: 'var(--font-sora)' }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* ── TASA DE AHORRO ───────────────────────────────────── */}
          {savingsRate !== null && (
            <div className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
              style={{
                background: savingsRate >= 20 ? 'rgba(78,222,163,0.07)' : savingsRate >= 0 ? 'rgba(255,184,105,0.07)' : 'rgba(255,180,171,0.07)',
                border: `1px solid ${savingsRate >= 20 ? 'rgba(78,222,163,0.15)' : savingsRate >= 0 ? 'rgba(255,184,105,0.15)' : 'rgba(255,180,171,0.15)'}`,
              }}>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Tasa de ahorro</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {savingsRate >= 20 ? '✓ Excelente — ahorrás más del 20% de tus ingresos'
                    : savingsRate >= 0 ? '↗ En progreso — tus gastos consumen la mayor parte de tus ingresos'
                    : '⚠ Atención — tus gastos superan tus ingresos en este período'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
                  Porcentaje de ingresos que no fueron gastados en el período seleccionado.
                </p>
              </div>
              <span className="text-4xl font-extrabold tabular-nums shrink-0"
                style={{ color: savingsRate >= 20 ? '#4edea3' : savingsRate >= 0 ? '#ffb869' : '#ffb4ab', fontFamily: 'var(--font-sora)' }}>
                {savingsRate}%
              </span>
            </div>
          )}

          {/* ── GRÁFICO EVOLUCIÓN ────────────────────────────────── */}
          <div>
            <SectionLabel
              title="Evolución de ingresos y gastos"
              desc="Evolución de tus entradas y salidas a lo largo del período seleccionado."
            />
            <div className="glass-card rounded-2xl overflow-hidden">
              <IncomeExpenseChart
                transactions={filtered} start={start} end={end}
                currency={activeCurr} loading={loading}
              />
            </div>
          </div>

          {/* ── SALUD + NET WORTH / BALANCE ──────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <SectionLabel
                title="Salud financiera"
                desc="Diagnóstico integral basado en balance, ahorro, actividad y diversidad de categorías."
              />
              <HealthScore income={savingsMetrics.realIncome} expenses={savingsMetrics.consumerExpenses}
                transactionCount={txCount} categoryCount={catCount} loading={loading} />
            </div>
            {currency !== 'all' && (
              <div>
                <SectionLabel
                  title="Evolución del balance"
                  desc="Balance acumulado de todas tus billeteras a lo largo del tiempo."
                />
                <NetWorthSparkline transactions={allTransactions} currency={currency} loading={loading} />
              </div>
            )}
            {currency === 'all' && Object.keys(netWorth).length > 0 && (
              <div>
                <SectionLabel
                  title="Patrimonio total"
                  desc="Balance líquido, objetivos e inversiones activas agrupados por moneda."
                />
                <div className="glass-card rounded-2xl p-4 space-y-3">
                  {(() => {
                    const grandTotal = Object.values(netWorth).reduce((s, v) => s + Math.abs(v.total), 0)
                    return Object.entries(netWorth).map(([curr, breakdown]) => {
                      const color = WALLET_COLORS[curr] ?? '#a078ff'
                      const pct = grandTotal > 0 ? (Math.abs(breakdown.total) / grandTotal) * 100 : 0
                      return (
                        <div key={curr}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                style={{ background: `${color}18`, color }}>{curr}</span>
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                Billeteras {formatCurrency(breakdown.liquid, curr)}
                              </span>
                              {breakdown.goals > 0 && (
                                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                                  · Objetivos {formatCurrency(breakdown.goals, curr)}
                                </span>
                              )}
                              {breakdown.investments > 0 && (
                                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                                  · Inv. {formatCurrency(breakdown.investments, curr)}
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-extrabold tabular-nums"
                              style={{ color: breakdown.total >= 0 ? 'var(--income-500)' : 'var(--expense-500)', fontFamily: 'var(--font-sora)' }}>
                              {formatCurrency(breakdown.total, curr)}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, opacity: 0.7 }} />
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* ── DISTRIBUCIÓN POR CATEGORÍA ───────────────────────── */}
          <div>
            <SectionLabel
              title="Distribución por categoría"
              desc="Proporción de cada categoría sobre el total del período."
            />
            <CategoryDonutChart transactions={filtered} currency={activeCurr} loading={loading} />
          </div>

          {/* ── TOP 5 CATEGORÍAS DE GASTO ────────────────────────── */}
          {topExpCategories.length > 0 && (
            <div>
              <SectionLabel
                title="Top 5 categorías con mayor gasto"
                desc="Las 5 categorías donde más dinero salió en el período."
              />
              <div className="glass-card rounded-2xl overflow-hidden">
                {topExpCategories.map((cat, i) => (
                  <div key={cat.name}
                    className="flex items-center gap-4 px-5 py-3.5 transition-all"
                    style={{ borderBottom: i < topExpCategories.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span className="text-sm font-extrabold w-5 shrink-0 text-center"
                      style={{ color: i === 0 ? '#ffb869' : 'var(--text-faint)', fontFamily: 'var(--font-sora)' }}>
                      {i + 1}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                    <p className="flex-1 text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{cat.name}</p>
                    <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{cat.count} mov.</span>
                    <span className="text-xs font-bold shrink-0 w-9 text-right tabular-nums"
                      style={{ color: 'var(--text-faint)' }}>{cat.pct.toFixed(0)}%</span>
                    <div className="w-16 h-1.5 rounded-full shrink-0" style={{ background: 'var(--bg-subtle)' }}>
                      <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, background: cat.color, opacity: 0.80 }} />
                    </div>
                    <span className="text-sm font-extrabold tabular-nums shrink-0 w-32 text-right"
                      style={{ color: 'var(--expense-500)', fontFamily: 'var(--font-sora)' }}>
                      {formatCurrency(cat.amount, activeCurr)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TOP 5 FUENTES DE INGRESO ─────────────────────────── */}
          {topIncCategories.length > 0 && (
            <div>
              <SectionLabel
                title="Top 5 fuentes de ingreso"
                desc="Las 5 categorías de ingresos más importantes del período."
              />
              <div className="glass-card rounded-2xl overflow-hidden">
                {topIncCategories.map((cat, i) => (
                  <div key={cat.name}
                    className="flex items-center gap-4 px-5 py-3.5 transition-all"
                    style={{ borderBottom: i < topIncCategories.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span className="text-sm font-extrabold w-5 shrink-0 text-center"
                      style={{ color: i === 0 ? '#ffb869' : 'var(--text-faint)', fontFamily: 'var(--font-sora)' }}>
                      {i + 1}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                    <p className="flex-1 text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{cat.name}</p>
                    <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{cat.count} mov.</span>
                    <span className="text-xs font-bold shrink-0 w-9 text-right tabular-nums"
                      style={{ color: 'var(--text-faint)' }}>{cat.pct.toFixed(0)}%</span>
                    <div className="w-16 h-1.5 rounded-full shrink-0" style={{ background: 'var(--bg-subtle)' }}>
                      <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, background: cat.color, opacity: 0.80 }} />
                    </div>
                    <span className="text-sm font-extrabold tabular-nums shrink-0 w-32 text-right"
                      style={{ color: 'var(--income-500)', fontFamily: 'var(--font-sora)' }}>
                      {formatCurrency(cat.amount, activeCurr)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── GASTOS POR DÍA DE SEMANA ─────────────────────────── */}
          {spendingByDay && (
            <div>
              <SectionLabel
                title="Gastos por día de la semana"
                desc="Qué días de la semana concentran más gastos en el período."
              />
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-end justify-between gap-2" style={{ height: 96 }}>
                  {spendingByDay.map((bar) => (
                    <div key={bar.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full rounded-t-lg transition-all duration-300"
                        style={{
                          height: `${Math.max(bar.pct, 4)}%`,
                          background: bar.pct === 100 ? 'linear-gradient(135deg,#6d3bd7,#0566d9)' : 'var(--expense-500)',
                          opacity: bar.pct === 100 ? 1 : 0.35 + (bar.pct / 100) * 0.55,
                        }} />
                      <span className="text-[10px] font-bold shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {bar.day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── RESUMEN POR MONEDA ───────────────────────────────── */}
          {stats.byCurrency && Object.keys(stats.byCurrency).length > 1 && (
            <div>
              <SectionLabel
                title="Resumen por moneda"
                desc="Ingresos, gastos y balance desglosados por moneda."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(stats.byCurrency).map(([curr, data]) => {
                  const color = WALLET_COLORS[curr] ?? '#a078ff'
                  const sr = data.income > 0 ? Math.round(((data.income - data.expenses) / data.income) * 100) : null
                  return (
                    <div key={curr} className="glass-card rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${color}18`, color }}>{curr}</span>
                        {sr !== null && (
                          <span className="text-xs font-bold"
                            style={{ color: sr >= 20 ? '#4edea3' : sr >= 0 ? '#ffb869' : '#ffb4ab' }}>
                            {sr >= 0 ? '+' : ''}{sr}% ahorro
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { label: 'Ingresos', value: data.income,   color: '#4edea3' },
                          { label: 'Gastos',   value: data.expenses, color: '#ffb4ab' },
                          { label: 'Balance',  value: data.balance,  color: data.balance >= 0 ? '#4edea3' : '#ffb4ab' },
                        ].map(r => (
                          <div key={r.label} className="flex items-center justify-between">
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                            <span className="text-sm font-extrabold tabular-nums"
                              style={{ color: r.color, fontFamily: 'var(--font-sora)' }}>
                              {formatCurrency(r.value, curr)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)}
        transactions={filtered} period={PERIOD_OPTIONS.find(p => p.value === period)?.label ?? period} currency={currency} />
    </div>
  )
}
