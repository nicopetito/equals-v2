export interface Wallet {
  id?: string
  user_id?: string
  name: string
  provider?: string
  currency?: string
  balance?: number
  created_at?: string
  updated_at?: string
}

export interface WalletWithBalance extends Wallet {
  initial_balance: number
  transaction_total: number
  current_balance: number
  transaction_count: number
}

export interface WalletSummary {
  wallet_id: string
  wallet_name: string
  wallet_provider: string
  currency: string
  balance: number
  icon?: string
}

export const WALLET_PROVIDERS = [
  { name: 'Mercado Pago', icon: 'wallet' },
  { name: 'Ualá', icon: 'credit-card' },
  { name: 'Cash', icon: 'banknote' },
  { name: 'Brubank', icon: 'building-2' },
  { name: 'Banco', icon: 'landmark' },
  { name: 'Binance', icon: 'bitcoin' },
  { name: 'Otro', icon: 'wallet-2' },
] as const

export type WalletProvider = (typeof WALLET_PROVIDERS)[number]['name']
