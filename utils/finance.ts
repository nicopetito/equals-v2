import { safeNumber } from './format'
import type { WalletWithBalance, Goal, FixedTerm, TransactionWithDetails, Refund } from '@/types'

// Prefijos usados por goalsService.deposit() y goalsService.withdraw()
// al crear las transacciones correspondientes. Deben mantenerse sincronizados
// con goals.service.ts si esas descripciones cambian en el futuro.
const GOAL_DEPOSIT_PREFIX    = 'Aporte a objetivo:'
const GOAL_WITHDRAWAL_PREFIX = 'Retiro de objetivo:'

export interface SavingsMetrics {
  income: number           // suma de todas las transacciones income (bruto, para KPIs)
  expenses: number         // suma de todas las transacciones expense (bruto, para KPIs)
  goalDeposits: number     // aportes a objetivos detectados (subconjunto de expenses)
  goalWithdrawals: number  // retiros de objetivos detectados (subconjunto de income)
  realIncome: number       // income - goalWithdrawals (ingresos que no liberan ahorro previo)
  consumerExpenses: number // expenses - goalDeposits (gasto real de consumo)
  netGoalFunding: number   // goalDeposits - goalWithdrawals (dinero neto reservado en objetivos)
  savingsRate: number | null // (realIncome - consumerExpenses) / realIncome * 100
}

export function calculateSavingsMetrics(transactions: TransactionWithDetails[]): SavingsMetrics {
  let income = 0
  let expenses = 0
  let goalDeposits = 0
  let goalWithdrawals = 0

  for (const tx of transactions) {
    const amount = safeNumber(tx.amount)
    const desc   = tx.description ?? ''

    if (tx.type === 'income') {
      income += amount
      if (desc.startsWith(GOAL_WITHDRAWAL_PREFIX)) goalWithdrawals += amount
    } else if (tx.type === 'expense') {
      expenses += amount
      if (desc.startsWith(GOAL_DEPOSIT_PREFIX)) goalDeposits += amount
    }
  }

  const realIncome       = income - goalWithdrawals
  const consumerExpenses = expenses - goalDeposits
  const netGoalFunding   = goalDeposits - goalWithdrawals
  const savingsRate      = realIncome > 0
    ? Math.round(((realIncome - consumerExpenses) / realIncome) * 100)
    : null

  return { income, expenses, goalDeposits, goalWithdrawals, realIncome, consumerExpenses, netGoalFunding, savingsRate }
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
  goals: number
  investments: number
  total: number
}

export function calculateNetWorth(
  wallets: WalletWithBalance[],
  goals: Goal[],
  fixedTerms: FixedTerm[]
): Record<string, NetWorthBreakdown> {
  const result: Record<string, NetWorthBreakdown> = {}

  const ensure = (currency: string) => {
    if (!result[currency]) result[currency] = { liquid: 0, goals: 0, investments: 0, total: 0 }
    return result[currency]
  }

  wallets.forEach(w => {
    if (!w.currency) return
    const val = safeNumber(w.current_balance)
    const r = ensure(w.currency)
    r.liquid += val
    r.total  += val
  })

  goals.filter(g => !g.is_completed).forEach(g => {
    const currency = g.currency ?? 'ARS'
    const val = safeNumber(g.current_amount)
    const r = ensure(currency)
    r.goals += val
    r.total += val
  })

  fixedTerms.filter(ft => ft.status === 'active').forEach(ft => {
    const val = safeNumber(ft.principal_amount)
    const r = ensure(ft.currency)
    r.investments += val
    r.total += val
  })

  return result
}
