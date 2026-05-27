import { createClient } from '@/lib/supabase/client'
import { safeNumber } from '@/utils/format'
import type { Goal, GoalMovement, GoalWithMovements } from '@/types'

function getSupabase() {
  return createClient()
}

async function getUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser()
  return data.user?.id ?? null
}

export const goalsService = {
  async list(): Promise<Goal[]> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return []

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []).map(g => ({
      ...g,
      target_amount:  safeNumber(g.target_amount),
      current_amount: safeNumber(g.current_amount),
    }))
  },

  async getById(id: string): Promise<GoalWithMovements | null> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return null

    const { data, error } = await supabase
      .from('goals')
      .select('*, movements:goal_movements(*)')
      .eq('id', id)
      .eq('user_id', user_id)
      .single()

    if (error) throw error
    return data ? {
      ...data,
      target_amount:  safeNumber(data.target_amount),
      current_amount: safeNumber(data.current_amount),
    } : null
  },

  async getMovements(goalId: string): Promise<GoalMovement[]> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return []

    const { data, error } = await supabase
      .from('goal_movements')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []).map(m => ({ ...m, amount: safeNumber(m.amount) }))
  },

  async create(goal: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Goal> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('goals')
      .insert([{ ...goal, category: goal.category ?? 'otro', user_id }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, goal: Partial<Goal>): Promise<Goal> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('goals')
      .update(goal)
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

    const { error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', user_id)
    if (error) throw error
  },

  /**
   * Versión atómica de deposit via Supabase RPC.
   * Requiere la función rpc_goal_deposit en la base de datos.
   * Un único CALL: si cualquier paso falla, todo se revierte automáticamente.
   */
  async depositAtomic(params: {
    goalId: string
    goalName: string
    walletId: string
    amount: number
    currency: string
    note?: string
  }): Promise<{ transactionId: string; newAmount: number; isCompleted: boolean }> {
    const supabase = getSupabase()
    const user_id  = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase.rpc('rpc_goal_deposit', {
      p_goal_id:   params.goalId,
      p_wallet_id: params.walletId,
      p_amount:    params.amount,
      p_currency:  params.currency,
      p_goal_name: params.goalName,
      p_note:      params.note ?? null,
    })

    if (error) throw new Error(error.message)
    const result = data as { transaction_id: string; new_amount: number; is_completed: boolean }
    return { transactionId: result.transaction_id, newAmount: result.new_amount, isCompleted: result.is_completed }
  },

  async withdrawAtomic(params: {
    goalId: string
    goalName: string
    walletId: string
    amount: number
    currency: string
    note?: string
  }): Promise<{ transactionId: string; newAmount: number }> {
    const supabase = getSupabase()
    const user_id  = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase.rpc('rpc_goal_withdraw', {
      p_goal_id:   params.goalId,
      p_wallet_id: params.walletId,
      p_amount:    params.amount,
      p_currency:  params.currency,
      p_goal_name: params.goalName,
      p_note:      params.note ?? null,
    })

    if (error) throw new Error(error.message)
    const result = data as { transaction_id: string; new_amount: number }
    return { transactionId: result.transaction_id, newAmount: result.new_amount }
  },
}
