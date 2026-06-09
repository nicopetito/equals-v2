export type PendingPaymentType   = 'receivable' | 'payable'
export type PendingPaymentStatus = 'pending' | 'collected' | 'paid' | 'cancelled'

export interface PendingPayment {
  id?: string
  user_id?: string
  type: PendingPaymentType
  person_name: string
  amount: number
  currency: string
  description?: string | null
  due_date?: string | null
  status: PendingPaymentStatus
  wallet_id_on_completion?: string | null
  transaction_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface PendingPaymentFilters {
  type?: PendingPaymentType
  status?: PendingPaymentStatus | PendingPaymentStatus[]
}

export interface PendingPaymentCurrencyGroup {
  receivable: number
  payable: number
}

export interface PendingPaymentSummary {
  byCurrency: Record<string, PendingPaymentCurrencyGroup>
  overdue: number
  count: number
}
