export const INTERNAL_TRANSFER_LABEL    = 'internal_transfer'    as const
export const WALLET_ADJUSTMENT_LABEL    = 'wallet_adjustment'    as const
export const INITIAL_BALANCE_LABEL      = 'initial_balance'      as const
export const RESERVATION_DEPOSIT_LABEL  = 'reservation_deposit'  as const
export const RESERVATION_WITHDRAW_LABEL = 'reservation_withdraw' as const

// Transferencias, ajustes, reservas y saldo inicial: se excluyen de los KPIs de
// ingresos/gastos del período. El saldo inicial no es un ingreso real del período;
// sigue afectando el balance de la billetera (vía wallet_current_balance view).
export const INTERNAL_LABELS = new Set<string>([
  INTERNAL_TRANSFER_LABEL,
  WALLET_ADJUSTMENT_LABEL,
  INITIAL_BALANCE_LABEL,
  RESERVATION_DEPOSIT_LABEL,
  RESERVATION_WITHDRAW_LABEL,
])

// Textos legibles para mostrar en UI en lugar de los valores técnicos de label.
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
