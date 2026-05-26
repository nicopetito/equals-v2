'use client'

import { useMemo } from 'react'
import type { Budget, TransactionWithDetails, Refund } from '@/types'
import { formatCurrency, safeNumber } from '@/utils/format'
import { buildCreditedRefundMap } from '@/utils/finance'

interface Props {
  budgets:      Budget[]
  transactions: TransactionWithDetails[]
  month:        number
  year:         number
  refunds?:     Refund[]
}

function barColor(pct: number): string {
  if (pct >= 100) return 'var(--expense-500, #e11d48)'
  if (pct >= 70)  return '#F59E0B'
  return 'var(--income-500, #16a34a)'
}

function barLabel(pct: number): { text: string; bg: string; color: string } {
  if (pct >= 100) return { text: '¡Superado!', bg: 'var(--expense-50)',  color: 'var(--expense-600)' }
  if (pct >= 70)  return { text: 'Cerca',      bg: '#FFFBEB',            color: '#D97706' }
  return               { text: `${Math.min(pct, 99).toFixed(0)}%`, bg: 'var(--income-50)', color: 'var(--income-600)' }
}

export function BudgetVsActualChart({ budgets, transactions, month, year, refunds }: Props) {
  const creditedRefundMap = useMemo(
    () => buildCreditedRefundMap(refunds ?? []),
    [refunds]
  )

  const rows = useMemo(() => {
    const pad    = (n: number) => String(n).padStart(2, '0')
    const prefix = `${year}-${pad(month)}`

    const monthTx = transactions.filter(
      tx => tx.type === 'expense' && tx.date.startsWith(prefix)
    )

    return budgets
      .map(b => {
        const gastado = monthTx
          .filter(tx => tx.category_id === b.category_id)
          .reduce((s, tx) => {
            const credited  = creditedRefundMap.get(tx.id ?? '') ?? 0
            return s + Math.max(0, safeNumber(tx.amount) - credited)
          }, 0)
        const limit = safeNumber(b.limit_amount)
        const pct   = limit > 0 ? (gastado / limit) * 100 : 0
        return { ...b, gastado, pct, limit }
      })
      .filter(r => r.limit > 0)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5)
  }, [budgets, transactions, month, year, creditedRefundMap])

  if (rows.length === 0) return null

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
            Presupuesto vs. Gasto real
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Top 5 por mayor desvío
          </p>
        </div>
        {/* Legend inline */}
        <div className="flex items-center gap-3">
          {[
            { color: 'var(--income-500, #16a34a)', label: 'OK' },
            { color: '#F59E0B',                    label: 'Cerca' },
            { color: 'var(--expense-500, #e11d48)', label: 'Superado' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: l.color }} />
              <span className="text-[10px] font-semibold" style={{ color: 'var(--text-faint)' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {rows.map(row => {
          const lbl = barLabel(row.pct)
          return (
            <div key={row.category_id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: row.category_color ?? '#6d3bd7' }}
                  />
                  <span
                    className="text-xs font-semibold truncate"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {row.category_name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: lbl.bg, color: lbl.color }}
                  >
                    {lbl.text}
                  </span>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {formatCurrency(row.gastado, row.currency)} / {formatCurrency(row.limit, row.currency)}
                  </span>
                </div>
              </div>

              <div
                className="relative h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--bg-subtle)' }}
              >
                <div
                  className="absolute h-full rounded-full transition-all duration-700"
                  style={{
                    width:      `${Math.min(row.pct, 100)}%`,
                    background: barColor(row.pct),
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
