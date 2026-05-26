export interface Goal {
  id?: string
  user_id?: string
  name: string
  description?: string
  target_amount: number
  current_amount: number
  category?: string
  currency?: string
  wallet_id?: string
  icon?: string
  color?: string
  target_date?: string
  is_completed: boolean
  completed_at?: string
  created_at?: string
  updated_at?: string
}

export interface GoalMovement {
  id?: string
  goal_id: string
  user_id?: string
  amount: number
  type: 'deposit' | 'withdrawal'
  description?: string
  transaction_id?: string
  wallet_id?: string
  created_at?: string
}

export interface GoalWithMovements extends Goal {
  movements?: GoalMovement[]
}
