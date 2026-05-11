'use client'

import { useMemo } from 'react'
import type { Budget } from '@/services/budgets.service'
import type { TransactionWithDetails } from '@/types'
import { formatCurrency } from '@/utils/format'

interface Props {
  budgets: Budget[]
  transactions: TransactionWithDetails[]
  month: string
}

function barColor(pct: number): string {
  if (pct >= 100) return '#F43F5E'
  if (pct >= 80)  return '#F59E0B'
  return '#10B981'
}

function barLabel(pct: number): { text: string; bg: string; color: string } {
  if (pct >= 100) return { text: '¡Superado!', bg: 'var(--expense-50)',  color: 'var(--expense-600)' }
  if (pct >= 80)  return { text: 'Cerca',       bg: '#FFFBEB',             color: '#D97706' }
  return               { text: `${pct.toFixed(0)}%`, bg: 'var(--income-50)', color: 'var(--income-600)' }
}

export function BudgetVsActualChart({ budgets, transactions, month }: Props) {
  const rows = useMemo(() => {
    const monthTx = transactions.filter(
      tx => tx.type === 'expense' && tx.date.startsWith(month)
    )
    return budgets
      .map(b => {
        const gastado = monthTx
          .filter(tx => tx.category_id === b.category_id)
          .reduce((s, tx) => s + tx.amount, 0)
        const pct = b.amount > 0 ? (gastado / b.amount) * 100 : 0
        return { ...b, gastado, pct }
      })
      .filter(r => r.amount > 0)
      .sort((a, b) => b.pct - a.pct) // worst offenders first
      .slice(0, 5)
  }, [budgets, transactions, month])

  if (rows.length === 0) return null

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            Presupuesto vs. Gasto real
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Ordenado por mayor desvío
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {rows.map(row => {
          const lbl = barLabel(row.pct)
          return (
            <div key={row.category_id}>
              {/* Category name + amounts */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: row.category_color ?? '#6366F1' }}
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
                  <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {formatCurrency(row.gastado, row.currency)} / {formatCurrency(row.amount, row.currency)}
                  </span>
                </div>
              </div>

              {/* Progress bar: track = budget, fill = actual */}
              <div
                className="relative h-2 rounded-full overflow-hidden"
                style={{ background: 'var(--bg-subtle)' }}
              >
                <div
                  className="absolute h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(row.pct, 100)}%`,
                    background: barColor(row.pct),
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-5 pt-4" style={{ borderTop: '1px solid var(--border-light)' }}>
        {[
          { color: '#10B981', label: 'Bajo control' },
          { color: '#F59E0B', label: 'Cerca del límite' },
          { color: '#F43F5E', label: 'Superado' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: l.color }} />
            <span className="text-[10px] font-semibold" style={{ color: 'var(--text-faint)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
