'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  Plus,
} from 'lucide-react'
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
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'CRYPTO', label: 'CRYPTO' },
]

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('30_days')
  const [currency, setCurrency] = useState<Currency | 'all'>('all')
  const router = useRouter()

  const { data: allTransactions, loading: txLoading } = useTransactions()
  const { data: wallets, loading: walletsLoading } = useWallets()

  const { start, end } = getDateRangeForPeriod(period)

  const filtered = useMemo(() => {
    return allTransactions.filter((t) => {
      const date = new Date(t.date)
      if (date < start || date > end) return false
      if (currency !== 'all' && t.currency !== currency) return false
      return true
    })
  }, [allTransactions, start, end, currency])

  const stats = useMemo(() => {
    if (currency === 'all') {
      const byCurrency: Record<string, { income: number; expenses: number; balance: number }> = {}
      filtered.forEach((t) => {
        if (!byCurrency[t.currency]) byCurrency[t.currency] = { income: 0, expenses: 0, balance: 0 }
        if (t.type === 'income') byCurrency[t.currency].income += t.amount
        else byCurrency[t.currency].expenses += t.amount
        byCurrency[t.currency].balance = byCurrency[t.currency].income - byCurrency[t.currency].expenses
      })
      return { byCurrency, single: null }
    }
    const income = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { byCurrency: null, single: { income, expenses, balance: income - expenses } }
  }, [filtered, currency])

  const walletByCurrency = useMemo(() => {
    const map: Record<string, number> = {}
    wallets.forEach((w) => {
      if (!w.currency) return
      map[w.currency] = (map[w.currency] ?? 0) + (w.current_balance ?? 0)
    })
    return map
  }, [wallets])

  const recentTx = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8),
    [filtered]
  )

  const topExpenses = useMemo(() => {
    const map = new Map<string, { amount: number; color: string; count: number }>()
    filtered
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const key = t.category_name ?? 'Sin categoría'
        const existing = map.get(key) ?? { amount: 0, color: t.category_color ?? '#6b7280', count: 0 }
        existing.amount += t.amount
        existing.count++
        map.set(key, existing)
      })
    const total = Array.from(map.values()).reduce((s, v) => s + v.amount, 0)
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b.amount - a.amount)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data, percentage: total > 0 ? (data.amount / total) * 100 : 0 }))
  }, [filtered])

  const loading = txLoading || walletsLoading

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Resumen de tu actividad financiera</p>
        </div>
        <Button onClick={() => router.push('/transactions')} size="sm">
          <Plus size={16} />
          Nueva transacción
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 gap-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                period === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 gap-1">
          {CURRENCIES.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setCurrency(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                currency === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      {currency === 'all' && stats.byCurrency ? (
        <div className="space-y-4">
          {Object.entries(stats.byCurrency).map(([curr, data]) => (
            <div key={curr}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">{curr}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard title="Ingresos" value={formatCurrency(data.income, curr)} icon={TrendingUp} variant="income" loading={loading} />
                <StatCard title="Gastos" value={formatCurrency(data.expenses, curr)} icon={TrendingDown} variant="expense" loading={loading} />
                <StatCard title="Balance" value={formatCurrency(data.balance, curr)} icon={Wallet} variant={data.balance >= 0 ? 'income' : 'expense'} loading={loading} />
              </div>
            </div>
          ))}
        </div>
      ) : stats.single ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Ingresos" value={formatCurrency(stats.single.income, currency)} icon={TrendingUp} variant="income" loading={loading} />
          <StatCard title="Gastos" value={formatCurrency(stats.single.expenses, currency)} icon={TrendingDown} variant="expense" loading={loading} />
          <StatCard title="Balance" value={formatCurrency(stats.single.balance, currency)} icon={Wallet} variant={stats.single.balance >= 0 ? 'income' : 'expense'} loading={loading} />
        </div>
      ) : null}

      {/* Wallets summary */}
      {Object.keys(walletByCurrency).length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-200">Billeteras</h2>
            <button onClick={() => router.push('/wallets')} className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              Ver todas <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(walletByCurrency).map(([curr, bal]) => (
              <div key={curr} className="bg-gray-800 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">{curr}</p>
                <p className={`text-lg font-bold tabular-nums ${bal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(bal, curr)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent transactions */}
        <div className="lg:col-span-3 bg-gray-900 border border-gray-800 rounded-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <h2 className="font-semibold text-gray-200">Últimas transacciones</h2>
            <button onClick={() => router.push('/transactions')} className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              Ver todas <ArrowUpRight size={14} />
            </button>
          </div>
          {recentTx.length === 0 ? (
            <EmptyState title="Sin transacciones" description="No hay movimientos en este período." />
          ) : (
            <div className="divide-y divide-gray-800">
              {recentTx.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </div>

        {/* Top expenses */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="font-semibold text-gray-200">Top gastos por categoría</h2>
          </div>
          {topExpenses.length === 0 ? (
            <EmptyState title="Sin gastos" description="No hay gastos en este período." />
          ) : (
            <div className="p-5 space-y-4">
              {topExpenses.map((cat) => (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm text-gray-300">{cat.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-200 tabular-nums">
                      {formatCurrency(cat.amount, currency === 'all' ? 'ARS' : currency)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TransactionRow({ tx }: { tx: TransactionWithDetails }) {
  const isIncome = tx.type === 'income'
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-800/40 transition-colors">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
        {isIncome ? <TrendingUp size={16} className="text-emerald-400" /> : <TrendingDown size={16} className="text-red-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-200 truncate">{tx.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">{formatDate(tx.date)}</span>
          {tx.category_name && (
            <CategoryBadge name={tx.category_name} color={tx.category_color} />
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold tabular-nums ${isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
          {isIncome ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
        </p>
        <TypeBadge type={tx.type} />
      </div>
    </div>
  )
}
