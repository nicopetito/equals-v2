import { safeNumber, roundMoney } from '@/utils/format'
import type { RefundRuleType, RefundFormState, RefundCreateParams } from '@/types'

export function calculateRefundAmount(
  expenseAmount: number,
  ruleType: RefundRuleType,
  percentage: number | null,
  capAmount: number | null,
): number {
  const e = safeNumber(expenseAmount)
  const p = safeNumber(percentage)
  const c = safeNumber(capAmount)

  if (e <= 0) return 0

  switch (ruleType) {
    case 'percentage':
      if (p <= 0 || p > 100) return 0
      return roundMoney((e * p) / 100)

    case 'fixed':
      if (c <= 0) return 0
      return roundMoney(c)

    case 'percentage_cap': {
      if (p <= 0 || p > 100 || c <= 0) return 0
      return roundMoney(Math.min((e * p) / 100, c))
    }

    default:
      return 0
  }
}

export function validateRefundRule(
  form: RefundFormState,
  expenseAmount: number,
  transactionDate: string,
): string | null {
  if (!form.enabled) return null

  if (!form.destination_wallet_id) {
    return 'Seleccioná una billetera de destino para el reintegro'
  }

  const pct = parseFloat(form.percentage)
  const cap = parseFloat(form.cap_amount)
  const fix = parseFloat(form.fixed_amount)

  switch (form.rule_type) {
    case 'percentage':
      if (isNaN(pct) || pct <= 0 || pct > 100) {
        return 'El porcentaje debe estar entre 0.01 y 100'
      }
      break
    case 'fixed':
      if (isNaN(fix) || fix <= 0) {
        return 'El monto fijo del reintegro debe ser mayor a 0'
      }
      break
    case 'percentage_cap':
      if (isNaN(pct) || pct <= 0 || pct > 100) {
        return 'El porcentaje debe estar entre 0.01 y 100'
      }
      if (isNaN(cap) || cap <= 0) {
        return 'El tope del reintegro debe ser mayor a 0'
      }
      break
  }

  const pctForCalc = form.rule_type !== 'fixed' ? pct : null
  const capForCalc = form.rule_type === 'fixed' ? fix : form.rule_type === 'percentage_cap' ? cap : null

  const calculatedAmount = calculateRefundAmount(
    safeNumber(expenseAmount),
    form.rule_type,
    pctForCalc,
    capForCalc,
  )

  if (calculatedAmount <= 0) {
    return 'El monto calculado del reintegro debe ser mayor a 0'
  }
  if (calculatedAmount > safeNumber(expenseAmount)) {
    return 'El reintegro no puede superar el monto del gasto'
  }

  if (form.expected_date) {
    const txDate = transactionDate || new Date().toISOString().split('T')[0]
    if (form.expected_date < txDate) {
      return 'La fecha de reintegro no puede ser anterior a la fecha del gasto'
    }
  }

  return null
}

export function buildRefundPayload(
  form: RefundFormState,
  originalTransactionId: string,
  expenseAmount: number,
  currency: string,
): RefundCreateParams {
  const pct = parseFloat(form.percentage)
  const cap = parseFloat(form.cap_amount)
  const fix = parseFloat(form.fixed_amount)

  const pctForCalc = form.rule_type !== 'fixed' ? pct : null
  const capForCalc = form.rule_type === 'fixed' ? fix : form.rule_type === 'percentage_cap' ? cap : null

  const amount = calculateRefundAmount(expenseAmount, form.rule_type, pctForCalc, capForCalc)

  return {
    original_transaction_id: originalTransactionId,
    destination_wallet_id: form.destination_wallet_id,
    amount,
    currency,
    rule_type: form.rule_type,
    percentage: form.rule_type !== 'fixed' ? safeNumber(pct) : null,
    cap_amount: form.rule_type !== 'percentage' ? safeNumber(capForCalc ?? 0) : null,
    expected_date: form.expected_date || null,
    note: form.note.trim() || null,
  }
}
