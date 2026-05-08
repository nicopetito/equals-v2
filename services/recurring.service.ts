import { createClient } from '@/lib/supabase/client'
import type { RecurringTransaction, RecurringTransactionWithDetails } from '@/types'

function getSupabase() {
  return createClient()
}

async function getUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser()
  return data.user?.id ?? null
}

export const recurringService = {
  async list(): Promise<RecurringTransactionWithDetails[]> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return []

    const { data, error } = await supabase
      .from('recurring_transactions_with_details')
      .select('*')
      .eq('user_id', user_id)
      .order('next_date', { ascending: true })

    if (error) throw error
    return data ?? []
  },

  async create(tx: Omit<RecurringTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<RecurringTransaction> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('recurring_transactions')
      .insert([{ ...tx, user_id }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, tx: Partial<RecurringTransaction>): Promise<RecurringTransaction> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('recurring_transactions')
      .update(tx)
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
      .from('recurring_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id)

    if (error) throw error
  },

  async toggle(id: string, active: boolean): Promise<void> {
    await recurringService.update(id, { active })
  },
}
