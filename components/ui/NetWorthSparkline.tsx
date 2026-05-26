'use client'

import { useMemo } from 'react'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { TransactionWithDetails } from '@/types'
import { formatCurrency } from '@/utils/format'

interface Props {
  transactions: TransactionWithDetails[]
  currency: string
  loading?: boolean
}

interface TipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
  currency: string
}

function SparkTooltip({ active, payload, label, currency }: TipProps) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
    >
      <p className="font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-extrabold" style={{ color: 'var(--text-primary)' }}>
        {formatCurrency(payload[0].value, currency)}
      </p>
    </div>
  )
}

export function NetWorthSparkline({ transactions, currency, loading }: Props) {
  const { data, current, change } = useMemo(() => {
    const map = new Map<string, number>()
    transactions.forEach(tx => {
      const month = tx.date.substring(0, 7)
      const delta = tx.type === 'income' ? tx.amount : -tx.amount
      map.set(month, (map.get(month) ?? 0) + delta)
    })

    const sorted = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)

    let cumulative = 0
    const data = sorted.map(([month, delta]) => {
      cumulative += delta
      const [y, m] = month.split('-')
      return {
        label: format(new Date(Number(y), Number(m) - 1, 1), 'MMM', { locale: es }),
        value: Math.round(cumulative),
      }
    })

    const current = data.at(-1)?.value ?? 0
    const prev    = data.at(-2)?.value ?? 0
    const change  = prev !== 0 ? ((current - prev) / Math.abs(prev)) * 100 : 0

    return { data, current, change }
  }, [transactions])

  if (loading) {
    return (
      <div
        className="rounded-2xl animate-shimmer"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', minHeight: 130 }}
      />
    )
  }

  const positive      = current >= 0
  const accentColor   = positive ? '#34d399' : '#f87171'
  const textColor     = positive ? 'var(--income-600)' : 'var(--expense-600)'
  const displayCur    = currency === 'all' ? 'ARS' : currency

  return (
    <div
      className="rounded-2xl p-4 flex flex-col"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          Patrimonio estimado
        </p>
        {data.length >= 2 && (
          <span
            className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-lg"
            style={{
              background: change >= 0 ? 'var(--income-50)' : 'var(--expense-50)',
              color:      change >= 0 ? 'var(--income-600)' : 'var(--expense-600)',
            }}
          >
            {change >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
            <span className="ml-0.5">{Math.abs(change).toFixed(0)}%</span>
          </span>
        )}
      </div>

      {/* Big number */}
      <p className="text-xl font-extrabold tabular-nums leading-tight" style={{ color: textColor }}>
        {formatCurrency(current, displayCur)}
      </p>

      {/* Sparkline */}
      {data.length > 1 ? (
        <div className="mt-3 flex-1">
          <ResponsiveContainer width="100%" height={64}>
            <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={accentColor} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={accentColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Tooltip content={<SparkTooltip currency={displayCur} />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={accentColor}
                strokeWidth={2}
                fill="url(#nwGrad)"
                dot={false}
                activeDot={{ r: 3, fill: accentColor, strokeWidth: 2, stroke: 'white' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-[10px] mt-3" style={{ color: 'var(--text-faint)' }}>
          Aparecerá con más movimientos registrados
        </p>
      )}
    </div>
  )
}



