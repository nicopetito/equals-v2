import { createClient } from '@/lib/supabase/client'
import { safeNumber } from '@/utils/format'
import type { Budget, BudgetCreate } from '@/types'

function getSupabase() {
  return createClient()
}

async function getUserId(): Promise<string> {
  const { data } = await getSupabase().auth.getUser()
  if (!data.user?.id) throw new Error('Not authenticated')
  return data.user.id
}

function mapBudget(row: Record<string, unknown>): Budget {
  const cat = row.categories as Record<string, unknown> | null
  return {
    id:               String(row.id),
    user_id:          String(row.user_id),
    category_id:      String(row.category_id),
    month:            Number(row.month),
    year:             Number(row.year),
    limit_amount:     safeNumber(row.limit_amount),
    currency:         String(row.currency ?? 'ARS'),
    alert_percentage: row.alert_percentage != null ? Number(row.alert_percentage) : null,
    note:             row.note != null ? String(row.note) : null,
    created_at:       row.created_at != null ? String(row.created_at) : undefined,
    updated_at:       row.updated_at != null ? String(row.updated_at) : undefined,
    category_name:    cat?.name != null ? String(cat.name) : undefined,
    category_color:   cat?.color != null ? String(cat.color) : undefined,
    category_icon:    cat?.icon != null ? String(cat.icon) : undefined,
  }
}

export const budgetsService = {
  async list(month: number, year: number): Promise<Budget[]> {
    const supabase = getSupabase()
    const user_id = await getUserId()

    const { data, error } = await supabase
      .from('budgets')
      .select('*, categories(name, color, icon)')
      .eq('user_id', user_id)
      .eq('month', month)
      .eq('year', year)
      .order('created_at')

    if (error) throw error
    return (data ?? []).map(row => mapBudget(row as Record<string, unknown>))
  },

  async create(budget: BudgetCreate): Promise<Budget> {
    const supabase = getSupabase()
    const user_id = await getUserId()

    const { data, error } = await supabase
      .from('budgets')
      .insert([{ ...budget, user_id }])
      .select('*, categories(name, color, icon)')
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('Ya existe un presupuesto para esa categoría en ese mes.')
      }
      throw error
    }
    return mapBudget(data as Record<string, unknown>)
  },

  async update(id: string, budget: Partial<BudgetCreate>): Promise<Budget> {
    const supabase = getSupabase()
    const user_id = await getUserId()

    const { data, error } = await supabase
      .from('budgets')
      .update({ ...budget, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user_id)
      .select('*, categories(name, color, icon)')
      .single()

    if (error) throw error
    return mapBudget(data as Record<string, unknown>)
  },

  async delete(id: string): Promise<void> {
    const supabase = getSupabase()
    const user_id = await getUserId()

    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id)

    if (error) throw error
  },

  async copyFromMonth(
    sourceMonth: number,
    sourceYear: number,
    targetMonth: number,
    targetYear: number
  ): Promise<{ copied: number }> {
    const user_id = await getUserId()
    const source = await this.list(sourceMonth, sourceYear)
    if (source.length === 0) return { copied: 0 }

    const existing = await this.list(targetMonth, targetYear)
    const existingCategoryIds = new Set(existing.map(b => b.category_id))

    const toInsert = source
      .filter(b => !existingCategoryIds.has(b.category_id))
      .map(b => ({
        user_id,
        category_id:      b.category_id,
        month:            targetMonth,
        year:             targetYear,
        limit_amount:     b.limit_amount,
        currency:         b.currency,
        alert_percentage: b.alert_percentage ?? null,
        note:             b.note ?? null,
      }))

    if (toInsert.length === 0) return { copied: 0 }

    const supabase = getSupabase()
    const { error } = await supabase.from('budgets').insert(toInsert)
    if (error) throw error

    return { copied: toInsert.length }
  },
}
