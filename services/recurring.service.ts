import { parseISO, addDays, addMonths, addYears } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { safeNumber } from '@/utils/format'
import { transactionsService } from './transactions.service'
import type { RecurringTransaction, RecurringTransactionWithDetails, RecurringCadence, Currency } from '@/types'

function getSupabase() {
  return createClient()
}

async function getUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser()
  return data.user?.id ?? null
}

function nextDateAfter(current: string, cadence: RecurringCadence): string {
  const d = parseISO(current)
  let next: Date
  switch (cadence) {
    case 'daily':     next = addDays(d, 1);    break
    case 'weekly':    next = addDays(d, 7);    break
    case 'biweekly':  next = addDays(d, 14);   break
    case 'monthly':   next = addMonths(d, 1);  break
    case 'quarterly': next = addMonths(d, 3);  break
    case 'yearly':    next = addYears(d, 1);   break
    default:          next = addMonths(d, 1)
  }
  return next.toISOString().split('T')[0]
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
    return (data ?? []).map(r => ({ ...r, amount: safeNumber(r.amount) }))
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

    // Stamp generated transactions before the FK becomes NULL (trazabilidad)
    const { data: rt } = await supabase
      .from('recurring_transactions')
      .select('description')
      .eq('id', id)
      .eq('user_id', user_id)
      .single()

    if (rt?.description) {
      const { data: txs } = await supabase
        .from('transactions')
        .select('id')
        .eq('recurring_id', id)
        .eq('user_id', user_id)
        .is('notes', null)

      if (txs && txs.length > 0) {
        await supabase
          .from('transactions')
          .update({ notes: `Generado por recurrente: ${rt.description}` })
          .in('id', txs.map((t: { id: string }) => t.id))
          .eq('user_id', user_id)
      }
    }

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

  async execute(item: RecurringTransactionWithDetails, walletId: string): Promise<void> {
    await transactionsService.create({
      description: item.description,
      amount:      safeNumber(item.amount),
      type:        item.type,
      currency:    (item.currency ?? 'ARS') as Currency,
      category_id: item.category_id ?? null,
      wallet_id:   walletId,
      date:        new Date().toISOString().split('T')[0],
      is_recurring: true,
      recurring_id: item.id ?? null,
      notes:        null,
    })
    const next = nextDateAfter(item.next_date, item.cadence)
    await recurringService.update(item.id!, { next_date: next })
  },

  async executeAtomic(recurringId: string, walletId: string): Promise<{ transaction_id: string; next_date: string }> {
    const supabase = getSupabase()
    const { data, error } = await supabase.rpc('rpc_recurring_execute', {
      p_recurring_id: recurringId,
      p_wallet_id:    walletId,
    })
    if (error) throw new Error(error.message)
    return data as { transaction_id: string; next_date: string }
  },
}
