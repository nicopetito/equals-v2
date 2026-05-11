'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, Plus, BarChart3, FileText } from 'lucide-react'
import { useTransactions } from '@/hooks/useTransactions'
import { useWallets } from '@/hooks/useWallets'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { TypeBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { IncomeExpenseChart } from '@/components/ui/IncomeExpenseChart'
import { HealthScore } from '@/components/ui/HealthScore'
import { CategoryDonutChart } from '@/components/ui/CategoryDonutChart'
import { ReportModal } from '@/components/ui/ReportModal'
import { formatCurrency } from '@/utils/format'
import { formatDate, getDateRangeForPeriod, PERIOD_OPTIONS, type Period } from '@/utils/date'
import type { TransactionWithDetails, Currency } from '@/types'

const CURRENCIES: { value: Currency | 'all'; label: string }[] = [
  { value: 'all',    label: 'Todas' },
  { value: 'ARS',    label: 'ARS' },
  { value: 'USD',    label: 'USD' },
  { value: 'EUR',    label: 'EUR' },
  { value: 'CRYPTO', label: 'CRYPTO' },
]

const WALLET_COLORS: Record<string, string> = {
  ARS: '#6366F1', USD: '#10B981', EUR: '#0EA5E9', CRYPTO: '#F59E0B',
}

function FilterPills<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div
      className="flex flex-wrap gap-1 rounded-2xl p-1"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="px-4 py-1.5 text-xs font-bold rounded-xl transition-all duration-200"
          style={value === opt.value
            ? { background: 'var(--grad-brand)', color: 'white', boxShadow: '0 2px 8px rgba(99,102,241,0.30)' }
            : { color: 'var(--text-muted)' }
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function DashboardPage() {
  const [period, setPeriod]       = useState<Period>('30_days')
  const [currency, setCurrency]   = useState<Currency | 'all'>('all')
  const [reportOpen, setReportOpen] = useState(false)
  const router = useRouter()

  const { data: allTransactions, loading: txLoading } = useTransactions()
  const { data: wallets, loading: walletsLoading } = useWallets()

  const { start, end } = getDateRangeForPeriod(period)

  const filtered = useMemo(() =>
    allTransactions.filter(t => {
      const date = new Date(t.date)
      if (date < start || date > end) return false
      if (currency !== 'all' && t.currency !== currency) return false
      return true
    }),
  [allTransactions, start.toISOString(), end.toISOString(), currency])

  const stats = useMemo(() => {
    if (currency === 'all') {
      const byCurrency: Record<string, { income: number; expenses: number; balance: number }> = {}
      filtered.forEach(t => {
        if (!byCurrency[t.currency]) byCurrency[t.currency] = { income: 0, expenses: 0, balance: 0 }
        if (t.type === 'income') byCurrency[t.currency].income += t.amount
        else byCurrency[t.currency].expenses += t.amount
        byCurrency[t.currency].balance = byCurrency[t.currency].income - byCurrency[t.currency].expenses
      })
      return { byCurrency, single: null }
    }
    const income   = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { byCurrency: null, single: { income, expenses, balance: income - expenses } }
  }, [filtered, currency])

  const walletByCurrency = useMemo(() =>
    wallets.reduce<Record<string, number>>((acc, w) => {
      if (w.currency) acc[w.currency] = (acc[w.currency] ?? 0) + (w.current_balance ?? 0)
      return acc
    }, {}),
  [wallets])

  const recentTx = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8),
    [filtered]
  )

  const topExpenses = useMemo(() => {
    const map = new Map<string, { amount: number; color: string }>()
    filtered.filter(t => t.type === 'expense').forEach(t => {
      const key = t.category_name ?? 'Sin categoría'
      const ex = map.get(key) ?? { amount: 0, color: t.category_color ?? '#6366F1' }
      ex.amount += t.amount
      map.set(key, ex)
    })
    const total = Array.from(map.values()).reduce((s, v) => s + v.amount, 0)
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b.amount - a.amount)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data, pct: total > 0 ? (data.amount / total) * 100 : 0 }))
  }, [filtered])

  const loading = txLoading || walletsLoading

  return (
    <div className="p-5 md:p-7 max-w-7xl mx-auto space-y-6 animate-fade-in">

      {/* ── Encabezado de página ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl" aria-hidden>👋</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
              {getGreeting()}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Tu finanzas
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Resumen de tu actividad financiera
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setReportOpen(true)} size="md">
            <FileText size={15} /> Exportar informe
          </Button>
          <Button onClick={() => router.push('/transactions')} size="md">
            <Plus size={16} /> Nueva transacción
          </Button>
        </div>
      </div>

      {/* ── Filtros ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <FilterPills options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
        <FilterPills options={CURRENCIES} value={currency} onChange={v => setCurrency(v as Currency | 'all')} />
      </div>

      {/* ── Billeteras ─────────────────────────────────────── */}
      {Object.keys(walletByCurrency).length > 0 && !loading && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--brand-50)' }}
              >
                <Wallet size={16} style={{ color: 'var(--brand-500)' }} />
              </div>
              <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                Mis billeteras
              </h2>
            </div>
            <button
              onClick={() => router.push('/wallets')}
              className="text-xs font-bold flex items-center gap-1 px-3 py-1.5 rounded-xl transition-colors"
              style={{ color: 'var(--brand-500)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-50)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Ver todas <ArrowUpRight size={13} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(walletByCurrency).map(([curr, bal]) => {
              const color = WALLET_COLORS[curr] ?? '#6366F1'
              return (
                <div
                  key={curr}
                  className="rounded-2xl p-4 transition-all hover:-translate-y-0.5"
                  style={{
                    background: color + '0D',
                    border: `1px solid ${color}20`,
                  }}
                >
                  <div
                    className="text-xs font-bold mb-2 px-2 py-0.5 rounded-full inline-block"
                    style={{ background: color + '18', color }}
                  >
                    {curr}
                  </div>
                  <p
                    className="text-xl font-extrabold tabular-nums"
                    style={{ color: bal >= 0 ? 'var(--income-600)' : 'var(--expense-600)' }}
                  >
                    {formatCurrency(bal, curr)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Stats Cards ─────────────────────────────────────── */}
      {currency === 'all' && stats.byCurrency
        ? Object.entries(stats.byCurrency).map(([curr, data]) => (
            <div key={curr}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-extrabold"
                  style={{ background: 'var(--brand-50)', color: 'var(--brand-600)' }}
                >
                  {curr}
                </span>
                <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard title="Ingresos"  value={formatCurrency(data.income,   curr)} icon={TrendingUp}  variant="income"  loading={loading} />
                <StatCard title="Gastos"    value={formatCurrency(data.expenses, curr)} icon={TrendingDown} variant="expense" loading={loading} />
                <StatCard title="Balance"   value={formatCurrency(data.balance,  curr)} icon={Wallet}
                  variant={data.balance >= 0 ? 'income' : 'expense'} loading={loading} />
              </div>
            </div>
          ))
        : stats.single && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard title="Ingresos" value={formatCurrency(stats.single.income,   currency)} icon={TrendingUp}  variant="income"  loading={loading} />
              <StatCard title="Gastos"   value={formatCurrency(stats.single.expenses, currency)} icon={TrendingDown} variant="expense" loading={loading} />
              <StatCard title="Balance"  value={formatCurrency(stats.single.balance,  currency)} icon={Wallet}
                variant={stats.single.balance >= 0 ? 'income' : 'expense'} loading={loading} />
            </div>
          )
      }

      {/* ── Evolución + Salud financiera ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <IncomeExpenseChart
            transactions={filtered}
            start={start}
            end={end}
            currency={currency === 'all' ? 'ARS' : currency}
            loading={loading}
          />
        </div>
        <div>
          <HealthScore
            income={stats.single?.income ?? Object.values(stats.byCurrency ?? {}).reduce((s, v) => s + v.income, 0)}
            expenses={stats.single?.expenses ?? Object.values(stats.byCurrency ?? {}).reduce((s, v) => s + v.expenses, 0)}
            transactionCount={filtered.length}
            categoryCount={new Set(filtered.map(t => t.category_name).filter(Boolean)).size}
            loading={loading}
          />
        </div>
      </div>

      {/* ── Distribución de gastos (donut) ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CategoryDonutChart
          transactions={filtered}
          currency={currency === 'all' ? 'ARS' : currency}
          loading={loading}
        />
        {/* Mini resumen rápido */}
        <div
          className="rounded-2xl p-5 flex flex-col justify-between"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-50)' }}>
              <BarChart3 size={16} style={{ color: 'var(--brand-500)' }} />
            </div>
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              Resumen rápido
            </span>
          </div>
          <div className="space-y-3 flex-1">
            {[
              { label: 'Transacciones',   value: String(filtered.length),     color: 'var(--brand-500)' },
              { label: 'Categorías usadas', value: String(new Set(filtered.map(t => t.category_name).filter(Boolean)).size), color: 'var(--sky-500)' },
              { label: 'Promedio por gasto',
                value: (() => {
                  const gastos = filtered.filter(t => t.type === 'expense')
                  return gastos.length > 0
                    ? formatCurrency(gastos.reduce((s, t) => s + t.amount, 0) / gastos.length, currency === 'all' ? 'ARS' : currency)
                    : '—'
                })(),
                color: 'var(--expense-500)',
              },
              { label: 'Mayor ingreso',
                value: (() => {
                  const max = Math.max(0, ...filtered.filter(t => t.type === 'income').map(t => t.amount))
                  return max > 0 ? formatCurrency(max, currency === 'all' ? 'ARS' : currency) : '—'
                })(),
                color: 'var(--income-600)',
              },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                <span className="text-sm font-extrabold tabular-nums" style={{ color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setReportOpen(true)}
            className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ background: 'var(--brand-50)', color: 'var(--brand-600)' }}
          >
            <FileText size={14} /> Ver informe completo
          </button>
        </div>
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        transactions={filtered}
        period={PERIOD_OPTIONS.find(p => p.value === period)?.label ?? period}
        currency={currency}
      />

      {/* ── Transacciones + Top Gastos ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Recientes */}
        <div
          className="lg:col-span-3 rounded-2xl overflow-hidden"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--border-light)' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--brand-50)' }}
              >
                <BarChart3 size={16} style={{ color: 'var(--brand-500)' }} />
              </div>
              <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                Últimas transacciones
              </h2>
            </div>
            <button
              onClick={() => router.push('/transactions')}
              className="text-xs font-bold flex items-center gap-1 px-3 py-1.5 rounded-xl transition-colors"
              style={{ color: 'var(--brand-500)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-50)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Ver todas <ArrowUpRight size={13} />
            </button>
          </div>
          {recentTx.length === 0
            ? <EmptyState title="Sin transacciones" description="No hay movimientos en este período." />
            : <div>{recentTx.map((tx, i) => <TransactionRow key={tx.id} tx={tx} index={i} />)}</div>
          }
        </div>

        {/* Top gastos */}
        <div
          className="lg:col-span-2 rounded-2xl overflow-hidden"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            className="flex items-center gap-2.5 px-5 py-4"
            style={{ borderBottom: '1px solid var(--border-light)' }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--expense-50)' }}
            >
              <TrendingDown size={16} style={{ color: 'var(--expense-500)' }} />
            </div>
            <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Top gastos por categoría
            </h2>
          </div>
          {topExpenses.length === 0
            ? <EmptyState title="Sin gastos" description="No hay gastos en este período." />
            : (
              <div className="p-5 space-y-4">
                {topExpenses.map(cat => (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {cat.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                          {formatCurrency(cat.amount, currency === 'all' ? 'ARS' : currency)}
                        </span>
                        <span className="text-xs ml-1.5 font-semibold" style={{ color: 'var(--text-muted)' }}>
                          {cat.pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${cat.pct}%`,
                          background: `linear-gradient(90deg, ${cat.color}, ${cat.color}99)`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}

function TransactionRow({ tx, index }: { tx: TransactionWithDetails; index: number }) {
  const isIncome = tx.type === 'income'
  return (
    <div
      className="flex items-center gap-3.5 px-5 py-3.5 transition-colors cursor-default"
      style={{ borderBottom: '1px solid var(--border-light)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: isIncome ? 'var(--income-50)' : 'var(--expense-50)' }}
      >
        {isIncome
          ? <TrendingUp size={17} style={{ color: 'var(--income-500)' }} />
          : <TrendingDown size={17} style={{ color: 'var(--expense-500)' }} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
          {tx.description}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{formatDate(tx.date)}</span>
          {tx.category_name && <CategoryBadge name={tx.category_name} color={tx.category_color} />}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p
          className="text-sm font-bold tabular-nums"
          style={{ color: isIncome ? 'var(--income-600)' : 'var(--expense-600)' }}
        >
          {isIncome ? '+' : '−'}{formatCurrency(tx.amount, tx.currency)}
        </p>
        <TypeBadge type={tx.type} />
      </div>
    </div>
  )
}
