import { createClient } from '@/lib/supabase/client'
import { safeNumber } from '@/utils/format'
import type { PendingPayment, PendingPaymentFilters } from '@/types'

function getSupabase() {
  return createClient()
}

async function getUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser()
  return data.user?.id ?? null
}

function parsePendingPayment(row: Record<string, unknown>): PendingPayment {
  return {
    ...(row as unknown as PendingPayment),
    amount: safeNumber(row.amount),
  }
}

export const pendingPaymentService = {
  async list(filters?: PendingPaymentFilters): Promise<PendingPayment[]> {
    const supabase = getSupabase()
    const user_id  = await getUserId()
    if (!user_id) return []

    let query = supabase
      .from('pending_payments')
      .select('*')
      .eq('user_id', user_id)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (filters?.type) {
      query = query.eq('type', filters.type)
    }
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []).map(parsePendingPayment)
  },

  async create(
    params: Omit<PendingPayment, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status' | 'wallet_id_on_completion' | 'transaction_id'>
  ): Promise<PendingPayment> {
    const supabase = getSupabase()
    const user_id  = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('pending_payments')
      .insert([{ ...params, user_id, status: 'pending' }])
      .select()
      .single()

    if (error) throw error
    return parsePendingPayment(data as Record<string, unknown>)
  },

  async update(
    id: string,
    params: Partial<Pick<PendingPayment, 'person_name' | 'amount' | 'description' | 'due_date'>>
  ): Promise<PendingPayment> {
    const supabase = getSupabase()
    const user_id  = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data: current, error: fetchError } = await supabase
      .from('pending_payments')
      .select('status')
      .eq('id', id)
      .eq('user_id', user_id)
      .single()

    if (fetchError || !current) throw new Error('Pago pendiente no encontrado')
    if ((current as { status: string }).status !== 'pending') {
      throw new Error('Solo se puede editar un pago en estado pendiente')
    }

    const { data, error } = await supabase
      .from('pending_payments')
      .update({ ...params, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) throw error
    return parsePendingPayment(data as Record<string, unknown>)
  },

  async cancel(id: string): Promise<void> {
    const supabase = getSupabase()
    const user_id  = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('pending_payments')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user_id)
      .eq('status', 'pending')

    if (error) throw error
  },

  async markDone(id: string, type: 'receivable' | 'payable'): Promise<void> {
    const supabase   = getSupabase()
    const user_id    = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const new_status = type === 'receivable' ? 'collected' : 'paid'

    const { error } = await supabase
      .from('pending_payments')
      .update({ status: new_status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user_id)
      .eq('status', 'pending')

    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const supabase = getSupabase()
    const user_id  = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('pending_payments')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id)

    if (error) throw error
  },

  async complete(
    id: string,
    walletId: string,
    date?: string
  ): Promise<{ transaction_id: string; new_status: string }> {
    const supabase = getSupabase()
    const p_date   = date ?? new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase.rpc('rpc_complete_pending_payment', {
      p_payment_id: id,
      p_wallet_id:  walletId,
      p_date,
    })

    if (error) throw error
    return data as { transaction_id: string; new_status: string }
  },
}
