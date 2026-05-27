import { createClient } from '@/lib/supabase/client'

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
  async createConversionAtomic(payload: ExchangePayload): Promise<void> {
    const supabase = getSupabase()
    const user_id  = await getUserId()
    if (!user_id) throw new Error('No autenticado')

    const { fromWalletId, toWalletId, fromAmount, toAmount,
            fromCurrency, toCurrency, exchangeRate,
            exchangeType, operationType, date } = payload

    const rateFormatted = new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(exchangeRate)
    const description = `Conversión ${fromCurrency} → ${toCurrency} · ${exchangeType} ${operationType} $${rateFormatted}`

    const { error } = await supabase.rpc('rpc_exchange_conversion', {
      p_from_wallet_id: fromWalletId,
      p_to_wallet_id:   toWalletId,
      p_from_amount:    fromAmount,
      p_to_amount:      toAmount,
      p_from_currency:  fromCurrency,
      p_to_currency:    toCurrency,
      p_exchange_rate:  exchangeRate,
      p_exchange_type:  exchangeType,
      p_operation_type: operationType,
      p_date:           date,
      p_description:    description,
    })

    if (error) throw new Error(error.message)
  },
}
