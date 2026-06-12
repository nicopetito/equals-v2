import { describe, it, expect } from 'vitest'
import { buildProcessedTransactions } from '@/utils/transactions'
import type { TransactionWithDetails } from '@/types'

// ─── helpers ────────────────────────────────────────────────────────────────

function tx(overrides: Partial<TransactionWithDetails>): TransactionWithDetails {
  return {
    id: `tx-${Math.random().toString(36).slice(2, 8)}`,
    type: 'expense',
    amount: 100,
    currency: 'ARS',
    date: '2026-01-15',
    created_at: '2026-01-15T10:00:00Z',
    ...overrides,
  } as TransactionWithDetails
}

// ─── buildProcessedTransactions ─────────────────────────────────────────────

describe('buildProcessedTransactions', () => {
  it('passes non-transfer transactions through unchanged', () => {
    const income = tx({ id: 'i1', type: 'income', amount: 1000, transaction_kind: 'income', description: 'Sueldo' })
    const expense = tx({ id: 'e1', type: 'expense', amount: 200, transaction_kind: 'expense', description: 'Super' })
    const result = buildProcessedTransactions([income, expense])
    expect(result).toHaveLength(2)
    expect(result.find(r => r.id === 'i1')).toBeDefined()
    expect(result.find(r => r.id === 'e1')).toBeDefined()
  })

  it('collapses two legs with same transfer_group_id into one row', () => {
    const groupId = 'group-abc'
    const expLeg = tx({ id: 'exp1', type: 'expense', transaction_kind: 'transfer', transfer_group_id: groupId, wallet_name: 'Billetera A', date: '2026-01-10' })
    const incLeg = tx({ id: 'inc1', type: 'income',  transaction_kind: 'transfer', transfer_group_id: groupId, wallet_name: 'Billetera B', date: '2026-01-10' })
    const result = buildProcessedTransactions([expLeg, incLeg])
    expect(result).toHaveLength(1)
    expect(result[0]._destinationWalletName).toBe('Billetera B')
    expect(result[0]._isIncomplete).toBeUndefined()
  })

  it('uses expense leg as the display row for a complete transfer pair', () => {
    const groupId = 'group-xyz'
    const expLeg = tx({ id: 'exp2', type: 'expense', transaction_kind: 'transfer', transfer_group_id: groupId, amount: 500, wallet_name: 'Origen' })
    const incLeg = tx({ id: 'inc2', type: 'income',  transaction_kind: 'transfer', transfer_group_id: groupId, amount: 500, wallet_name: 'Destino' })
    const result = buildProcessedTransactions([expLeg, incLeg])
    expect(result[0].id).toBe('exp2')
    expect(result[0].type).toBe('expense')
  })

  it('marks a single-leg transfer as incomplete (_isIncomplete=true)', () => {
    const expLeg = tx({ id: 'lone', type: 'expense', transaction_kind: 'transfer', transfer_group_id: 'group-solo' })
    const result = buildProcessedTransactions([expLeg])
    expect(result).toHaveLength(1)
    expect(result[0]._isIncomplete).toBe(true)
  })

  it('treats a transfer without any group key as a normal (non-collapsed) row', () => {
    const orphan = tx({ id: 'orp', type: 'expense', transaction_kind: 'transfer', transfer_group_id: null, notes: null })
    const result = buildProcessedTransactions([orphan])
    expect(result).toHaveLength(1)
    expect(result[0]._isIncomplete).toBeUndefined()
    expect(result[0]._destinationWalletName).toBeUndefined()
  })

  it('legacy: collapses two legs grouped by notes.transfer_id when no transfer_group_id', () => {
    const legacyNotes = JSON.stringify({ transfer_id: 'legacy-001', from_wallet_id: 'w1', to_wallet_id: 'w2' })
    const expLeg = tx({ id: 'lexp', type: 'expense', label: 'internal_transfer', transfer_group_id: null, notes: legacyNotes, wallet_name: 'Origen', date: '2026-01-05' })
    const incLeg = tx({ id: 'linc', type: 'income',  label: 'internal_transfer', transfer_group_id: null, notes: legacyNotes, wallet_name: 'Destino', date: '2026-01-05' })
    const result = buildProcessedTransactions([expLeg, incLeg])
    expect(result).toHaveLength(1)
    expect(result[0]._destinationWalletName).toBe('Destino')
    expect(result[0]._isIncomplete).toBeUndefined()
  })

  it('detects transfers by legacy label=internal_transfer as well as transaction_kind=transfer', () => {
    const legacyNotes = JSON.stringify({ transfer_id: 'leg-002', from_wallet_id: 'wa', to_wallet_id: 'wb' })
    const expLeg = tx({ id: 'l2exp', type: 'expense', label: 'internal_transfer', transaction_kind: undefined, transfer_group_id: null, notes: legacyNotes })
    const incLeg = tx({ id: 'l2inc', type: 'income',  label: 'internal_transfer', transaction_kind: undefined, transfer_group_id: null, notes: legacyNotes })
    const result = buildProcessedTransactions([expLeg, incLeg])
    expect(result).toHaveLength(1)
  })

  it('sorts results by date descending (most recent first)', () => {
    const old = tx({ id: 'old', type: 'income', transaction_kind: 'income', date: '2026-01-01' })
    const mid = tx({ id: 'mid', type: 'income', transaction_kind: 'income', date: '2026-01-10' })
    const recent = tx({ id: 'new', type: 'income', transaction_kind: 'income', date: '2026-01-20' })
    const result = buildProcessedTransactions([old, recent, mid])
    expect(result[0].id).toBe('new')
    expect(result[1].id).toBe('mid')
    expect(result[2].id).toBe('old')
  })

  it('uses created_at as tiebreaker for same date', () => {
    const first  = tx({ id: 'first',  type: 'income', transaction_kind: 'income', date: '2026-01-15', created_at: '2026-01-15T08:00:00Z' })
    const second = tx({ id: 'second', type: 'income', transaction_kind: 'income', date: '2026-01-15', created_at: '2026-01-15T12:00:00Z' })
    const result = buildProcessedTransactions([first, second])
    expect(result[0].id).toBe('second')
    expect(result[1].id).toBe('first')
  })

  it('handles multiple transfer groups independently', () => {
    const g1exp = tx({ id: 'g1e', type: 'expense', transaction_kind: 'transfer', transfer_group_id: 'g1', wallet_name: 'A', date: '2026-01-15' })
    const g1inc = tx({ id: 'g1i', type: 'income',  transaction_kind: 'transfer', transfer_group_id: 'g1', wallet_name: 'B', date: '2026-01-15' })
    const g2exp = tx({ id: 'g2e', type: 'expense', transaction_kind: 'transfer', transfer_group_id: 'g2', wallet_name: 'C', date: '2026-01-14' })
    const g2inc = tx({ id: 'g2i', type: 'income',  transaction_kind: 'transfer', transfer_group_id: 'g2', wallet_name: 'D', date: '2026-01-14' })
    const result = buildProcessedTransactions([g1exp, g1inc, g2exp, g2inc])
    expect(result).toHaveLength(2)
    const g1row = result.find(r => r._destinationWalletName === 'B')
    const g2row = result.find(r => r._destinationWalletName === 'D')
    expect(g1row).toBeDefined()
    expect(g2row).toBeDefined()
  })

  it('handles empty input', () => {
    expect(buildProcessedTransactions([])).toEqual([])
  })
})
