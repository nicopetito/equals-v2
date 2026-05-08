import type { Currency } from '@/types'

export const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'ARS', label: 'Pesos (ARS)', symbol: '$' },
  { value: 'USD', label: 'Dólares (USD)', symbol: 'US$' },
  { value: 'EUR', label: 'Euros (EUR)', symbol: '€' },
  { value: 'CRYPTO', label: 'Crypto', symbol: '₿' },
]

export const CURRENCY_OPTIONS = [
  { value: 'all' as const, label: 'Todas' },
  ...CURRENCIES.map((c) => ({ value: c.value, label: c.label })),
]

export function getCurrencySymbol(currency: Currency | string): string {
  const map: Record<string, string> = {
    ARS: '$',
    USD: 'US$',
    EUR: '€',
    CRYPTO: '₿',
  }
  return map[currency] ?? currency
}
