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

  async createAtomic(params: {
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
  }): Promise<{ fixedTermId: string; transactionId: string }> {
    const supabase = getSupabase()
    const user_id  = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase.rpc('rpc_fixed_term_create', {
      p_wallet_id:          params.wallet_id,
      p_name:               params.name,
      p_principal_amount:   params.principal_amount,
      p_currency:           params.currency,
      p_tna:                params.tna,
      p_term_days:          params.term_days,
      p_start_date:         params.start_date,
      p_maturity_date:      params.maturity_date,
      p_estimated_interest: params.estimated_interest,
      p_estimated_total:    params.estimated_total,
      p_note:               params.note ?? null,
    })

    if (error) throw new Error(error.message)
    const result = data as { fixed_term_id: string; transaction_id: string }
    return { fixedTermId: result.fixed_term_id, transactionId: result.transaction_id }
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

  async withdrawAtomic(params: {
    fixedTermId: string
    walletId: string
    amount: number
    currency: string
  }): Promise<void> {
    const supabase = getSupabase()
    const user_id  = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { error } = await supabase.rpc('rpc_fixed_term_withdraw', {
      p_fixed_term_id: params.fixedTermId,
      p_wallet_id:     params.walletId,
      p_amount:        params.amount,
      p_currency:      params.currency,
    })

    if (error) throw new Error(error.message)
  },

  async reinvestAtomic(params: {
    oldFixedTermId:    string
    walletId:          string
    oldTotal:          number
    newPrincipal:      number
    currency:          string
    tna:               number
    termDays:          number
    startDate:         string
    maturityDate:      string
    estimatedInterest: number
    estimatedTotal:    number
    note?:             string
  }): Promise<{ newFixedTermId: string }> {
    const supabase = getSupabase()
    const user_id  = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase.rpc('rpc_fixed_term_reinvest', {
      p_old_fixed_term_id:  params.oldFixedTermId,
      p_wallet_id:          params.walletId,
      p_old_total:          params.oldTotal,
      p_new_principal:      params.newPrincipal,
      p_currency:           params.currency,
      p_tna:                params.tna,
      p_term_days:          params.termDays,
      p_start_date:         params.startDate,
      p_maturity_date:      params.maturityDate,
      p_estimated_interest: params.estimatedInterest,
      p_estimated_total:    params.estimatedTotal,
      p_note:               params.note ?? null,
    })

    if (error) throw new Error(error.message)
    const result = data as { new_fixed_term_id: string }
    return { newFixedTermId: result.new_fixed_term_id }
  },

}
