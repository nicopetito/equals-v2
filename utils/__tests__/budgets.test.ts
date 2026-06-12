import { describe, it, expect } from 'vitest'
import {
  lastDayOfMonth,
  getMonthDateRange,
  filterBudgetTransactions,
  computeSpentByCategory,
  getBudgetStatus,
  computeBudgetSummary,
} from '@/utils/budgets'
import { BUDGET_WARNING_THRESHOLD } from '@/utils/constants'
import type { TransactionWithDetails, Budget } from '@/types'

// ─── helpers ─────────────────────────────────────────────────────────────────

function tx(overrides: Partial<TransactionWithDetails>): TransactionWithDetails {
  return {
    id:          'tx-1',
    type:        'expense',
    amount:      100,
    currency:    'ARS',
    date:        '2026-01-15',
    category_id: 'cat-1',
    ...overrides,
  } as TransactionWithDetails
}

function budget(overrides: Partial<Budget>): Budget {
  return {
    id:              'b-1',
    user_id:         'u-1',
    category_id:     'cat-1',
    month:           1,
    year:            2026,
    limit_amount:    1000,
    currency:        'ARS',
    ...overrides,
  } as Budget
}

// ─── lastDayOfMonth ───────────────────────────────────────────────────────────

describe('lastDayOfMonth', () => {
  it('devuelve 28 para febrero de año no bisiesto', () => {
    expect(lastDayOfMonth(2025, 2)).toBe('2025-02-28')
  })

  it('devuelve 29 para febrero de año bisiesto', () => {
    expect(lastDayOfMonth(2024, 2)).toBe('2024-02-29')
  })

  it('devuelve 31 para enero', () => {
    expect(lastDayOfMonth(2026, 1)).toBe('2026-01-31')
  })

  it('devuelve 30 para abril', () => {
    expect(lastDayOfMonth(2026, 4)).toBe('2026-04-30')
  })

  it('devuelve 31 para diciembre sin desbordamiento de año', () => {
    expect(lastDayOfMonth(2025, 12)).toBe('2025-12-31')
  })
})

// ─── getMonthDateRange ────────────────────────────────────────────────────────

describe('getMonthDateRange', () => {
  it('from siempre es el día 01', () => {
    expect(getMonthDateRange(2026, 3).from).toBe('2026-03-01')
  })

  it('to usa lastDayOfMonth correctamente (febrero no bisiesto)', () => {
    expect(getMonthDateRange(2025, 2).to).toBe('2025-02-28')
  })

  it('to usa lastDayOfMonth correctamente (febrero bisiesto)', () => {
    expect(getMonthDateRange(2024, 2).to).toBe('2024-02-29')
  })

  it('from y to son del mismo mes/año', () => {
    const { from, to } = getMonthDateRange(2026, 6)
    expect(from.startsWith('2026-06')).toBe(true)
    expect(to.startsWith('2026-06')).toBe(true)
  })
})

// ─── filterBudgetTransactions ─────────────────────────────────────────────────

describe('filterBudgetTransactions', () => {
  it('incluye expense con transaction_kind=expense y category_id', () => {
    const result = filterBudgetTransactions([tx({ transaction_kind: 'expense' })])
    expect(result).toHaveLength(1)
  })

  it('excluye transaction_kind=reserve_deposit aunque type=expense', () => {
    const result = filterBudgetTransactions([tx({ transaction_kind: 'reserve_deposit' })])
    expect(result).toHaveLength(0)
  })

  it('excluye transaction_kind=reserve_withdrawal', () => {
    const result = filterBudgetTransactions([tx({ type: 'expense', transaction_kind: 'reserve_withdrawal' })])
    expect(result).toHaveLength(0)
  })

  it('excluye transaction_kind=transfer', () => {
    const result = filterBudgetTransactions([tx({ transaction_kind: 'transfer' })])
    expect(result).toHaveLength(0)
  })

  it('excluye transaction_kind=wallet_adjustment', () => {
    const result = filterBudgetTransactions([tx({ transaction_kind: 'wallet_adjustment' })])
    expect(result).toHaveLength(0)
  })

  it('excluye transaction_kind=initial_balance', () => {
    const result = filterBudgetTransactions([tx({ transaction_kind: 'initial_balance' })])
    expect(result).toHaveLength(0)
  })

  it('excluye transaction_kind=yield', () => {
    const result = filterBudgetTransactions([tx({ type: 'income', transaction_kind: 'yield' })])
    expect(result).toHaveLength(0)
  })

  it('excluye transaction_kind=income', () => {
    const result = filterBudgetTransactions([tx({ type: 'income', transaction_kind: 'income' })])
    expect(result).toHaveLength(0)
  })

  it('excluye transaction_kind=refund_credit', () => {
    const result = filterBudgetTransactions([tx({ type: 'income', transaction_kind: 'refund_credit' })])
    expect(result).toHaveLength(0)
  })

  it('legacy: incluye type=expense sin transaction_kind y sin label', () => {
    const result = filterBudgetTransactions([tx({ transaction_kind: undefined })])
    expect(result).toHaveLength(1)
  })

  it('legacy: excluye type=expense con label=internal_transfer', () => {
    const result = filterBudgetTransactions([tx({ transaction_kind: undefined, label: 'internal_transfer' })])
    expect(result).toHaveLength(0)
  })

  it('legacy: excluye type=expense con label=wallet_adjustment', () => {
    const result = filterBudgetTransactions([tx({ transaction_kind: undefined, label: 'wallet_adjustment' })])
    expect(result).toHaveLength(0)
  })

  it('legacy: excluye type=expense con label=initial_balance', () => {
    const result = filterBudgetTransactions([tx({ transaction_kind: undefined, label: 'initial_balance' })])
    expect(result).toHaveLength(0)
  })

  it('excluye transacciones sin category_id (con transaction_kind=expense)', () => {
    const result = filterBudgetTransactions([tx({ transaction_kind: 'expense', category_id: null })])
    expect(result).toHaveLength(0)
  })

  it('excluye transacciones sin category_id (legacy)', () => {
    const result = filterBudgetTransactions([tx({ transaction_kind: undefined, category_id: undefined })])
    expect(result).toHaveLength(0)
  })
})

// ─── computeSpentByCategory ───────────────────────────────────────────────────

describe('computeSpentByCategory', () => {
  const emptyMap = new Map<string, number>()

  it('acumula montos para la misma categoría en el período', () => {
    const txs = [
      tx({ id: 'a', transaction_kind: 'expense', category_id: 'cat-1', amount: 200, date: '2026-01-10' }),
      tx({ id: 'b', transaction_kind: 'expense', category_id: 'cat-1', amount: 300, date: '2026-01-20' }),
    ]
    const result = computeSpentByCategory(txs, 2026, 1, emptyMap)
    expect(result['cat-1']).toBe(500)
  })

  it('separa correctamente entre categorías distintas', () => {
    const txs = [
      tx({ id: 'a', transaction_kind: 'expense', category_id: 'cat-1', amount: 100, date: '2026-01-10' }),
      tx({ id: 'b', transaction_kind: 'expense', category_id: 'cat-2', amount: 250, date: '2026-01-10' }),
    ]
    const result = computeSpentByCategory(txs, 2026, 1, emptyMap)
    expect(result['cat-1']).toBe(100)
    expect(result['cat-2']).toBe(250)
  })

  it('excluye transacciones fuera del rango de fechas', () => {
    const txs = [
      tx({ id: 'a', transaction_kind: 'expense', category_id: 'cat-1', amount: 500, date: '2025-12-31' }),
      tx({ id: 'b', transaction_kind: 'expense', category_id: 'cat-1', amount: 100, date: '2026-01-15' }),
      tx({ id: 'c', transaction_kind: 'expense', category_id: 'cat-1', amount: 500, date: '2026-02-01' }),
    ]
    const result = computeSpentByCategory(txs, 2026, 1, emptyMap)
    expect(result['cat-1']).toBe(100)
  })

  it('descuenta reintegros acreditados del monto neto', () => {
    const refundMap = new Map([['tx-ref', 60]])
    const txs = [
      tx({ id: 'tx-ref', transaction_kind: 'expense', category_id: 'cat-1', amount: 200, date: '2026-01-10' }),
    ]
    const result = computeSpentByCategory(txs, 2026, 1, refundMap)
    expect(result['cat-1']).toBe(140)
  })

  it('no produce valores negativos cuando el reintegro supera el monto', () => {
    const refundMap = new Map([['tx-ref', 500]])
    const txs = [tx({ id: 'tx-ref', transaction_kind: 'expense', category_id: 'cat-1', amount: 100, date: '2026-01-10' })]
    const result = computeSpentByCategory(txs, 2026, 1, refundMap)
    expect(result['cat-1']).toBe(0)
  })

  it('incluye transacciones del último día de febrero bisiesto', () => {
    const txs = [tx({ id: 'a', transaction_kind: 'expense', category_id: 'cat-1', amount: 99, date: '2024-02-29' })]
    const result = computeSpentByCategory(txs, 2024, 2, emptyMap)
    expect(result['cat-1']).toBe(99)
  })

  it('devuelve {} cuando no hay gastos en el período', () => {
    const result = computeSpentByCategory([], 2026, 1, emptyMap)
    expect(result).toEqual({})
  })

  it('no consume presupuesto un transfer (tipo expense en el campo type)', () => {
    const txs = [tx({ transaction_kind: 'transfer', type: 'expense', category_id: 'cat-1', amount: 500, date: '2026-01-10' })]
    const result = computeSpentByCategory(txs, 2026, 1, emptyMap)
    expect(result['cat-1']).toBeUndefined()
  })

  it('no consume presupuesto una reserve_deposit', () => {
    const txs = [tx({ transaction_kind: 'reserve_deposit', type: 'expense', category_id: 'cat-1', amount: 500, date: '2026-01-10' })]
    const result = computeSpentByCategory(txs, 2026, 1, emptyMap)
    expect(result['cat-1']).toBeUndefined()
  })

  it('no consume presupuesto un wallet_adjustment', () => {
    const txs = [tx({ transaction_kind: 'wallet_adjustment', type: 'expense', category_id: 'cat-1', amount: 500, date: '2026-01-10' })]
    const result = computeSpentByCategory(txs, 2026, 1, emptyMap)
    expect(result['cat-1']).toBeUndefined()
  })

  it('no consume presupuesto un initial_balance', () => {
    const txs = [tx({ transaction_kind: 'initial_balance', type: 'expense', category_id: 'cat-1', amount: 500, date: '2026-01-10' })]
    const result = computeSpentByCategory(txs, 2026, 1, emptyMap)
    expect(result['cat-1']).toBeUndefined()
  })

  it('no consume presupuesto un income', () => {
    const txs = [tx({ transaction_kind: 'income', type: 'income', category_id: 'cat-1', amount: 500, date: '2026-01-10' })]
    const result = computeSpentByCategory(txs, 2026, 1, emptyMap)
    expect(result['cat-1']).toBeUndefined()
  })
})

// ─── getBudgetStatus ──────────────────────────────────────────────────────────

describe('getBudgetStatus', () => {
  it('usa BUDGET_WARNING_THRESHOLD cuando alertPercentage es null', () => {
    const justBelow = getBudgetStatus(1000, (BUDGET_WARNING_THRESHOLD - 1) * 10, null)
    const atThreshold = getBudgetStatus(1000, BUDGET_WARNING_THRESHOLD * 10, null)
    expect(justBelow.status).toBe('ok')
    expect(atThreshold.status).toBe('warning')
  })

  it('usa alertPercentage cuando está configurado (60%)', () => {
    const result = getBudgetStatus(1000, 650, 60)
    expect(result.status).toBe('warning')
  })

  it('no dispara warning antes del alertPercentage personalizado', () => {
    const result = getBudgetStatus(1000, 550, 60)
    expect(result.status).toBe('ok')
  })

  it('alerta personalizada al 90% respeta el umbral', () => {
    const at89 = getBudgetStatus(1000, 890, 90)
    const at90 = getBudgetStatus(1000, 900, 90)
    expect(at89.status).toBe('ok')
    expect(at90.status).toBe('warning')
  })

  it('status es danger cuando spent >= limit', () => {
    expect(getBudgetStatus(1000, 1000, null).status).toBe('danger')
    expect(getBudgetStatus(1000, 1500, null).status).toBe('danger')
  })

  it('isEmpty es true cuando spent es 0', () => {
    expect(getBudgetStatus(1000, 0, null).isEmpty).toBe(true)
  })

  it('isEmpty es false cuando hay gasto', () => {
    expect(getBudgetStatus(1000, 100, null).isEmpty).toBe(false)
  })

  it('pct está clamped a 100', () => {
    const result = getBudgetStatus(1000, 1500, null)
    expect(result.pct).toBe(100)
  })

  it('rawPct puede superar 100', () => {
    const result = getBudgetStatus(1000, 1500, null)
    expect(result.rawPct).toBe(150)
  })

  it('overBy es 0 cuando no está superado', () => {
    expect(getBudgetStatus(1000, 800, null).overBy).toBe(0)
  })

  it('overBy refleja el exceso cuando está superado', () => {
    expect(getBudgetStatus(1000, 1300, null).overBy).toBe(300)
  })

  it('remaining es negativo cuando está superado', () => {
    expect(getBudgetStatus(1000, 1200, null).remaining).toBe(-200)
  })

  it('devuelve pct=0 cuando limit es 0', () => {
    expect(getBudgetStatus(0, 500, null).pct).toBe(0)
  })
})

// ─── computeBudgetSummary ─────────────────────────────────────────────────────

describe('computeBudgetSummary', () => {
  it('agrupa presupuestos por moneda', () => {
    const budgets = [
      budget({ id: '1', category_id: 'cat-1', currency: 'ARS', limit_amount: 1000 }),
      budget({ id: '2', category_id: 'cat-2', currency: 'USD', limit_amount: 200 }),
    ]
    const spent = { 'cat-1': 800, 'cat-2': 50 }
    const result = computeBudgetSummary(budgets, spent)
    expect(result.byCurrency).toHaveLength(2)
    expect(result.byCurrency.find(c => c.currency === 'ARS')?.totalLimit).toBe(1000)
    expect(result.byCurrency.find(c => c.currency === 'USD')?.totalLimit).toBe(200)
  })

  it('con solo presupuestos ARS: byCurrency tiene una sola entrada', () => {
    const budgets = [
      budget({ id: '1', category_id: 'cat-1', currency: 'ARS', limit_amount: 500 }),
      budget({ id: '2', category_id: 'cat-2', currency: 'ARS', limit_amount: 300 }),
    ]
    const result = computeBudgetSummary(budgets, { 'cat-1': 100, 'cat-2': 50 })
    expect(result.byCurrency).toHaveLength(1)
    expect(result.byCurrency[0].currency).toBe('ARS')
    expect(result.byCurrency[0].totalLimit).toBe(800)
    expect(result.byCurrency[0].totalSpent).toBe(150)
  })

  it('overBudget cross-currency cuenta correctamente los superados', () => {
    const budgets = [
      budget({ id: '1', category_id: 'cat-1', currency: 'ARS', limit_amount: 100 }),
      budget({ id: '2', category_id: 'cat-2', currency: 'USD', limit_amount: 100 }),
    ]
    const spent = { 'cat-1': 150, 'cat-2': 50 }
    const result = computeBudgetSummary(budgets, spent)
    expect(result.overBudget).toBe(1)
  })

  it('nearLimit cross-currency cuenta correctamente los que están en warning', () => {
    const budgets = [
      budget({ id: '1', category_id: 'cat-1', currency: 'ARS', limit_amount: 1000, alert_percentage: null }),
      budget({ id: '2', category_id: 'cat-2', currency: 'ARS', limit_amount: 1000, alert_percentage: null }),
    ]
    // 85% y 50% — solo cat-1 en warning (umbral default 80%)
    const spent = { 'cat-1': 850, 'cat-2': 500 }
    const result = computeBudgetSummary(budgets, spent)
    expect(result.nearLimit).toBe(1)
  })

  it('totalBudgets refleja la cantidad de presupuestos', () => {
    const budgets = [
      budget({ id: '1', category_id: 'cat-1' }),
      budget({ id: '2', category_id: 'cat-2' }),
      budget({ id: '3', category_id: 'cat-3' }),
    ]
    const result = computeBudgetSummary(budgets, {})
    expect(result.totalBudgets).toBe(3)
  })

  it('devuelve summary vacío cuando no hay presupuestos', () => {
    const result = computeBudgetSummary([], {})
    expect(result.byCurrency).toHaveLength(0)
    expect(result.overBudget).toBe(0)
    expect(result.nearLimit).toBe(0)
    expect(result.totalBudgets).toBe(0)
  })
})
