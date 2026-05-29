export type Currency = 'ARS' | 'USD' | 'EUR' | 'CRYPTO'
export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id?: string
  user_id?: string
  description: string
  amount: number
  type: TransactionType
  currency: Currency
  crypto_type?: string | null
  category_id?: string | null
  wallet_id?: string | null
  date: string
  is_recurring?: boolean
  recurring_id?: string | null
  notes?: string | null
  label?: string | null
  created_at?: string
  updated_at?: string
}

export interface TransactionWithDetails extends Transaction {
  category_name?: string
  category_color?: string
  category_icon?: string
  wallet_name?: string
  wallet_provider?: string
}

export interface TransactionFilters {
  type?: TransactionType | 'all'
  category_ids?: string[]
  wallet_ids?: string[]
  currency?: Currency
  from?: string
  to?: string
  is_recurring?: boolean
  search?: string
}

export type TransactionSortField = 'date' | 'amount' | 'description'
export type SortOrder = 'asc' | 'desc'

export interface TransactionSort {
  field: TransactionSortField
  order: SortOrder
}

export interface TransactionStatistics {
  total_income: number
  total_expenses: number
  net_balance: number
  transaction_count: number
  income_count: number
  expense_count: number
  currency: string
  avg_income: number
  avg_expense: number
}

export interface CategoryDistribution {
  category_id: string
  category_name: string
  category_color: string
  category_icon: string
  transaction_count: number
  total_amount: number
  percentage: number
}

export interface MonthlyTrend {
  month: string
  month_label: string
  income: number
  expenses: number
  net: number
  transaction_count: number
}

export interface DailyData {
  date: string
  income: number
  expenses: number
  net: number
}
