export type RefundStatus = 'pending' | 'credited' | 'expired' | 'cancelled'
export type RefundRuleType = 'percentage' | 'fixed' | 'percentage_cap'

export interface Refund {
  id: string
  user_id: string
  original_transaction_id: string | null
  destination_wallet_id: string | null
  amount: number
  currency: string
  status: RefundStatus
  expected_date: string | null
  credited_at: string | null
  credited_transaction_id: string | null
  rule_type: RefundRuleType
  percentage: number | null
  cap_amount: number | null
  note: string | null
  created_at: string
  updated_at: string
}

export interface RefundCreateParams {
  original_transaction_id: string
  destination_wallet_id: string
  amount: number
  currency: string
  rule_type: RefundRuleType
  percentage: number | null
  cap_amount: number | null
  expected_date: string | null
  note: string | null
}

export interface RefundFormState {
  enabled: boolean
  rule_type: RefundRuleType
  percentage: string
  fixed_amount: string
  cap_amount: string
  expected_date: string
  destination_wallet_id: string
  note: string
}
