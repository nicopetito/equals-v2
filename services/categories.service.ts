import { createClient } from '@/lib/supabase/client'
import type { Category } from '@/types'

function getSupabase() {
  return createClient()
}

async function getUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser()
  return data.user?.id ?? null
}

export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'user_id'>[] = [
  { name: 'Alimentación', type: 'expense', color: '#ef4444', icon: 'utensils' },
  { name: 'Transporte', type: 'expense', color: '#f97316', icon: 'car' },
  { name: 'Salud', type: 'expense', color: '#84cc16', icon: 'heart-pulse' },
  { name: 'Entretenimiento', type: 'expense', color: '#8b5cf6', icon: 'clapperboard' },
  { name: 'Ropa', type: 'expense', color: '#ec4899', icon: 'shirt' },
  { name: 'Hogar', type: 'expense', color: '#06b6d4', icon: 'home' },
  { name: 'Educación', type: 'expense', color: '#3b82f6', icon: 'book-open' },
  { name: 'Servicios', type: 'expense', color: '#64748b', icon: 'zap' },
  { name: 'Otros gastos', type: 'expense', color: '#6b7280', icon: 'more-horizontal' },
  { name: 'Sueldo', type: 'income', color: '#10b981', icon: 'briefcase' },
  { name: 'Freelance', type: 'income', color: '#14b8a6', icon: 'laptop' },
  { name: 'Inversiones', type: 'income', color: '#f59e0b', icon: 'trending-up' },
  { name: 'Otros ingresos', type: 'income', color: '#22c55e', icon: 'plus-circle' },
]

export const categoriesService = {
  async list(): Promise<Category[]> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return []

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user_id)
      .order('name')

    if (error) throw error
    return data ?? []
  },

  async create(category: Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Category> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('categories')
      .insert([{ ...category, user_id }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, category: Partial<Category>): Promise<Category> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('categories')
      .update(category)
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
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id)

    if (error) throw error
  },

  async seedDefaults(): Promise<void> {
    for (const cat of DEFAULT_CATEGORIES) {
      await categoriesService.create(cat)
    }
  },
}
