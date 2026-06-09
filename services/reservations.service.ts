import { createClient } from '@/lib/supabase/client'
import { safeNumber } from '@/utils/format'
import type { Reservation, ReservationMovement } from '@/types'

function getSupabase() {
  return createClient()
}

async function getUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser()
  return data.user?.id ?? null
}

function mapReservation(row: Record<string, unknown>): Reservation {
  return {
    ...row,
    amount: safeNumber(row.amount),
  } as Reservation
}

function mapMovement(row: Record<string, unknown>): ReservationMovement {
  return {
    ...row,
    amount: safeNumber(row.amount),
  } as ReservationMovement
}

export const reservationsService = {
  async list(): Promise<Reservation[]> {
    const supabase  = getSupabase()
    const user_id   = await getUserId()
    if (!user_id) return []

    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []).map(mapReservation)
  },

  async listAll(): Promise<Reservation[]> {
    const supabase = getSupabase()
    const user_id  = await getUserId()
    if (!user_id) return []

    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []).map(mapReservation)
  },

  async create(
    reservation: Omit<Reservation, 'id' | 'user_id' | 'amount' | 'status' | 'created_at' | 'updated_at'>
  ): Promise<Reservation> {
    const supabase = getSupabase()
    const user_id  = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('reservations')
      .insert([{ ...reservation, user_id, amount: 0, status: 'active' }])
      .select()
      .single()

    if (error) throw error
    return mapReservation(data as Record<string, unknown>)
  },

  async update(id: string, reservation: Partial<Omit<Reservation, 'id' | 'user_id'>>): Promise<Reservation> {
    const supabase = getSupabase()
    const user_id  = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('reservations')
      .update(reservation)
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) throw error
    return mapReservation(data as Record<string, unknown>)
  },

  async delete(id: string): Promise<void> {
    const supabase = getSupabase()
    const user_id  = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id)

    if (error) throw error
  },

  async cancel(id: string): Promise<Reservation> {
    return reservationsService.update(id, { status: 'cancelled' })
  },

  async deposit(params: {
    reservationId: string
    walletId: string
    amount: number
    description?: string
    date?: string
  }): Promise<{ transactionId: string; movementId: string; newAmount: number }> {
    const supabase = getSupabase()

    const { data, error } = await supabase.rpc('rpc_reservation_deposit', {
      p_reservation_id: params.reservationId,
      p_wallet_id:      params.walletId,
      p_amount:         params.amount,
      p_description:    params.description ?? null,
      p_date:           params.date ?? new Date().toISOString().split('T')[0],
    })

    if (error) throw new Error(error.message)
    const result = data as { transaction_id: string; movement_id: string; new_amount: number }
    return {
      transactionId: result.transaction_id,
      movementId:    result.movement_id,
      newAmount:     safeNumber(result.new_amount),
    }
  },

  async withdraw(params: {
    reservationId: string
    walletId: string
    amount: number
    description?: string
    date?: string
  }): Promise<{ transactionId: string; movementId: string; newAmount: number }> {
    const supabase = getSupabase()

    const { data, error } = await supabase.rpc('rpc_reservation_withdraw', {
      p_reservation_id: params.reservationId,
      p_wallet_id:      params.walletId,
      p_amount:         params.amount,
      p_description:    params.description ?? null,
      p_date:           params.date ?? new Date().toISOString().split('T')[0],
    })

    if (error) throw new Error(error.message)
    const result = data as { transaction_id: string; movement_id: string; new_amount: number }
    return {
      transactionId: result.transaction_id,
      movementId:    result.movement_id,
      newAmount:     safeNumber(result.new_amount),
    }
  },

  async getMovements(reservationId: string): Promise<ReservationMovement[]> {
    const supabase = getSupabase()
    const user_id  = await getUserId()
    if (!user_id) return []

    const { data, error } = await supabase
      .from('reservation_movements')
      .select('*')
      .eq('reservation_id', reservationId)
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []).map(mapMovement)
  },
}
