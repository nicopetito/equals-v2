export type RecurringCadence =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'

export interface RecurringTransaction {
  id?: string
  user_id?: string
  description: string
  category_id?: string | null
  amount: number
  currency?: string
  wallet_id?: string | null
  type: 'income' | 'expense'
  cadence: RecurringCadence
  next_date: string
  active?: boolean
  created_at?: string
  updated_at?: string
}

export interface RecurringTransactionWithDetails extends RecurringTransaction {
  category_name?: string
  category_color?: string
  category_icon?: string
  wallet_name?: string
  wallet_provider?: string
}

export const RECURRING_CADENCES: { value: RecurringCadence; label: string }[] = [
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
]
