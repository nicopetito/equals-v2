import { createClient } from '@/lib/supabase/client'
import { safeNumber } from '@/utils/format'
import type { Goal, GoalMovement, GoalWithMovements } from '@/types'

function getSupabase() {
  return createClient()
}

async function getUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser()
  return data.user?.id ?? null
}

export const goalsService = {
  async list(): Promise<Goal[]> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return []

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []).map(g => ({
      ...g,
      target_amount:  safeNumber(g.target_amount),
      current_amount: safeNumber(g.current_amount),
    }))
  },

  async getById(id: string): Promise<GoalWithMovements | null> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return null

    const { data, error } = await supabase
      .from('goals')
      .select('*, movements:goal_movements(*)')
      .eq('id', id)
      .eq('user_id', user_id)
      .single()

    if (error) throw error
    return data ? {
      ...data,
      target_amount:  safeNumber(data.target_amount),
      current_amount: safeNumber(data.current_amount),
    } : null
  },

  async getMovements(goalId: string): Promise<GoalMovement[]> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return []

    const { data, error } = await supabase
      .from('goal_movements')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []).map(m => ({ ...m, amount: safeNumber(m.amount) }))
  },

  async create(goal: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Goal> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('goals')
      .insert([{ ...goal, category: goal.category ?? 'otro', user_id }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, goal: Partial<Goal>): Promise<Goal> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('goals')
      .update(goal)
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

    const { error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', user_id)
    if (error) throw error
  },

  /**
   * Deposita dinero desde una billetera hacia un objetivo.
   * Operación en 3 pasos secuenciales (sin RPC):
   *   1. Inserta transacción expense → reduce saldo de la billetera
   *   2. Actualiza current_amount del objetivo
   *   3. Registra movimiento en goal_movements (no crítico)
   * TODO: migrar a Supabase RPC para atomicidad completa
   */
  async deposit(params: {
    goalId: string
    goalName: string
    walletId: string
    amount: number
    currency: string
    currentAmount: number
    targetAmount?: number
    note?: string
  }): Promise<void> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { goalId, goalName, walletId, amount, currency, currentAmount, targetAmount, note } = params
    if (amount <= 0) throw new Error('El monto debe ser mayor a 0')

    const today = new Date().toISOString().split('T')[0]

    // Paso 1: registrar transacción para reducir el saldo de la billetera
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .insert([{
        user_id,
        description: `Aporte a objetivo: ${goalName}`,
        amount,
        type: 'expense',
        currency,
        wallet_id: walletId,
        date: today,
      }])
      .select()
      .single()

    if (txError) throw new Error(`No se pudo registrar la transacción: ${txError.message}`)

    // Paso 2: actualizar el acumulado del objetivo (y marcar completado si alcanza el objetivo)
    const newAmount  = safeNumber(currentAmount) + amount
    const nowReached = targetAmount && targetAmount > 0 && newAmount >= targetAmount
    const goalUpdate = nowReached
      ? { current_amount: newAmount, is_completed: true, completed_at: new Date().toISOString() }
      : { current_amount: newAmount }

    const { error: goalError } = await supabase
      .from('goals')
      .update(goalUpdate)
      .eq('id', goalId)
      .eq('user_id', user_id)

    if (goalError) {
      // TODO: revertir la transacción del paso 1 — pendiente RPC
      console.error('[goals.deposit] goal update failed after tx. tx_id:', txData?.id, goalError.message)
      throw new Error(`La transacción se registró pero el objetivo no se actualizó: ${goalError.message}`)
    }

    // Paso 3: historial (no crítico — falla silenciosamente con log)
    const { error: movError } = await supabase
      .from('goal_movements')
      .insert([{
        user_id,
        goal_id: goalId,
        type: 'deposit',
        amount,
        wallet_id: walletId,
        description: note ?? null,
        transaction_id: txData?.id ?? null,
      }])

    if (movError) {
      console.warn('[goals.deposit] movement log failed (non-critical):', movError.message)
    }
  },

  /**
   * Extrae dinero de un objetivo hacia una billetera.
   * Mismo flujo de 3 pasos que deposit, en reversa.
   * TODO: migrar a Supabase RPC para atomicidad completa
   */
  async withdraw(params: {
    goalId: string
    goalName: string
    walletId: string
    amount: number
    currency: string
    currentAmount: number
    note?: string
  }): Promise<void> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { goalId, goalName, walletId, amount, currency, currentAmount, note } = params
    if (amount <= 0) throw new Error('El monto debe ser mayor a 0')
    if (amount > safeNumber(currentAmount)) throw new Error('Saldo insuficiente en el objetivo')

    const today = new Date().toISOString().split('T')[0]

    // Paso 1: registrar transacción para aumentar el saldo de la billetera
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .insert([{
        user_id,
        description: `Retiro de objetivo: ${goalName}`,
        amount,
        type: 'income',
        currency,
        wallet_id: walletId,
        date: today,
      }])
      .select()
      .single()

    if (txError) throw new Error(`No se pudo registrar la transacción: ${txError.message}`)

    // Paso 2: reducir el acumulado del objetivo
    const newAmount = safeNumber(currentAmount) - amount
    const { error: goalError } = await supabase
      .from('goals')
      .update({ current_amount: Math.max(0, newAmount) })
      .eq('id', goalId)
      .eq('user_id', user_id)

    if (goalError) {
      // TODO: revertir la transacción del paso 1 — pendiente RPC
      console.error('[goals.withdraw] goal update failed after tx. tx_id:', txData?.id, goalError.message)
      throw new Error(`La transacción se registró pero el objetivo no se actualizó: ${goalError.message}`)
    }

    // Paso 3: historial (no crítico)
    const { error: movError } = await supabase
      .from('goal_movements')
      .insert([{
        user_id,
        goal_id: goalId,
        type: 'withdrawal',
        amount,
        wallet_id: walletId,
        description: note ?? null,
        transaction_id: txData?.id ?? null,
      }])

    if (movError) {
      console.warn('[goals.withdraw] movement log failed (non-critical):', movError.message)
    }
  },

  async addMovement(movement: Omit<GoalMovement, 'id' | 'created_at'>): Promise<GoalMovement> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('goal_movements')
      .insert([{ ...movement, user_id }])
      .select()
      .single()

    if (error) throw error
    return data
  },
}
