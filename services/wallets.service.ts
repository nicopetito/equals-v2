import { createClient } from '@/lib/supabase/client'
import type { Wallet, WalletWithBalance } from '@/types'

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
    return data ?? []
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
}
