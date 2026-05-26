import type { RefundRuleType } from './refund'

export interface RefundRuleSnapshot {
  rule_type: RefundRuleType
  percentage: number | null
  cap_amount: number | null
  expected_days: number
  destination_wallet_id: string
  note: string | null
}

export interface TransactionTemplate {
  id: string
  user_id: string
  name: string
  type: 'income' | 'expense'
  suggested_amount: number | null
  currency: string
  category_id: string | null
  wallet_id: string | null
  description: string | null
  icon: string | null
  color: string | null
  has_refund_rule: boolean
  refund_rule: RefundRuleSnapshot | null
  sort_order: number
  is_active: boolean
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export type TransactionTemplateCreate = Omit<
  TransactionTemplate,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>
