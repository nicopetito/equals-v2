export type FixedTermStatus = 'active' | 'matured' | 'withdrawn' | 'reinvested' | 'cancelled'

export interface FixedTerm {
  id: string
  user_id: string
  name: string
  principal_amount: number
  currency: string
  tna: number
  term_days: number
  start_date: string
  maturity_date: string
  estimated_interest: number
  estimated_total: number
  wallet_id: string | null
  status: FixedTermStatus
  auto_reinvest: boolean
  note: string | null
  created_at: string
  updated_at: string
}
