'use client'

import Link from 'next/link'
import { Wallet, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react'
import { formatCurrency, safeNumber } from '@/utils/format'
import { getBudgetStatus, computeBudgetSummary } from '@/utils/budgets'
import type { Budget } from '@/types'

interface Props {
  budgets:         Budget[]
  spentByCategory: Record<string, number>
}

export function BudgetSummaryWidget({ budgets, spentByCategory }: Props) {
  if (budgets.length === 0) return null

  const summary = computeBudgetSummary(budgets, spentByCategory)

  // Top 3 presupuestos con mayor rawPct (los más críticos primero)
  const top3 = budgets
    .map(b => {
      const spent  = safeNumber(spentByCategory[b.category_id])
      const result = getBudgetStatus(b.limit_amount, spent, b.alert_percentage)
      return { ...b, ...result }
    })
    .filter(b => !b.isEmpty)
    .sort((a, b) => b.rawPct - a.rawPct)
    .slice(0, 3)

  const allOk = summary.overBudget === 0 && summary.nearLimit === 0

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--brand-50)' }}
          >
            <Wallet size={14} style={{ color: 'var(--brand-500)' }} />
          </div>
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
            Presupuestos del mes
          </span>
        </div>
        <Link
          href="/budgets"
          className="flex items-center gap-0.5 text-xs font-semibold transition-colors"
          style={{ color: 'var(--brand-500)' }}
        >
          Ver todos <ChevronRight size={12} />
        </Link>
      </div>

      {/* Status badges */}
      {(summary.overBudget > 0 || summary.nearLimit > 0) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {summary.overBudget > 0 && (
            <div
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'var(--expense-50)', color: 'var(--expense-600)' }}
            >
              <AlertTriangle size={11} />
              {summary.overBudget} {summary.overBudget === 1 ? 'superado' : 'superados'}
            </div>
          )}
          {summary.nearLimit > 0 && (
            <div
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: '#FFFBEB', color: '#D97706' }}
            >
              <AlertTriangle size={11} />
              {summary.nearLimit} cerca del límite
            </div>
          )}
        </div>
      )}

      {/* All ok message */}
      {allOk && top3.length > 0 && (
        <div
          className="flex items-center gap-1.5 text-xs font-semibold mb-3 px-2.5 py-1.5 rounded-xl"
          style={{ background: 'var(--income-50)', color: 'var(--income-600)' }}
        >
          <CheckCircle2 size={12} />
          Todos los presupuestos bajo control
        </div>
      )}

      {/* Top 3 budgets */}
      {top3.length > 0 && (
        <div className="space-y-2.5">
          {top3.map(b => {
            const barBg = b.status === 'danger'
              ? 'var(--grad-expense)'
              : b.status === 'warning'
              ? 'linear-gradient(90deg,#F59E0B,#D97706)'
              : 'var(--grad-income)'

            return (
              <div key={b.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: b.category_color ?? 'var(--brand-500)' }}
                    />
                    <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                      {b.category_name ?? 'Sin nombre'}
                    </span>
                  </div>
                  <span
                    className="text-xs font-bold tabular-nums ml-2 shrink-0"
                    style={{
                      color: b.status === 'danger' ? 'var(--expense-600)'
                           : b.status === 'warning' ? '#D97706'
                           : 'var(--income-600)',
                      fontFamily: 'var(--font-sora)',
                    }}
                  >
                    {b.rawPct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${b.pct}%`, background: barBg }}
                  />
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {formatCurrency(safeNumber(spentByCategory[b.category_id]), b.currency)} gastado
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    de {formatCurrency(b.limit_amount, b.currency)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty: all budgets have no movements */}
      {top3.length === 0 && (
        <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
          Aún no hay gastos en este mes para los presupuestos configurados.
        </p>
      )}
    </div>
  )
}
