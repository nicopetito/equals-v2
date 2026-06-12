import type { TransactionWithDetails } from '@/types'
import { INTERNAL_TRANSFER_LABEL, parseTransferNotes } from '@/utils/constants'

export type DisplayTransaction = TransactionWithDetails & {
  _destinationWalletName?: string
  _isIncomplete?: boolean
}

// Colapsa los pares expense+income de transferencias internas en una sola fila.
// Usa transfer_group_id como clave primaria (post-migración 038), con fallback a
// notes.transfer_id para transferencias legacy. Detecta pares incompletos.
export function buildProcessedTransactions(
  transactions: TransactionWithDetails[]
): DisplayTransaction[] {
  const transferMap = new Map<string, TransactionWithDetails[]>()
  const nonTransfer: TransactionWithDetails[] = []

  for (const tx of transactions) {
    const isTransfer = tx.transaction_kind === 'transfer' || tx.label === INTERNAL_TRANSFER_LABEL
    if (!isTransfer) { nonTransfer.push(tx); continue }

    const groupKey = tx.transfer_group_id
      ?? parseTransferNotes(tx.notes)?.transfer_id
      ?? null
    if (!groupKey) { nonTransfer.push(tx); continue }

    const legs = transferMap.get(groupKey) ?? []
    legs.push(tx)
    transferMap.set(groupKey, legs)
  }

  const transferRows: DisplayTransaction[] = []
  for (const [, legs] of transferMap) {
    const expLeg = legs.find(t => t.type === 'expense') ?? legs[0]
    const incLeg = legs.find(t => t.type === 'income')
    transferRows.push({
      ...expLeg,
      _destinationWalletName: incLeg?.wallet_name ?? undefined,
      _isIncomplete: legs.length !== 2 || !incLeg ? true : undefined,
    })
  }

  return [...nonTransfer, ...transferRows]
    .sort((a, b) => b.date.localeCompare(a.date) || (b.created_at ?? '').localeCompare(a.created_at ?? ''))
}
