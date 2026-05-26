import { createClient } from '@/lib/supabase/client'
import type { Transaction } from '@/types'

export interface ExchangePayload {
  fromWalletId: string
  toWalletId: string
  fromAmount: number
  toAmount: number
  fromCurrency: 'ARS' | 'USD' | 'EUR'
  toCurrency: 'ARS' | 'USD' | 'EUR'
  exchangeRate: number
  exchangeType: string
  operationType: 'compra' | 'venta'
  date: string
}

function getSupabase() {
  return createClient()
}

async function getUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser()
  return data.user?.id ?? null
}

export const exchangeService = {
  async createConversion(payload: ExchangePayload): Promise<void> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('No autenticado')

    const {
      fromWalletId, toWalletId, fromAmount, toAmount,
      fromCurrency, toCurrency, exchangeRate,
      exchangeType, operationType, date,
    } = payload

    const conversion_id = crypto.randomUUID()

    const notes = JSON.stringify({
      conversion_id,
      exchange_rate: exchangeRate,
      exchange_type: exchangeType,
      operation: operationType,
      from_wallet_id: fromWalletId,
      to_wallet_id: toWalletId,
      from_amount: fromAmount,
      from_currency: fromCurrency,
      to_amount: toAmount,
      to_currency: toCurrency,
    })

    const rateFormatted = new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(exchangeRate)

    const description = `Conversión ${fromCurrency} → ${toCurrency} · ${exchangeType} ${operationType} $${rateFormatted}`

    const expenseTx: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
      description,
      amount: fromAmount,
      type: 'expense',
      currency: fromCurrency,
      wallet_id: fromWalletId,
      date,
      notes,
    }

    const { data: leg1, error: err1 } = await supabase
      .from('transactions')
      .insert([{ ...expenseTx, user_id }])
      .select()
      .single()

    if (err1) {
      throw new Error(`No se pudo registrar el débito: ${err1.message}`)
    }

    const incomeTx: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
      description,
      amount: toAmount,
      type: 'income',
      currency: toCurrency,
      wallet_id: toWalletId,
      date,
      notes,
    }

    const { error: err2 } = await supabase
      .from('transactions')
      .insert([{ ...incomeTx, user_id }])
      .select()
      .single()

    if (err2) {
      // Compensating: revert leg 1 to avoid leaving an orphan expense
      // TODO: replace with a Supabase RPC for true atomicity
      await supabase
        .from('transactions')
        .delete()
        .eq('id', leg1.id)
        .eq('user_id', user_id)

      throw new Error(`No se pudo registrar el crédito y se revirtió el débito: ${err2.message}`)
    }
  },
}
