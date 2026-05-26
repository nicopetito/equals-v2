import { createClient } from '@/lib/supabase/client'
import { safeNumber } from '@/utils/format'
import type {
  Transaction,
  TransactionWithDetails,
  TransactionFilters,
  TransactionSort,
  CategoryDistribution,
  MonthlyTrend,
  DailyData,
} from '@/types'

function getSupabase() {
  return createClient()
}

function getUserId(): Promise<string | null> {
  return getSupabase()
    .auth.getUser()
    .then(({ data }) => data.user?.id ?? null)
}

export const transactionsService = {
  async list(filters?: TransactionFilters, sort?: TransactionSort): Promise<TransactionWithDetails[]> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return []

    let query = supabase
      .from('transactions_with_details')
      .select('*')
      .eq('user_id', user_id)

    if (filters) {
      if (filters.type && filters.type !== 'all') query = query.eq('type', filters.type)
      if (filters.category_ids?.length) query = query.in('category_id', filters.category_ids)
      if (filters.wallet_ids?.length) query = query.in('wallet_id', filters.wallet_ids)
      if (filters.currency) query = query.eq('currency', filters.currency)
      if (filters.from) query = query.gte('date', filters.from)
      if (filters.to) query = query.lte('date', filters.to)
      if (filters.is_recurring !== undefined) query = query.eq('is_recurring', filters.is_recurring)
      if (filters.search) query = query.ilike('description', `%${filters.search}%`)
    }

    const field = sort?.field ?? 'date'
    const ascending = sort?.order === 'asc'
    query = query.order(field, { ascending })

    const { data, error } = await query
    if (error) throw error
    // Supabase returns NUMERIC columns as strings — parse amount to number
    return (data ?? []).map(t => ({ ...t, amount: safeNumber(t.amount) }))
  },

  async getById(id: string): Promise<Transaction | null> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return null

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user_id)
      .single()

    if (error) throw error
    return data
  },

  async create(tx: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Transaction> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('transactions')
      .insert([{ ...tx, user_id }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, tx: Partial<Transaction>): Promise<Transaction> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('transactions')
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
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id)

    if (error) throw error
  },

  async createBatch(
    transactions: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]
  ): Promise<{ success: number; errors: number }> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const CHUNK = 100
    let success = 0
    let errors = 0

    for (let i = 0; i < transactions.length; i += CHUNK) {
      const chunk = transactions.slice(i, i + CHUNK).map(tx => ({ ...tx, user_id }))
      const { data, error } = await supabase
        .from('transactions')
        .insert(chunk)
        .select()

      if (error) {
        errors += chunk.length
      } else {
        success += (data ?? []).length
      }
    }

    return { success, errors }
  },

  async getMonthlyTrends(months = 6, currency = 'ARS'): Promise<MonthlyTrend[]> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return []

    const { data, error } = await supabase
      .from('transaction_monthly_summary')
      .select('*')
      .eq('user_id', user_id)
      .eq('currency', currency)
      .order('month', { ascending: true })

    if (error) throw error

    const map = new Map<string, { income: number; expenses: number; count: number }>()
    ;(data ?? []).forEach((item: any) => {
      const key = item.month.substring(0, 7)
      const existing = map.get(key) ?? { income: 0, expenses: 0, count: 0 }
      if (item.type === 'income') existing.income = safeNumber(item.total_amount)
      else existing.expenses = safeNumber(item.total_amount)
      existing.count += safeNumber(item.transaction_count)
      map.set(key, existing)
    })

    return Array.from(map.entries())
      .slice(-months)
      .map(([month, d]) => {
        const [year, m] = month.split('-')
        const date = new Date(parseInt(year), parseInt(m) - 1)
        const labels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
        return {
          month,
          month_label: `${labels[date.getMonth()]} ${year}`,
          income: d.income,
          expenses: d.expenses,
          net: d.income - d.expenses,
          transaction_count: d.count,
        }
      })
  },
}
