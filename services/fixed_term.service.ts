import { createClient } from '@/lib/supabase/client'
import { safeNumber } from '@/utils/format'
import type { FixedTerm } from '@/types'

function getSupabase() {
  return createClient()
}

async function getUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser()
  return data.user?.id ?? null
}

function parseFixedTerm(raw: Record<string, unknown>): FixedTerm {
  return {
    ...raw,
    principal_amount:    safeNumber(raw.principal_amount),
    tna:                 safeNumber(raw.tna),
    term_days:           safeNumber(raw.term_days),
    estimated_interest:  safeNumber(raw.estimated_interest),
    estimated_total:     safeNumber(raw.estimated_total),
  } as FixedTerm
}

export const fixedTermService = {
  async list(): Promise<FixedTerm[]> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return []

    const { data, error } = await supabase
      .from('fixed_terms')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })

    if (error) {
      // Table doesn't exist yet (migration pending) — show empty state instead of crashing
      if (error.code === '42P01' || error.message?.includes('does not exist')) return []
      throw error
    }
    return (data ?? []).map(parseFixedTerm)
  },

  /**
   * Crea un plazo fijo y descuenta el capital de la billetera origen como expense.
   * Paso 1: insertar fixed_term
   * Paso 2: registrar expense transaction en wallet
   */
  async create(params: {
    name: string
    principal_amount: number
    currency: string
    tna: number
    term_days: number
    start_date: string
    maturity_date: string
    estimated_interest: number
    estimated_total: number
    wallet_id: string
    note?: string
  }): Promise<FixedTerm> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data: ft, error: ftError } = await supabase
      .from('fixed_terms')
      .insert([{ ...params, user_id, status: 'active', auto_reinvest: false }])
      .select()
      .single()

    if (ftError) throw new Error(`No se pudo crear el plazo fijo: ${ftError.message}`)

    const { error: txError } = await supabase
      .from('transactions')
      .insert([{
        user_id,
        description: `Plazo fijo: ${params.name}`,
        amount: params.principal_amount,
        type: 'expense',
        currency: params.currency,
        wallet_id: params.wallet_id,
        date: params.start_date,
      }])

    if (txError) {
      console.error('[fixedTerm.create] wallet tx failed after ft insert:', txError.message)
      throw new Error(`El plazo fijo se creó pero no se pudo descontar de la billetera: ${txError.message}`)
    }

    return parseFixedTerm(ft as Record<string, unknown>)
  },

  async update(id: string, data: Partial<FixedTerm>): Promise<FixedTerm> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data: updated, error } = await supabase
      .from('fixed_terms')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) throw error
    return parseFixedTerm(updated as Record<string, unknown>)
  },

  /**
   * Retira el dinero al vencimiento: registra income transaction y marca como withdrawn.
   * Paso 1: income tx en billetera destino
   * Paso 2: actualizar estado del plazo fijo
   */
  async withdraw(params: {
    fixedTermId: string
    fixedTermName: string
    walletId: string
    amount: number
    currency: string
  }): Promise<void> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { error: txError } = await supabase
      .from('transactions')
      .insert([{
        user_id,
        description: `Retiro plazo fijo: ${params.fixedTermName}`,
        amount: params.amount,
        type: 'income',
        currency: params.currency,
        wallet_id: params.walletId,
        date: new Date().toISOString().split('T')[0],
      }])

    if (txError) throw new Error(`No se pudo registrar el retiro: ${txError.message}`)

    const { error: ftError } = await supabase
      .from('fixed_terms')
      .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
      .eq('id', params.fixedTermId)
      .eq('user_id', user_id)

    if (ftError) {
      console.error('[fixedTerm.withdraw] status update failed after income tx:', ftError.message)
      throw new Error(`El retiro se registró pero no se pudo actualizar el estado: ${ftError.message}`)
    }
  },

  /**
   * Reinvierte al vencimiento:
   * Paso 1: income tx (retiro del plazo viejo)
   * Paso 2: marcar plazo viejo como reinvested
   * Paso 3: insertar nuevo plazo fijo
   * Paso 4: expense tx (descuento del nuevo capital)
   */
  async reinvest(params: {
    oldFixedTermId: string
    oldFixedTermName: string
    walletId: string
    oldTotal: number
    newPrincipal: number
    currency: string
    tna: number
    termDays: number
    startDate: string
    maturityDate: string
    estimatedInterest: number
    estimatedTotal: number
    note?: string
  }): Promise<FixedTerm> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')
    const today = new Date().toISOString().split('T')[0]

    // Paso 1: income tx del plazo viejo
    const { error: incomeTxError } = await supabase
      .from('transactions')
      .insert([{
        user_id,
        description: `Retiro para renovar: ${params.oldFixedTermName}`,
        amount: params.oldTotal,
        type: 'income',
        currency: params.currency,
        wallet_id: params.walletId,
        date: today,
      }])

    if (incomeTxError) throw new Error(`No se pudo registrar el retiro del plazo anterior: ${incomeTxError.message}`)

    // Paso 2: marcar viejo como reinvested
    const { error: oldFtError } = await supabase
      .from('fixed_terms')
      .update({ status: 'reinvested', updated_at: new Date().toISOString() })
      .eq('id', params.oldFixedTermId)
      .eq('user_id', user_id)

    if (oldFtError) {
      console.error('[fixedTerm.reinvest] old status update failed:', oldFtError.message)
    }

    // Paso 3: insertar nuevo plazo fijo
    const { data: newFt, error: newFtError } = await supabase
      .from('fixed_terms')
      .insert([{
        user_id,
        name: params.oldFixedTermName,
        principal_amount: params.newPrincipal,
        currency: params.currency,
        tna: params.tna,
        term_days: params.termDays,
        start_date: params.startDate,
        maturity_date: params.maturityDate,
        estimated_interest: params.estimatedInterest,
        estimated_total: params.estimatedTotal,
        wallet_id: params.walletId,
        status: 'active',
        auto_reinvest: false,
        note: params.note ?? null,
      }])
      .select()
      .single()

    if (newFtError) throw new Error(`No se pudo crear el nuevo plazo fijo: ${newFtError.message}`)

    // Paso 4: expense tx del nuevo capital
    const { error: expenseTxError } = await supabase
      .from('transactions')
      .insert([{
        user_id,
        description: `Renovación plazo fijo: ${params.oldFixedTermName}`,
        amount: params.newPrincipal,
        type: 'expense',
        currency: params.currency,
        wallet_id: params.walletId,
        date: params.startDate,
      }])

    if (expenseTxError) {
      console.error('[fixedTerm.reinvest] expense tx failed:', expenseTxError.message)
      throw new Error(`El plazo fijo se renovó pero no se pudo descontar de la billetera: ${expenseTxError.message}`)
    }

    return parseFixedTerm(newFt as Record<string, unknown>)
  },
}
