import { createClient } from '@/lib/supabase/client'
import type { Category } from '@/types'

function getSupabase() {
  return createClient()
}

async function getUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser()
  return data.user?.id ?? null
}

export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  // Gastos (14)
  { name: 'Alimentación',  type: 'expense', color: '#ef4444', icon: 'utensils',        is_default: true },
  { name: 'Transporte',    type: 'expense', color: '#f97316', icon: 'car',             is_default: true },
  { name: 'Alquiler',      type: 'expense', color: '#06b6d4', icon: 'home',            is_default: true },
  { name: 'Servicios',     type: 'expense', color: '#64748b', icon: 'zap',             is_default: true },
  { name: 'Salud',         type: 'expense', color: '#84cc16', icon: 'heart-pulse',     is_default: true },
  { name: 'Educación',     type: 'expense', color: '#3b82f6', icon: 'book-open',       is_default: true },
  { name: 'Ocio',          type: 'expense', color: '#8b5cf6', icon: 'gamepad-2',       is_default: true },
  { name: 'Ropa',          type: 'expense', color: '#ec4899', icon: 'shirt',           is_default: true },
  { name: 'Supermercado',  type: 'expense', color: '#16a34a', icon: 'shopping-cart',   is_default: true },
  { name: 'Mascotas',      type: 'expense', color: '#f59e0b', icon: 'paw-print',       is_default: true },
  { name: 'Deudas',        type: 'expense', color: '#f43f5e', icon: 'credit-card',     is_default: true },
  { name: 'Impuestos',     type: 'expense', color: '#334155', icon: 'landmark',        is_default: true },
  { name: 'Suscripciones', type: 'expense', color: '#6366f1', icon: 'repeat',          is_default: true },
  { name: 'Otros gastos',  type: 'expense', color: '#6b7280', icon: 'more-horizontal', is_default: true },
  // Ingresos (6) — Rendimientos queda como categoría de sistema
  { name: 'Sueldo',         type: 'income', color: '#10b981', icon: 'briefcase',   is_default: true },
  { name: 'Freelance',      type: 'income', color: '#14b8a6', icon: 'laptop',      is_default: true },
  { name: 'Ventas',         type: 'income', color: '#f59e0b', icon: 'store',       is_default: true },
  { name: 'Reintegros',     type: 'income', color: '#22c55e', icon: 'rotate-ccw',  is_default: true },
  { name: 'Regalos',        type: 'income', color: '#a78bfa', icon: 'gift',        is_default: true },
  { name: 'Otros ingresos', type: 'income', color: '#6d3bd7', icon: 'plus-circle', is_default: true },
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

  async getBudgetCount(id: string): Promise<number> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return 0

    const { count } = await supabase
      .from('budgets')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('user_id', user_id)

    return count ?? 0
  },

  async getDeleteImpact(id: string): Promise<{
    transactionCount: number
    budgetCount: number
  }> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const [txResult, budgetResult] = await Promise.all([
      supabase.from('transactions').select('id', { count: 'exact', head: true })
        .eq('category_id', id).eq('user_id', user_id),
      supabase.from('budgets').select('id', { count: 'exact', head: true })
        .eq('category_id', id).eq('user_id', user_id),
    ])

    return {
      transactionCount: txResult.count ?? 0,
      budgetCount:      budgetResult.count ?? 0,
    }
  },

  async delete(id: string): Promise<void> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data: cat } = await supabase
      .from('categories')
      .select('is_system')
      .eq('id', id)
      .eq('user_id', user_id)
      .single()

    if (cat?.is_system) throw new Error('Las categorías de sistema no se pueden eliminar.')

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id)

    if (error) throw error
  },

  async ensureDefaultCategories(): Promise<void> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return

    const { data: existing } = await supabase
      .from('categories')
      .select('name, type')
      .eq('user_id', user_id)

    const existingKeys = new Set(
      (existing ?? []).map(c => `${c.name}|${c.type}`)
    )

    const toInsert = DEFAULT_CATEGORIES
      .filter(cat => !existingKeys.has(`${cat.name}|${cat.type}`))
      .map(cat => ({ ...cat, user_id }))

    if (toInsert.length === 0) return

    const { error } = await supabase.from('categories').insert(toInsert)
    if (error) throw error
  },

  async getOrCreateSystemCategory(type: 'income' | 'expense'): Promise<string> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user_id)
      .eq('name', 'Sin categoría')
      .eq('type', type)
      .eq('is_system', true)
      .maybeSingle()

    if (data?.id) return data.id

    const created = await categoriesService.create({
      name: 'Sin categoría', type, color: '#9ca3af', icon: 'tag', is_system: true,
    })
    return created.id!
  },

  async getOrCreateSaldoInicialCategory(): Promise<string> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user_id)
      .eq('name', 'Saldo inicial')
      .eq('type', 'income')
      .eq('is_system', true)
      .maybeSingle()

    if (data?.id) return data.id

    const created = await categoriesService.create({
      name: 'Saldo inicial', type: 'income', color: '#10b981', icon: 'wallet', is_system: true,
    })
    return created.id!
  },

  async getOrCreateAjusteCategory(type: 'income' | 'expense'): Promise<string> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user_id)
      .eq('name', 'Ajuste')
      .eq('type', type)
      .eq('is_system', true)
      .maybeSingle()

    if (data?.id) return data.id

    const created = await categoriesService.create({
      name: 'Ajuste', type, color: '#6366f1', icon: 'sliders-horizontal', is_system: true,
    })
    return created.id!
  },

  async getOrCreateRendimientosCategory(): Promise<string> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user_id)
      .eq('name', 'Rendimientos')
      .eq('type', 'income')
      .eq('is_system', true)
      .maybeSingle()

    if (data?.id) return data.id

    const created = await categoriesService.create({
      name: 'Rendimientos', type: 'income', color: '#6d3bd7', icon: 'trending-up', is_system: true,
    })
    return created.id!
  },

  async seedDefaults(): Promise<void> {
    await categoriesService.ensureDefaultCategories()
    await categoriesService.getOrCreateSystemCategory('expense')
    await categoriesService.getOrCreateSystemCategory('income')
  },
}
