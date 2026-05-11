'use client'

import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts'
import type { TransactionWithDetails } from '@/types'
import { formatCurrency } from '@/utils/format'

interface Props {
  transactions: TransactionWithDetails[]
  currency: string
  loading?: boolean
}

const FALLBACK_COLORS = ['#6366F1','#10B981','#F59E0B','#F43F5E','#0EA5E9','#8B5CF6','#EC4899','#14B8A6']

type Mode = 'expense' | 'income'

function buildSlices(transactions: TransactionWithDetails[], mode: Mode) {
  const map = new Map<string, { amount: number; color: string }>()
  transactions
    .filter(t => t.type === mode)
    .forEach(t => {
      const name  = t.category_name ?? 'Sin categoría'
      const color = t.category_color ?? '#94A3B8'
      const entry = map.get(name) ?? { amount: 0, color }
      entry.amount += t.amount
      map.set(name, entry)
    })

  const sorted = Array.from(map.entries()).sort(([, a], [, b]) => b.amount - a.amount)
  const total  = sorted.reduce((s, [, v]) => s + v.amount, 0)
  const top    = sorted.slice(0, 5)
  const rest   = sorted.slice(5)

  const slices = top.map(([name, data], i) => ({
    name,
    value: data.amount,
    color: data.color !== '#94A3B8' ? data.color : FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    pct: total > 0 ? (data.amount / total) * 100 : 0,
  }))

  if (rest.length > 0) {
    const otherAmt = rest.reduce((s, [, v]) => s + v.amount, 0)
    slices.push({
      name: 'Otros',
      value: otherAmt,
      color: '#CBD5E1',
      pct: total > 0 ? (otherAmt / total) * 100 : 0,
    })
  }

  return { slices, total }
}

function ActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
  return (
    <Sector
      cx={cx} cy={cy}
      innerRadius={innerRadius - 4}
      outerRadius={outerRadius + 6}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      style={{ filter: `drop-shadow(0 4px 8px ${fill}55)` }}
    />
  )
}

interface TooltipProps {
  active?: boolean
  payload?: { name: string; value: number; payload: { color: string; pct: number } }[]
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div
      className="rounded-2xl px-4 py-3 text-sm"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.payload.color }} />
        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{d.name}</span>
      </div>
      <p className="tabular-nums font-extrabold text-base" style={{ color: d.payload.color }}>
        {formatCurrency(d.value, 'ARS')}
      </p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
        {d.payload.pct.toFixed(1)}% del total
      </p>
    </div>
  )
}

export function CategoryDonutChart({ transactions, currency, loading }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | undefined>(undefined)
  const [mode, setMode]           = useState<Mode>('expense')

  const { slices, total } = useMemo(() => buildSlices(transactions, mode), [transactions, mode])

  if (loading) {
    return (
      <div
        className="rounded-2xl animate-shimmer"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', height: 280 }}
      />
    )
  }

  const modeLabel = mode === 'expense' ? 'Gastos' : 'Ingresos'
  const emptyText = mode === 'expense' ? 'Sin gastos en este período' : 'Sin ingresos en este período'

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: mode === 'expense' ? 'var(--expense-50)' : 'var(--income-50)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke={mode === 'expense' ? 'var(--expense-500)' : 'var(--income-500)'} strokeWidth="1.8"/>
              <path
                d="M8 2 A6 6 0 0 1 14 8"
                stroke="var(--brand-500)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            {mode === 'expense' ? 'Distribución de gastos' : 'Fuentes de ingresos'}
            {currency !== 'all' ? ` (${currency})` : ''}
          </span>
        </div>

        {/* Toggle pills */}
        <div
          className="flex rounded-xl p-0.5 gap-0.5"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}
        >
          {(['expense', 'income'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setActiveIdx(undefined) }}
              className="px-3 py-1 text-[11px] font-bold rounded-lg transition-all duration-200"
              style={mode === m
                ? {
                    background: m === 'expense' ? 'var(--expense-500)' : 'var(--income-500)',
                    color: 'white',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                  }
                : { color: 'var(--text-muted)' }
              }
            >
              {m === 'expense' ? 'Gastos' : 'Ingresos'}
            </button>
          ))}
        </div>
      </div>

      {slices.length === 0 ? (
        <div
          className="h-44 flex items-center justify-center rounded-xl"
          style={{ background: 'var(--bg-subtle)' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--text-faint)' }}>
            {emptyText}
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Donut */}
          <div className="relative shrink-0" style={{ width: 180, height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  cx="50%" cy="50%"
                  innerRadius={58} outerRadius={80}
                  dataKey="value"
                  activeIndex={activeIdx}
                  activeShape={<ActiveShape />}
                  onMouseEnter={(_, i) => setActiveIdx(i)}
                  onMouseLeave={() => setActiveIdx(undefined)}
                  strokeWidth={2}
                  stroke="var(--bg-card)"
                >
                  {slices.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Total en el centro */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-faint)' }}>
                {modeLabel}
              </span>
              <span className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {formatCurrency(total, currency === 'all' ? 'ARS' : currency)}
              </span>
            </div>
          </div>

          {/* Leyenda */}
          <div className="flex-1 space-y-2 w-full">
            {slices.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-2 cursor-pointer transition-all rounded-lg px-2 py-1"
                style={{ opacity: activeIdx === undefined || activeIdx === i ? 1 : 0.4 }}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(undefined)}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-xs flex-1 truncate font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {s.name}
                </span>
                <span className="text-xs tabular-nums font-bold" style={{ color: s.color }}>
                  {s.pct.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
