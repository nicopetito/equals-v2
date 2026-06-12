import { describe, it, expect } from 'vitest'
import { isRefundTransaction, calculateSavingsMetrics } from '@/utils/finance'
import type { TransactionWithDetails } from '@/types'

// ─── helpers ────────────────────────────────────────────────────────────────

function tx(overrides: Partial<TransactionWithDetails>): TransactionWithDetails {
  return {
    type: 'expense',
    amount: 100,
    currency: 'ARS',
    date: '2026-01-15',
    ...overrides,
  } as TransactionWithDetails
}

// ─── isRefundTransaction ────────────────────────────────────────────────────

describe('isRefundTransaction', () => {
  it('returns true when transaction_kind is refund_credit', () => {
    expect(isRefundTransaction({ type: 'income', transaction_kind: 'refund_credit' })).toBe(true)
  })

  it('returns false when transaction_kind is income', () => {
    expect(isRefundTransaction({ type: 'income', transaction_kind: 'income' })).toBe(false)
  })

  it('returns false when transaction_kind is expense', () => {
    expect(isRefundTransaction({ type: 'expense', transaction_kind: 'expense' })).toBe(false)
  })

  it('returns false for non-real kinds (transfer, initial_balance, etc.)', () => {
    expect(isRefundTransaction({ type: 'income', transaction_kind: 'transfer' })).toBe(false)
    expect(isRefundTransaction({ type: 'income', transaction_kind: 'initial_balance' })).toBe(false)
    expect(isRefundTransaction({ type: 'income', transaction_kind: 'yield' })).toBe(false)
  })

  it('legacy: returns true for income with Reintegro: prefix when no transaction_kind', () => {
    expect(isRefundTransaction({ type: 'income', description: 'Reintegro: compra supermercado' })).toBe(true)
  })

  it('legacy: returns false for income with normal description when no transaction_kind', () => {
    expect(isRefundTransaction({ type: 'income', description: 'Sueldo' })).toBe(false)
  })

  it('legacy: returns false for expense even with Reintegro: prefix', () => {
    expect(isRefundTransaction({ type: 'expense', description: 'Reintegro: algo' })).toBe(false)
  })

  it('legacy: returns false when description is null', () => {
    expect(isRefundTransaction({ type: 'income', description: null })).toBe(false)
  })
})

// ─── calculateSavingsMetrics ────────────────────────────────────────────────

describe('calculateSavingsMetrics', () => {
  it('counts a real income transaction', () => {
    const result = calculateSavingsMetrics([
      tx({ type: 'income', amount: 1000, transaction_kind: 'income' }),
    ])
    expect(result.income).toBe(1000)
    expect(result.realIncome).toBe(1000)
    expect(result.expenses).toBe(0)
    expect(result.savingsRate).toBe(100)
  })

  it('counts a real expense transaction', () => {
    const result = calculateSavingsMetrics([
      tx({ type: 'expense', amount: 400, transaction_kind: 'expense' }),
    ])
    expect(result.expenses).toBe(400)
    expect(result.consumerExpenses).toBe(400)
  })

  it('returns savingsRate=null when there are no real income transactions', () => {
    const result = calculateSavingsMetrics([
      tx({ type: 'expense', amount: 200, transaction_kind: 'expense' }),
    ])
    expect(result.savingsRate).toBeNull()
  })

  it('calculates savingsRate correctly for income and expenses', () => {
    const result = calculateSavingsMetrics([
      tx({ type: 'income',  amount: 1000, transaction_kind: 'income' }),
      tx({ type: 'expense', amount:  400, transaction_kind: 'expense' }),
    ])
    expect(result.savingsRate).toBe(60)
  })

  it('excludes transfer transactions (transaction_kind=transfer)', () => {
    const result = calculateSavingsMetrics([
      tx({ type: 'income',  amount: 500,  transaction_kind: 'transfer' }),
      tx({ type: 'expense', amount: 500,  transaction_kind: 'transfer' }),
      tx({ type: 'income',  amount: 1000, transaction_kind: 'income' }),
    ])
    expect(result.income).toBe(1000)
    expect(result.expenses).toBe(0)
  })

  it('excludes initial_balance transactions', () => {
    const result = calculateSavingsMetrics([
      tx({ type: 'income', amount: 5000, transaction_kind: 'initial_balance' }),
    ])
    expect(result.income).toBe(0)
    expect(result.savingsRate).toBeNull()
  })

  it('excludes wallet_adjustment transactions', () => {
    const result = calculateSavingsMetrics([
      tx({ type: 'income', amount: 200, transaction_kind: 'wallet_adjustment' }),
    ])
    expect(result.income).toBe(0)
  })

  it('excludes reserve_deposit and reserve_withdrawal transactions', () => {
    const result = calculateSavingsMetrics([
      tx({ type: 'expense', amount: 1000, transaction_kind: 'reserve_deposit' }),
      tx({ type: 'income',  amount: 1000, transaction_kind: 'reserve_withdrawal' }),
    ])
    expect(result.income).toBe(0)
    expect(result.expenses).toBe(0)
  })

  it('excludes yield transactions', () => {
    const result = calculateSavingsMetrics([
      tx({ type: 'income', amount: 50, transaction_kind: 'yield' }),
    ])
    expect(result.income).toBe(0)
  })

  it('counts refund_credit in income but not realIncome', () => {
    const result = calculateSavingsMetrics([
      tx({ type: 'income', amount: 300, transaction_kind: 'refund_credit' }),
    ])
    expect(result.income).toBe(300)
    expect(result.refundIncome).toBe(300)
    expect(result.realIncome).toBe(0)
    expect(result.savingsRate).toBeNull()
  })

  it('separates goal deposits from consumer expenses', () => {
    const result = calculateSavingsMetrics([
      tx({ type: 'income',  amount: 1000, transaction_kind: 'income' }),
      tx({ type: 'expense', amount: 400,  transaction_kind: 'expense', description: 'Aporte a objetivo: Viaje' }),
      tx({ type: 'expense', amount: 200,  transaction_kind: 'expense', description: 'Supermercado' }),
    ])
    expect(result.goalDeposits).toBe(400)
    expect(result.consumerExpenses).toBe(200)
    expect(result.savingsRate).toBe(80)
  })

  it('separates goal withdrawals from realIncome', () => {
    const result = calculateSavingsMetrics([
      tx({ type: 'income', amount: 1000, transaction_kind: 'income' }),
      tx({ type: 'income', amount: 300,  transaction_kind: 'income', description: 'Retiro de objetivo: Viaje' }),
    ])
    expect(result.goalWithdrawals).toBe(300)
    expect(result.realIncome).toBe(1000)
    expect(result.income).toBe(1300)
  })

  it('returns all zeros for empty transaction list', () => {
    const result = calculateSavingsMetrics([])
    expect(result.income).toBe(0)
    expect(result.expenses).toBe(0)
    expect(result.savingsRate).toBeNull()
  })

  it('legacy: excludes transaction with internal label when no transaction_kind', () => {
    const result = calculateSavingsMetrics([
      tx({ type: 'income', amount: 500, transaction_kind: undefined, label: 'internal_transfer' }),
      tx({ type: 'income', amount: 200, transaction_kind: 'income' }),
    ])
    expect(result.income).toBe(200)
  })

  it('legacy: includes unrecognized label when no transaction_kind (not internal)', () => {
    const result = calculateSavingsMetrics([
      tx({ type: 'income', amount: 500, transaction_kind: undefined, label: 'custom_label' }),
    ])
    expect(result.income).toBe(500)
  })

  it('handles a mix of real and internal transactions correctly', () => {
    const result = calculateSavingsMetrics([
      tx({ type: 'income',  amount: 2000, transaction_kind: 'income' }),
      tx({ type: 'expense', amount: 500,  transaction_kind: 'expense' }),
      tx({ type: 'income',  amount: 1000, transaction_kind: 'initial_balance' }),
      tx({ type: 'expense', amount: 1000, transaction_kind: 'reserve_deposit' }),
      tx({ type: 'income',  amount: 200,  transaction_kind: 'refund_credit' }),
    ])
    expect(result.income).toBe(2200)
    expect(result.expenses).toBe(500)
    expect(result.realIncome).toBe(2000)
    expect(result.consumerExpenses).toBe(500)
    expect(result.savingsRate).toBe(75)
  })
})
