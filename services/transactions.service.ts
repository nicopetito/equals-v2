import { createClient } from '@/lib/supabase/client'
import { safeNumber } from '@/utils/format'
import type {
  Transaction,
  TransactionWithDetails,
  TransactionFilters,
  TransactionSort,
  MonthlyTrend,
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

  async checkEditImpact(id: string): Promise<{ creditedRefundCount: number; hasGoalMovement: boolean }> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return { creditedRefundCount: 0, hasGoalMovement: false }

    const [refundResult, goalResult] = await Promise.all([
      supabase
        .from('refunds')
        .select('id', { count: 'exact', head: true })
        .eq('original_transaction_id', id)
        .eq('user_id', user_id)
        .eq('status', 'credited'),
      supabase
        .from('goal_movements')
        .select('id', { count: 'exact', head: true })
        .eq('transaction_id', id)
        .eq('user_id', user_id),
    ])

    return {
      creditedRefundCount: refundResult.count ?? 0,
      hasGoalMovement: (goalResult.count ?? 0) > 0,
    }
  },

  async update(id: string, tx: Partial<Transaction>): Promise<Transaction> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    // Service-layer guard: block financial field changes if credited refunds exist.
    // Compare against the original values to avoid false positives when the form
    // sends a full payload with unchanged financial fields.
    const FINANCIAL_FIELDS = new Set(['amount', 'type', 'wallet_id', 'currency'])
    const hasFinancialKeys = Object.keys(tx).some(k => FINANCIAL_FIELDS.has(k))

    if (hasFinancialKeys) {
      const { data: orig } = await supabase
        .from('transactions')
        .select('amount, type, wallet_id, currency')
        .eq('id', id)
        .eq('user_id', user_id)
        .single()

      const financiallyChanged = orig && (
        ('amount'    in tx && safeNumber(tx.amount)    !== safeNumber(orig.amount))    ||
        ('type'      in tx && tx.type      !== orig.type)      ||
        ('wallet_id' in tx && tx.wallet_id !== orig.wallet_id) ||
        ('currency'  in tx && tx.currency  !== orig.currency)
      )

      if (financiallyChanged) {
        const { count } = await supabase
          .from('refunds')
          .select('id', { count: 'exact', head: true })
          .eq('original_transaction_id', id)
          .eq('user_id', user_id)
          .eq('status', 'credited')

        if ((count ?? 0) > 0) {
          throw new Error(
            'No se pueden modificar campos financieros: la transacción tiene reintegros acreditados. Revertí los reintegros primero.'
          )
        }
      }
    }

    const COLUMNS = new Set(['description', 'amount', 'type', 'currency', 'crypto_type',
      'category_id', 'wallet_id', 'date', 'is_recurring', 'recurring_id', 'notes', 'label'])
    const updatePayload = Object.fromEntries(Object.entries(tx).filter(([k]) => COLUMNS.has(k)))

    const { data, error } = await supabase
      .from('transactions')
      .update(updatePayload)
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

    const { error } = await supabase.rpc('rpc_delete_transaction_cascade', {
      p_transaction_id: id,
    })
    if (error) throw error
  },

  async assignLabel(ids: string[], label: string | null): Promise<void> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')
    const { error } = await supabase
      .from('transactions')
      .update({ label })
      .in('id', ids)
      .eq('user_id', user_id)
    if (error) throw error
  },

  async createBatch(
    transactions: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]
  ): Promise<{ success: number; errors: number }> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    if (transactions.length === 0) return { success: 0, errors: 0 }

    const { data, error } = await supabase.rpc('rpc_transactions_batch_insert', {
      p_transactions: transactions,
    })

    if (error) return { success: 0, errors: transactions.length }
    return { success: (data as { inserted: number }).inserted, errors: 0 }
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
