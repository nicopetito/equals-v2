import type { Currency } from '@/types'

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  ARS: '$',
  USD: 'US$',
  EUR: '€',
  CRYPTO: '₿',
}

export function formatCurrency(amount: number, currency: Currency | string): string {
  const symbol = CURRENCY_SYMBOLS[currency as Currency] ?? currency
  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
  return `${symbol} ${formatted}`
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
