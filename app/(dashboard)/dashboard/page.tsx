'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, Plus } from 'lucide-react'
import { useTransactions } from '@/hooks/useTransactions'
import { useWallets } from '@/hooks/useWallets'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { TypeBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/utils/format'
import { formatDate, getDateRangeForPeriod, PERIOD_OPTIONS, type Period } from '@/utils/date'
import type { TransactionWithDetails, Currency } from '@/types'

const CURRENCIES: { value: Currency | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'ARS',    label: 'ARS' },
  { value: 'USD',    label: 'USD' },
  { value: 'EUR',    label: 'EUR' },
  { value: 'CRYPTO', label: 'CRYPTO' },
]

function FilterPills<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 bg-white border border-gray-200 rounded-xl p-1" style={{ boxShadow: '0 1px 3px rgba(70,51,151,0.06)' }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
          style={value === opt.value
            ? { background: 'linear-gradient(135deg,#463397,#9850eb)', color: 'white' }
            : { color: '#6b7280' }
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('30_days')
  const [currency, setCurrency] = useState<Currency | 'all'>('all')
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
      const ex = map.get(key) ?? { amount: 0, color: t.category_color ?? '#6b7280' }
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
    <div className="p-6 max-w-7xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#463397', textShadow: '0 2px 8px rgba(70,51,151,0.12)' }}>
            Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">Resumen de tu actividad financiera</p>
        </div>
        <Button onClick={() => router.push('/transactions')} size="sm">
          <Plus size={16} /> Nueva transacción
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <FilterPills options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
        <FilterPills options={CURRENCIES} value={currency} onChange={v => setCurrency(v as Currency | 'all')} />
      </div>

      {/* Stats */}
      {currency === 'all' && stats.byCurrency
        ? Object.entries(stats.byCurrency).map(([curr, data]) => (
            <div key={curr}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{curr}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard title="Ingresos"  value={formatCurrency(data.income,   curr)} icon={TrendingUp}   variant="income"  loading={loading} />
                <StatCard title="Gastos"    value={formatCurrency(data.expenses, curr)} icon={TrendingDown}  variant="expense" loading={loading} />
                <StatCard title="Balance"   value={formatCurrency(data.balance,  curr)} icon={Wallet} variant={data.balance >= 0 ? 'income' : 'expense'} loading={loading} />
              </div>
            </div>
          ))
        : stats.single && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard title="Ingresos" value={formatCurrency(stats.single.income,   currency)} icon={TrendingUp}  variant="income"  loading={loading} />
              <StatCard title="Gastos"   value={formatCurrency(stats.single.expenses, currency)} icon={TrendingDown} variant="expense" loading={loading} />
              <StatCard title="Balance"  value={formatCurrency(stats.single.balance,  currency)} icon={Wallet} variant={stats.single.balance >= 0 ? 'income' : 'expense'} loading={loading} />
            </div>
          )
      }

      {/* Wallets */}
      {Object.keys(walletByCurrency).length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100" style={{ boxShadow: '0 2px 4px rgba(70,51,151,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">Billeteras</h2>
            <button onClick={() => router.push('/wallets')} className="text-sm font-semibold flex items-center gap-1" style={{ color: '#463397' }}>
              Ver todas <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(walletByCurrency).map(([curr, bal]) => (
              <div key={curr} className="rounded-xl p-3 border border-violet-100" style={{ background: 'linear-gradient(135deg,rgba(70,51,151,0.04),rgba(152,80,235,0.04))' }}>
                <p className="text-xs text-gray-500 mb-1 font-medium">{curr}</p>
                <p className="text-lg font-bold tabular-nums" style={{ color: bal >= 0 ? '#059669' : '#dc2626' }}>
                  {formatCurrency(bal, curr)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent transactions */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100" style={{ boxShadow: '0 2px 4px rgba(70,51,151,0.08)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">Últimas transacciones</h2>
            <button onClick={() => router.push('/transactions')} className="text-sm font-semibold flex items-center gap-1" style={{ color: '#463397' }}>
              Ver todas <ArrowUpRight size={14} />
            </button>
          </div>
          {recentTx.length === 0
            ? <EmptyState title="Sin transacciones" description="No hay movimientos en este período." />
            : <div className="divide-y divide-gray-50">{recentTx.map(tx => <TransactionRow key={tx.id} tx={tx} />)}</div>
          }
        </div>

        {/* Top expenses */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100" style={{ boxShadow: '0 2px 4px rgba(70,51,151,0.08)' }}>
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">Top gastos por categoría</h2>
          </div>
          {topExpenses.length === 0
            ? <EmptyState title="Sin gastos" description="No hay gastos en este período." />
            : (
              <div className="p-5 space-y-4">
                {topExpenses.map(cat => (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm text-gray-700 font-medium">{cat.name}</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-gray-800">
                        {formatCurrency(cat.amount, currency === 'all' ? 'ARS' : currency)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, backgroundColor: cat.color }} />
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

function TransactionRow({ tx }: { tx: TransactionWithDetails }) {
  const isIncome = tx.type === 'income'
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-violet-50/50 transition-colors">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: isIncome ? '#d1fae5' : '#fee2e2' }}
      >
        {isIncome
          ? <TrendingUp size={16} className="text-emerald-600" />
          : <TrendingDown size={16} className="text-red-500" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{tx.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{formatDate(tx.date)}</span>
          {tx.category_name && <CategoryBadge name={tx.category_name} color={tx.category_color} />}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold tabular-nums" style={{ color: isIncome ? '#059669' : '#dc2626' }}>
          {isIncome ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
        </p>
        <TypeBadge type={tx.type} />
      </div>
    </div>
  )
}
