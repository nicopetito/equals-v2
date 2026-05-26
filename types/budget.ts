export interface Budget {
  id: string
  user_id: string
  category_id: string
  month: number
  year: number
  limit_amount: number
  currency: string
  alert_percentage?: number | null
  note?: string | null
  created_at?: string
  updated_at?: string
  // Joined from categories
  category_name?: string
  category_color?: string
  category_icon?: string
}

export interface BudgetCreate {
  category_id: string
  month: number
  year: number
  limit_amount: number
  currency: string
  alert_percentage?: number | null
  note?: string | null
}
