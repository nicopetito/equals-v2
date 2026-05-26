import { createClient } from '@/lib/supabase/client'
import type { CalendarTask } from '@/types'

function getSupabase() {
  return createClient()
}

async function getUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser()
  return data.user?.id ?? null
}

export const calendarTasksService = {
  async listByMonth(from: string, to: string): Promise<CalendarTask[]> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return []

    const { data, error } = await supabase
      .from('calendar_tasks')
      .select('*')
      .eq('user_id', user_id)
      .gte('date', from)
      .lte('date', to)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data ?? []
  },

  async create(date: string, text: string): Promise<CalendarTask> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('calendar_tasks')
      .insert([{ user_id, date, text, done: false }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async toggle(id: string, done: boolean): Promise<void> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('calendar_tasks')
      .update({ done, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user_id)

    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('calendar_tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id)

    if (error) throw error
  },
}
