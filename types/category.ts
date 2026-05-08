export interface Category {
  id?: string
  user_id?: string
  name: string
  type: 'income' | 'expense'
  color?: string
  icon?: string
  created_at?: string
  updated_at?: string
}

export interface DefaultCategory extends Category {
  is_default: true
}
