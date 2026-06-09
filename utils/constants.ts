export const INTERNAL_TRANSFER_LABEL    = 'internal_transfer'    as const
export const WALLET_ADJUSTMENT_LABEL    = 'wallet_adjustment'    as const
export const INITIAL_BALANCE_LABEL      = 'initial_balance'      as const
export const RESERVATION_DEPOSIT_LABEL  = 'reservation_deposit'  as const
export const RESERVATION_WITHDRAW_LABEL = 'reservation_withdraw' as const
export const INTERNAL_LABELS = new Set<string>([
  INTERNAL_TRANSFER_LABEL,
  WALLET_ADJUSTMENT_LABEL,
  INITIAL_BALANCE_LABEL,
  RESERVATION_DEPOSIT_LABEL,
  RESERVATION_WITHDRAW_LABEL,
])

export const YIELD_SUBTYPE            = 'yield' as const
export const YIELD_CORRECTION_SUBTYPE = 'correction' as const
export const YIELD_LABEL              = 'yield' as const
