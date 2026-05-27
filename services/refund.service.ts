import { createClient } from '@/lib/supabase/client'
import { safeNumber } from '@/utils/format'
import type { Refund, RefundCreateParams } from '@/types'

function getSupabase() {
  return createClient()
}

async function getUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser()
  return data.user?.id ?? null
}

function parseRefund(raw: Record<string, unknown>): Refund {
  return {
    ...raw,
    amount:     safeNumber(raw.amount),
    percentage: raw.percentage != null ? safeNumber(raw.percentage) : null,
    cap_amount: raw.cap_amount != null ? safeNumber(raw.cap_amount) : null,
  } as Refund
}

export const refundService = {
  async list(): Promise<Refund[]> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return []

    const { data, error } = await supabase
      .from('refunds')
      .select('*')
      .eq('user_id', user_id)
      .order('expected_date', { ascending: true })

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) return []
      throw error
    }
    return (data ?? []).map(parseRefund)
  },

  async listPending(): Promise<Refund[]> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return []

    const { data, error } = await supabase
      .from('refunds')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .order('expected_date', { ascending: true })

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) return []
      throw error
    }
    return (data ?? []).map(parseRefund)
  },

  async listByTransaction(transactionId: string): Promise<Refund[]> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return []

    const { data, error } = await supabase
      .from('refunds')
      .select('*')
      .eq('user_id', user_id)
      .eq('original_transaction_id', transactionId)

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) return []
      throw error
    }
    return (data ?? []).map(parseRefund)
  },

  async create(params: RefundCreateParams): Promise<Refund> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('refunds')
      .insert([{ ...params, user_id, status: 'pending' }])
      .select()
      .single()

    if (error) throw new Error(`No se pudo crear el reintegro: ${error.message}`)
    return parseRefund(data as Record<string, unknown>)
  },

  async creditAtomic(params: {
    refundId: string
  }): Promise<void> {
    const supabase = getSupabase()
    const user_id  = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { error } = await supabase.rpc('rpc_refund_credit', {
      p_refund_id: params.refundId,
    })

    if (error) throw new Error(error.message)
  },

  async cancel(refundId: string): Promise<void> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('refunds')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', refundId)
      .eq('user_id', user_id)
      .eq('status', 'pending')

    if (error) throw new Error(`No se pudo cancelar el reintegro: ${error.message}`)
  },

  async cancelByWallet(walletId: string): Promise<number> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return 0

    const { data, error } = await supabase
      .from('refunds')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('destination_wallet_id', walletId)
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .select('id')

    if (error) throw new Error(`No se pudieron cancelar los reintegros: ${error.message}`)
    return (data ?? []).length
  },

  async cancelByTransaction(transactionId: string): Promise<{ cancelled: number; credited: number }> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return { cancelled: 0, credited: 0 }

    const { data: all } = await supabase
      .from('refunds')
      .select('id, status')
      .eq('user_id', user_id)
      .eq('original_transaction_id', transactionId)

    if (!all || all.length === 0) return { cancelled: 0, credited: 0 }

    const creditedCount = all.filter((r: { status: string }) => r.status === 'credited').length
    const pendingIds = all
      .filter((r: { status: string }) => r.status === 'pending')
      .map((r: { id: string }) => r.id)

    if (pendingIds.length > 0) {
      const { error } = await supabase
        .from('refunds')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .in('id', pendingIds)
        .eq('user_id', user_id)

      if (error) console.error('[refund.cancelByTransaction] cancel failed:', error.message)
    }

    return { cancelled: pendingIds.length, credited: creditedCount }
  },
}
