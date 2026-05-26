import type { Currency } from '@/types'

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  ARS: '$',
  USD: 'US$',
  EUR: '€',
  CRYPTO: '₿',
}

/**
 * Convierte cualquier valor a un número finito seguro.
 * Supabase retorna columnas NUMERIC/DECIMAL de PostgreSQL como strings,
 * lo que produce NaN cuando se usan en operaciones aritméticas con += o +.
 */
export function safeNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

export function formatCurrency(amount: number | string | null | undefined, currency: Currency | string): string {
  const safe = safeNumber(amount)
  const symbol = CURRENCY_SYMBOLS[currency as Currency] ?? currency
  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(safe))
  return `${symbol} ${formatted}`
}

export function formatAmount(amount: number | string | null | undefined): string {
  const safe = safeNumber(amount)
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe)
}

export function roundMoney(amount: number): number {
  return Math.round((safeNumber(amount) + Number.EPSILON) * 100) / 100
}

export function calculateExchange(
  amount: number,
  rate: number,
  direction: 'ars_to_usd' | 'usd_to_ars'
): number {
  const safeAmt  = safeNumber(amount)
  const safeRate = safeNumber(rate)
  if (safeRate <= 0) return 0
  return direction === 'ars_to_usd'
    ? roundMoney(safeAmt / safeRate)
    : roundMoney(safeAmt * safeRate)
}
