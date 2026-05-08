import { createClient } from '@/lib/supabase/client'
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
    return data ?? []
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
    return data
  },

  async create(goal: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Goal> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('goals')
      .insert([{ ...goal, user_id }])
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

  async addMovement(movement: Omit<GoalMovement, 'id' | 'created_at'>): Promise<GoalMovement> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('goal_movements')
      .insert([{ ...movement, user_id }])
      .select()
      .single()

    if (error) throw error
    return data
  },
}
