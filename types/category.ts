export interface Category {
  id?: string
  user_id?: string
  name: string
  type: 'income' | 'expense'
  color?: string
  icon?: string
  is_system?: boolean
  is_default?: boolean
  created_at?: string
  updated_at?: string
}
