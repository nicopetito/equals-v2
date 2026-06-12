export const INTERNAL_TRANSFER_LABEL    = 'internal_transfer'    as const
export const WALLET_ADJUSTMENT_LABEL    = 'wallet_adjustment'    as const
export const INITIAL_BALANCE_LABEL      = 'initial_balance'      as const
export const RESERVATION_DEPOSIT_LABEL  = 'reservation_deposit'  as const
export const RESERVATION_WITHDRAW_LABEL = 'reservation_withdraw' as const

// INTERNAL_LABELS: mecanismo legado de exclusión por campo `label`.
// Se mantiene para compatibilidad con transacciones históricas anteriores a migration 037.
// El sistema nuevo usa `transaction_kind` (REAL_TRANSACTION_KINDS).
export const INTERNAL_LABELS = new Set<string>([
  INTERNAL_TRANSFER_LABEL,
  WALLET_ADJUSTMENT_LABEL,
  INITIAL_BALANCE_LABEL,
  RESERVATION_DEPOSIT_LABEL,
  RESERVATION_WITHDRAW_LABEL,
])

// transaction_kind values que representan actividad financiera real del usuario.
// Todos los demás kinds son movimientos internos/técnicos que no cuentan como
// ingreso o gasto real en los KPIs.
export const REAL_TRANSACTION_KINDS = new Set<string>([
  'income',
  'expense',
  'refund_credit',
])

// Textos legibles para mostrar en UI por transaction_kind.
export const KIND_COPY: Record<string, string> = {
  income:             'Ingreso',
  expense:            'Gasto',
  transfer:           'Transferencia interna',
  initial_balance:    'Saldo inicial',
  wallet_adjustment:  'Ajuste de saldo',
  reserve_deposit:    'Depósito a reserva',
  reserve_withdrawal: 'Retiro de reserva',
  yield:              'Rendimiento',
  refund_credit:      'Reintegro acreditado',
}

// Textos legibles para el campo `label` (legado, para transacciones antiguas).
export const LABEL_COPY: Record<string, string> = {
  initial_balance:      'Saldo inicial',
  internal_transfer:    'Transferencia interna',
  wallet_adjustment:    'Ajuste de saldo',
  reservation_deposit:  'Depósito de reserva',
  reservation_withdraw: 'Retiro de reserva',
  yield:                'Rendimiento',
}

// Parsea el JSON del campo notes de una transacción interna para obtener transfer_id.
export function parseTransferNotes(notes: string | null | undefined): {
  transfer_id: string; from_wallet_id: string; to_wallet_id: string
} | null {
  if (!notes) return null
  try {
    const p = JSON.parse(notes)
    return p?.transfer_id ? p : null
  } catch { return null }
}

export const YIELD_SUBTYPE            = 'yield' as const
export const YIELD_CORRECTION_SUBTYPE = 'correction' as const
export const YIELD_LABEL              = 'yield' as const
