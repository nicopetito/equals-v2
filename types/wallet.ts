export type WalletType = 'cash' | 'bank' | 'digital' | 'investment'

export const WALLET_TYPE_OPTIONS = [
  { value: 'cash',       label: 'Efectivo',           icon: 'banknote'    },
  { value: 'bank',       label: 'Cuenta bancaria',    icon: 'landmark'    },
  { value: 'digital',    label: 'Billetera virtual',  icon: 'wallet'      },
  { value: 'investment', label: 'Inversión / Crypto', icon: 'trending-up' },
] as const

export const WALLET_NAME_SUGGESTIONS: Record<string, string[]> = {
  'cash_ARS':          ['Efectivo pesos', 'Caja en ARS'],
  'cash_USD':          ['Dólares efectivo', 'Efectivo USD'],
  'cash_EUR':          ['Euros efectivo', 'Efectivo EUR'],
  'bank_ARS':          ['Cuenta corriente', 'Caja de ahorro'],
  'bank_USD':          ['Caja de ahorro USD'],
  'digital_ARS':       ['Mercado Pago', 'Ualá', 'Cuenta digital'],
  'investment_CRYPTO': ['Binance', 'Crypto wallet'],
}

export interface Wallet {
  id?: string
  user_id?: string
  name: string
  provider?: string
  currency?: string
  wallet_type?: WalletType
  include_in_balance?: boolean
  balance?: number
  generates_yield?: boolean
  yield_mode?: 'estimated' | 'manual'
  annual_yield_rate?: number | null
  yield_frequency?: 'daily' | 'business_days'
  last_yield_calculated_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface WalletWithBalance extends Wallet {
  initial_balance: number
  transaction_total: number
  current_balance: number
  transaction_count: number
  yield_month_total?: number
}

export interface WalletDiagnostic {
  wallet_id: string
  wallet_name: string
  currency: string
  initial_balance: number
  income_total: number
  expense_total: number
  computed_balance: number
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
