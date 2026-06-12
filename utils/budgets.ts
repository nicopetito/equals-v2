import { safeNumber }                           from './format'
import { INTERNAL_LABELS, BUDGET_WARNING_THRESHOLD } from './constants'
import type { Budget, TransactionWithDetails }  from '@/types'

// ─── types ────────────────────────────────────────────────────────────────────

export type BudgetStatusKind = 'ok' | 'warning' | 'danger'

export interface BudgetStatusResult {
  pct:       number          // clamped 0–100 para barra de progreso
  rawPct:    number          // sin clamp, permite mostrar "132%"
  remaining: number          // puede ser negativo si superado
  overBy:    number          // 0 si no superado
  status:    BudgetStatusKind
  isEmpty:   boolean         // true cuando spent === 0
}

export interface BudgetSummaryByCurrency {
  currency:   string
  totalLimit: number
  totalSpent: number
  overallPct: number
  overBudget: number   // cantidad de presupuestos superados en esta moneda
  nearLimit:  number   // cantidad en warning en esta moneda
}

export interface BudgetSummary {
  byCurrency:   BudgetSummaryByCurrency[]
  overBudget:   number   // total cross-currency (para widget de dashboard)
  nearLimit:    number   // total cross-currency
  totalBudgets: number
}

// ─── date helpers ─────────────────────────────────────────────────────────────

export function lastDayOfMonth(year: number, month: number): string {
  const day = new Date(year, month, 0).getDate()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${year}-${pad(month)}-${pad(day)}`
}

export function getMonthDateRange(year: number, month: number): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    from: `${year}-${pad(month)}-01`,
    to:   lastDayOfMonth(year, month),
  }
}

// ─── transaction filter ───────────────────────────────────────────────────────

// Solo incluye transacciones que semánticamente son gasto real del usuario.
// Patrón dual-mode idéntico al de calculateSavingsMetrics en utils/finance.ts:
//   - Nuevo sistema (tiene transaction_kind): solo 'expense'.
//   - Legacy (sin transaction_kind): type === 'expense' y sin label interno.
// Siempre excluye transacciones sin category_id.
export function filterBudgetTransactions(
  txs: TransactionWithDetails[]
): TransactionWithDetails[] {
  return txs.filter(t => {
    if (!t.category_id) return false
    if (t.transaction_kind) return t.transaction_kind === 'expense'
    return t.type === 'expense' && !(t.label && INTERNAL_LABELS.has(t.label))
  })
}

// ─── spending computation ─────────────────────────────────────────────────────

export function computeSpentByCategory(
  txs: TransactionWithDetails[],
  year: number,
  month: number,
  creditedRefundMap: Map<string, number> = new Map()
): Record<string, number> {
  const { from, to } = getMonthDateRange(year, month)
  const map: Record<string, number> = {}

  for (const t of filterBudgetTransactions(txs)) {
    if (t.date < from || t.date > to) continue
    const credited  = creditedRefundMap.get(t.id ?? '') ?? 0
    const netAmount = Math.max(0, safeNumber(t.amount) - credited)
    map[t.category_id!] = safeNumber(map[t.category_id!]) + netAmount
  }

  return map
}

// ─── budget status ────────────────────────────────────────────────────────────

export function getBudgetStatus(
  limitAmount: number,
  spent: number,
  alertPercentage?: number | null
): BudgetStatusResult {
  const limit     = safeNumber(limitAmount)
  const s         = safeNumber(spent)
  const pct       = limit > 0 ? (s / limit) * 100 : 0
  const threshold = alertPercentage ?? BUDGET_WARNING_THRESHOLD
  const status: BudgetStatusKind =
    pct >= 100 ? 'danger' : pct >= threshold ? 'warning' : 'ok'

  return {
    pct:       Math.min(pct, 100),
    rawPct:    pct,
    remaining: limit - s,
    overBy:    Math.max(0, s - limit),
    status,
    isEmpty:   s === 0,
  }
}

// ─── summary ──────────────────────────────────────────────────────────────────

export function computeBudgetSummary(
  budgets: Budget[],
  spentByCategory: Record<string, number>
): BudgetSummary {
  const byKey: Record<string, BudgetSummaryByCurrency> = {}

  for (const b of budgets) {
    const cur   = b.currency ?? 'ARS'
    const spent = safeNumber(spentByCategory[b.category_id])
    const limit = safeNumber(b.limit_amount)
    const { status } = getBudgetStatus(limit, spent, b.alert_percentage)

    if (!byKey[cur]) {
      byKey[cur] = { currency: cur, totalLimit: 0, totalSpent: 0, overallPct: 0, overBudget: 0, nearLimit: 0 }
    }

    byKey[cur].totalLimit += limit
    byKey[cur].totalSpent += spent
    if (status === 'danger')  byKey[cur].overBudget++
    if (status === 'warning') byKey[cur].nearLimit++
  }

  for (const entry of Object.values(byKey)) {
    entry.overallPct = entry.totalLimit > 0
      ? (entry.totalSpent / entry.totalLimit) * 100
      : 0
  }

  const byCurrency = Object.values(byKey)

  return {
    byCurrency,
    overBudget:   byCurrency.reduce((s, c) => s + c.overBudget,  0),
    nearLimit:    byCurrency.reduce((s, c) => s + c.nearLimit,   0),
    totalBudgets: budgets.length,
  }
}
