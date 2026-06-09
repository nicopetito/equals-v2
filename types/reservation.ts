export interface Reservation {
  id?: string
  user_id?: string
  wallet_id?: string | null
  name: string
  description?: string | null
  amount: number
  currency: string
  status: 'active' | 'completed' | 'cancelled'
  created_at?: string
  updated_at?: string
}

export interface ReservationMovement {
  id?: string
  reservation_id: string
  user_id?: string
  type: 'deposit' | 'withdrawal'
  amount: number
  transaction_id?: string | null
  note?: string | null
  created_at?: string
}
