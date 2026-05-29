import { createClient } from '@/lib/supabase/client'
import { safeNumber } from '@/utils/format'
import type { Wallet, WalletWithBalance, WalletDiagnostic } from '@/types'

function getSupabase() {
  return createClient()
}

async function getUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser()
  return data.user?.id ?? null
}

export const walletsService = {
  async list(): Promise<Wallet[]> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return []

    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user_id)
      .order('name')

    if (error) throw error
    return data ?? []
  },

  async listWithBalance(): Promise<WalletWithBalance[]> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return []

    const { data, error } = await supabase
      .from('wallet_current_balance')
      .select('*')
      .eq('user_id', user_id)

    if (error) throw error
    // Supabase returns NUMERIC columns as strings — parse to numbers to prevent NaN
    return (data ?? []).map(w => ({
      ...w,
      initial_balance:   safeNumber(w.initial_balance),
      transaction_total: safeNumber(w.transaction_total),
      current_balance:   safeNumber(w.current_balance),
      transaction_count: safeNumber(w.transaction_count),
    }))
  },

  async create(wallet: Omit<Wallet, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Wallet> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('wallets')
      .insert([{ ...wallet, user_id }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, wallet: Partial<Wallet>): Promise<Wallet> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('wallets')
      .update(wallet)
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getDeleteImpact(id: string): Promise<{
    transactionCount: number
    activeFixedTerms: number
    pendingRefunds: number
  }> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const [txResult, ftResult, refundResult] = await Promise.all([
      supabase.from('transactions').select('id', { count: 'exact', head: true })
        .eq('wallet_id', id).eq('user_id', user_id),
      supabase.from('fixed_terms').select('id', { count: 'exact', head: true })
        .eq('wallet_id', id).eq('user_id', user_id).in('status', ['active', 'matured']),
      supabase.from('refunds').select('id', { count: 'exact', head: true })
        .eq('destination_wallet_id', id).eq('user_id', user_id).eq('status', 'pending'),
    ])

    return {
      transactionCount: txResult.count ?? 0,
      activeFixedTerms: ftResult.count ?? 0,
      pendingRefunds:   refundResult.count ?? 0,
    }
  },

  async delete(id: string): Promise<void> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('wallets')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id)

    if (error) throw error
  },

  async diagnose(): Promise<WalletDiagnostic[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase.rpc('rpc_wallet_diagnostics')
    if (error) throw error
    return (data ?? []).map((row: Record<string, unknown>) => ({
      wallet_id:         row.wallet_id as string,
      wallet_name:       row.wallet_name as string,
      currency:          row.currency as string,
      initial_balance:   safeNumber(row.initial_balance),
      income_total:      safeNumber(row.income_total),
      expense_total:     safeNumber(row.expense_total),
      computed_balance:  safeNumber(row.computed_balance),
      transaction_count: safeNumber(row.transaction_count),
    }))
  },
}
