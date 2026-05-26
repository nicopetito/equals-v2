import { createClient } from '@/lib/supabase/client'
import { safeNumber } from '@/utils/format'
import type { TransactionTemplate, TransactionTemplateCreate } from '@/types'

function getSupabase() {
  return createClient()
}

async function getUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser()
  return data.user?.id ?? null
}

function parseTemplate(raw: Record<string, unknown>): TransactionTemplate {
  return {
    ...raw,
    suggested_amount: raw.suggested_amount != null ? safeNumber(raw.suggested_amount) : null,
    sort_order: safeNumber(raw.sort_order),
    is_active:   raw.is_active   !== false,
    is_favorite: raw.is_favorite === true,
  } as TransactionTemplate
}

export const transactionTemplateService = {
  async list(): Promise<TransactionTemplate[]> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return []

    const { data, error } = await supabase
      .from('transaction_templates')
      .select('*')
      .eq('user_id', user_id)
      .order('sort_order', { ascending: true })

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) return []
      throw error
    }
    return (data ?? []).map(parseTemplate)
  },

  async create(template: TransactionTemplateCreate): Promise<TransactionTemplate> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('transaction_templates')
      .insert([{ ...template, user_id }])
      .select()
      .single()

    if (error) throw new Error(`No se pudo crear la plantilla: ${error.message}`)
    return parseTemplate(data as Record<string, unknown>)
  },

  async update(id: string, template: Partial<TransactionTemplateCreate>): Promise<TransactionTemplate> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('transaction_templates')
      .update({ ...template, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) throw error
    return parseTemplate(data as Record<string, unknown>)
  },

  async delete(id: string): Promise<void> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('transaction_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id)

    if (error) throw error
  },

  async toggleActive(id: string, value: boolean): Promise<TransactionTemplate> {
    return transactionTemplateService.update(id, { is_active: value })
  },

  async toggleFavorite(id: string, value: boolean): Promise<TransactionTemplate> {
    return transactionTemplateService.update(id, { is_favorite: value })
  },

  async shouldSuggestTemplate(description: string, categoryId: string | null): Promise<boolean> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return false

    const since = new Date()
    since.setDate(since.getDate() - 60)
    const sinceStr = since.toISOString().split('T')[0]

    const keyword = description.substring(0, 30)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .ilike('description', `%${keyword}%`)
      .gte('date', sinceStr)

    if (categoryId) query = query.eq('category_id', categoryId)

    const { count, error } = await query
    if (error) return false

    return (count ?? 0) >= 3
  },
}
