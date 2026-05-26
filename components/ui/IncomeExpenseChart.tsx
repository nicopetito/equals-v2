'use client'

import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { format, parseISO, eachDayOfInterval, eachWeekOfInterval, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import type { TransactionWithDetails } from '@/types'

interface Props {
  transactions: TransactionWithDetails[]
  start: Date
  end: Date
  currency: string
  loading?: boolean
}

function buildChartData(transactions: TransactionWithDetails[], start: Date, end: Date) {
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000)
  const useWeeks = diffDays > 35

  const buckets = new Map<string, { income: number; expenses: number }>()

  if (useWeeks) {
    eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).forEach(w => {
      const key = format(w, 'yyyy-MM-dd')
      buckets.set(key, { income: 0, expenses: 0 })
    })
  } else {
    eachDayOfInterval({ start, end }).forEach(d => {
      const key = format(d, 'yyyy-MM-dd')
      buckets.set(key, { income: 0, expenses: 0 })
    })
  }

  transactions.forEach(t => {
    const d = parseISO(t.date)
    let key: string
    if (useWeeks) {
      key = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    } else {
      key = format(d, 'yyyy-MM-dd')
    }
    const bucket = buckets.get(key)
    if (bucket) {
      if (t.type === 'income')  bucket.income   += t.amount
      else                       bucket.expenses += t.amount
    }
  })

  return Array.from(buckets.entries()).map(([date, data]) => ({
    label: useWeeks
      ? format(parseISO(date), "d MMM", { locale: es })
      : format(parseISO(date), "d MMM", { locale: es }),
    income:   Math.round(data.income),
    expenses: Math.round(data.expenses),
  }))
}

interface TooltipProps {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-2xl px-4 py-3 text-sm"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <p className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: 'var(--text-muted)' }}>
            {p.name === 'income' ? 'Ingresos' : 'Gastos'}:
          </span>
          <span className="font-bold tabular-nums" style={{ color: p.color }}>
            {new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function IncomeExpenseChart({ transactions, start, end, currency, loading }: Props) {
  const data = useMemo(
    () => buildChartData(transactions, start, end),
    [transactions, start.toISOString(), end.toISOString()]
  )

  if (loading) {
    return (
      <div
        className="rounded-2xl animate-shimmer"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', height: 260 }}
      />
    )
  }

  const hasData = data.some(d => d.income > 0 || d.expenses > 0)

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-50)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 12 L5 8 L8 10 L11 5 L14 7" stroke="var(--brand-500)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            Evolución {currency !== 'all' ? `(${currency})` : ''}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5" style={{ color: 'var(--income-500)' }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--income-500)' }} />
            Ingresos
          </span>
          <span className="flex items-center gap-1.5" style={{ color: 'var(--expense-500)' }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--expense-500)' }} />
            Gastos
          </span>
        </div>
      </div>

      {!hasData ? (
        <div
          className="h-40 flex items-center justify-center rounded-xl"
          style={{ background: 'var(--bg-subtle)' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--text-faint)' }}>
            Sin movimientos en este período
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#e11d48" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--text-faint)', fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-faint)', fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1.5 }} />
            <Area
              type="monotone"
              dataKey="income"
              stroke="#16a34a"
              strokeWidth={2.5}
              fill="url(#gradIncome)"
              dot={false}
              activeDot={{ r: 5, fill: '#16a34a', strokeWidth: 2, stroke: 'white' }}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="#e11d48"
              strokeWidth={2.5}
              fill="url(#gradExpense)"
              dot={false}
              activeDot={{ r: 5, fill: '#e11d48', strokeWidth: 2, stroke: 'white' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}



