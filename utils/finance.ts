import { safeNumber } from './format'
import { INTERNAL_LABELS } from './constants'
import type { WalletWithBalance, Goal, FixedTerm, TransactionWithDetails, Refund, Reservation } from '@/types'

// Prefijos usados por RPCs al crear transacciones internas.
// Deben mantenerse sincronizados con las migraciones de Supabase correspondientes.
const GOAL_DEPOSIT_PREFIX    = 'Aporte a objetivo:'
const GOAL_WITHDRAWAL_PREFIX = 'Retiro de objetivo:'
// rpc_refund_credit genera: 'Reintegro: ' + descripción original
export const REFUND_PREFIX = 'Reintegro:'

// Detecta si una transacción es un reintegro acreditado por su prefijo de descripción.
// Mientras no exista un campo `is_refund` en la tabla, esta es la forma de identificarlos.
export function isRefundTransaction(tx: { type: string; description?: string | null }): boolean {
  return tx.type === 'income' && (tx.description ?? '').startsWith(REFUND_PREFIX)
}

export interface SavingsMetrics {
  income: number           // suma de todas las transacciones income (bruto, para KPIs de display)
  expenses: number         // suma de todas las transacciones expense (bruto, para KPIs de display)
  goalDeposits: number     // aportes a objetivos detectados (subconjunto de expenses)
  goalWithdrawals: number  // retiros de objetivos detectados (subconjunto de income)
  refundIncome: number     // reintegros acreditados (subconjunto de income, no son ingresos reales)
  realIncome: number       // income - goalWithdrawals - refundIncome
  consumerExpenses: number // expenses - goalDeposits (gasto real de consumo)
  netGoalFunding: number   // goalDeposits - goalWithdrawals (dinero neto reservado en objetivos)
  savingsRate: number | null // (realIncome - consumerExpenses) / realIncome * 100
}

export function calculateSavingsMetrics(transactions: TransactionWithDetails[]): SavingsMetrics {
  let income = 0
  let expenses = 0
  let goalDeposits = 0
  let goalWithdrawals = 0
  let refundIncome = 0

  for (const tx of transactions) {
    if (tx.label && INTERNAL_LABELS.has(tx.label)) continue

    const amount = safeNumber(tx.amount)
    const desc   = tx.description ?? ''

    if (tx.type === 'income') {
      income += amount
      if (desc.startsWith(GOAL_WITHDRAWAL_PREFIX)) goalWithdrawals += amount
      else if (desc.startsWith(REFUND_PREFIX)) refundIncome += amount
    } else if (tx.type === 'expense') {
      expenses += amount
      if (desc.startsWith(GOAL_DEPOSIT_PREFIX)) goalDeposits += amount
    }
  }

  // realIncome excluye retiros de objetivos (plata que ya era ahorros) y reintegros (ajuste de gasto, no ingreso real)
  const realIncome       = income - goalWithdrawals - refundIncome
  const consumerExpenses = expenses - goalDeposits
  const netGoalFunding   = goalDeposits - goalWithdrawals
  const savingsRate      = realIncome > 0
    ? Math.round(((realIncome - consumerExpenses) / realIncome) * 100)
    : null

  return { income, expenses, goalDeposits, goalWithdrawals, refundIncome, realIncome, consumerExpenses, netGoalFunding, savingsRate }
}

// Suma el total de rendimientos (subtype='yield') en un conjunto de transacciones.
export function calculateYieldForPeriod(transactions: TransactionWithDetails[]): number {
  return transactions
    .filter(tx => tx.subtype === 'yield')
    .reduce((sum, tx) => sum + safeNumber(tx.amount), 0)
}

// Construye un mapa transaction_id → monto total reembolsado y acreditado.
// Solo incluye refunds con status 'credited' — los pending/cancelled/expired no
// reducen el gasto real hasta que el dinero efectivamente vuelve a la billetera.
export function buildCreditedRefundMap(refunds: Refund[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const r of refunds) {
    if (r.status !== 'credited' || !r.original_transaction_id) continue
    const prev = map.get(r.original_transaction_id) ?? 0
    map.set(r.original_transaction_id, prev + safeNumber(r.amount))
  }
  return map
}

export interface NetWorthBreakdown {
  liquid: number
  reserved: number
  goals: number
  // investments = capital (principal_amount)
  investments: number
  // investmentsInterest = interés estimado no realizado (estimated_total - principal_amount)
  // Solo se incluye si el plazo fijo tiene estimated_total > principal_amount
  investmentsInterest: number
  // investmentsEstimated = investments + investmentsInterest (valor total estimado de plazo fijo)
  investmentsEstimated: number
  total: number
}

export function calculateNetWorth(
  wallets: WalletWithBalance[],
  goals: Goal[],
  fixedTerms: FixedTerm[],
  reservations: Reservation[] = []
): Record<string, NetWorthBreakdown> {
  const result: Record<string, NetWorthBreakdown> = {}

  const ensure = (currency: string) => {
    if (!result[currency]) result[currency] = {
      liquid: 0, reserved: 0, goals: 0,
      investments: 0, investmentsInterest: 0, investmentsEstimated: 0,
      total: 0,
    }
    return result[currency]
  }

  wallets.forEach(w => {
    if (!w.currency) return
    if (w.include_in_balance === false) return
    const val = safeNumber(w.current_balance)
    const r = ensure(w.currency)
    r.liquid += val
    r.total  += val
  })

  reservations.filter(r => r.status === 'active').forEach(r => {
    const currency = r.currency ?? 'ARS'
    const val = safeNumber(r.amount)
    const bucket = ensure(currency)
    bucket.reserved += val
    bucket.total    += val
  })

  goals.filter(g => !g.is_completed).forEach(g => {
    const currency = g.currency ?? 'ARS'
    const val = safeNumber(g.current_amount)
    const r = ensure(currency)
    r.goals += val
    r.total += val
  })

  fixedTerms.filter(ft => ft.status === 'active').forEach(ft => {
    const principal  = safeNumber(ft.principal_amount)
    const estimated  = safeNumber(ft.estimated_total)
    // Use estimated_total if it exists and is greater than principal; otherwise fall back to principal
    const investVal  = estimated > principal ? estimated : principal
    const interest   = Math.max(0, investVal - principal)

    const r = ensure(ft.currency)
    r.investments         += principal
    r.investmentsInterest += interest
    r.investmentsEstimated += investVal
    // Total uses estimated value to reflect the best current projection
    r.total += investVal
  })

  return result
}
