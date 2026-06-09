import { createClient } from '@/lib/supabase/client'
import { safeNumber } from '@/utils/format'
import { INITIAL_BALANCE_LABEL } from '@/utils/constants'
import { categoriesService } from '@/services/categories.service'
import { transactionsService } from '@/services/transactions.service'
import type { Wallet, WalletWithBalance, WalletDiagnostic, Currency } from '@/types'

function getSupabase() {
  return createClient()
}

async function getUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser()
  return data.user?.id ?? null
}

export const walletsService = {
  async list(): Promise<Wallet[]> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return []

    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user_id)
      .order('name')

    if (error) throw error
    return data ?? []
  },

  async listWithBalance(): Promise<WalletWithBalance[]> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return []

    // Primer día del mes actual para calcular yield_month_total
    const today = new Date()
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`

    const [balanceResult, walletResult, yieldResult] = await Promise.all([
      supabase.from('wallet_current_balance').select('*').eq('user_id', user_id),
      supabase.from('wallets')
        .select('id, generates_yield, yield_mode, annual_yield_rate, yield_frequency, last_yield_calculated_at')
        .eq('user_id', user_id),
      supabase.from('transactions')
        .select('wallet_id, amount')
        .eq('user_id', user_id)
        .eq('subtype', 'yield')
        .gte('date', monthStart),
    ])

    if (balanceResult.error) throw balanceResult.error

    const walletMap = new Map((walletResult.data ?? []).map(w => [w.id as string, w]))

    const yieldByWallet = new Map<string, number>()
    for (const tx of yieldResult.data ?? []) {
      const prev = yieldByWallet.get(tx.wallet_id as string) ?? 0
      yieldByWallet.set(tx.wallet_id as string, prev + safeNumber(tx.amount))
    }

    return (balanceResult.data ?? []).map(w => {
      const yieldInfo = walletMap.get(w.id as string) ?? {}
      return {
        ...w,
        initial_balance:            safeNumber(w.initial_balance),
        transaction_total:          safeNumber(w.transaction_total),
        current_balance:            safeNumber(w.current_balance),
        transaction_count:          safeNumber(w.transaction_count),
        generates_yield:            (yieldInfo as { generates_yield?: boolean }).generates_yield ?? false,
        yield_mode:                 ((yieldInfo as { yield_mode?: string }).yield_mode ?? 'estimated') as 'estimated' | 'manual',
        annual_yield_rate:          safeNumber((yieldInfo as { annual_yield_rate?: unknown }).annual_yield_rate),
        yield_frequency:            ((yieldInfo as { yield_frequency?: string }).yield_frequency ?? 'daily') as 'daily' | 'business_days',
        last_yield_calculated_at:   (yieldInfo as { last_yield_calculated_at?: string | null }).last_yield_calculated_at ?? null,
        yield_month_total:          yieldByWallet.get(w.id as string) ?? 0,
      }
    })
  },

  async create(wallet: Omit<Wallet, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Wallet> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const initialBalance = wallet.balance ?? 0

    const { data, error } = await supabase
      .from('wallets')
      .insert([{ ...wallet, balance: 0, user_id }])
      .select()
      .single()

    if (error) throw error

    if (initialBalance > 0) {
      const catId = await categoriesService.getOrCreateSaldoInicialCategory()
      await transactionsService.create({
        type: 'income',
        amount: initialBalance,
        currency: (wallet.currency ?? 'ARS') as Currency,
        description: 'Saldo inicial',
        wallet_id: data.id,
        date: new Date().toISOString().split('T')[0],
        category_id: catId,
        label: INITIAL_BALANCE_LABEL,
      })
    }

    return data
  },

  async update(id: string, wallet: Partial<Wallet>): Promise<Wallet> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('wallets')
      .update(wallet)
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getDeleteImpact(id: string): Promise<{
    transactionCount: number
    activeFixedTerms: number
    pendingRefunds: number
    currentBalance: number
    recurringCount: number
  }> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const [txResult, ftResult, refundResult, balanceResult, recResult] = await Promise.all([
      supabase.from('transactions').select('id', { count: 'exact', head: true })
        .eq('wallet_id', id).eq('user_id', user_id),
      supabase.from('fixed_terms').select('id', { count: 'exact', head: true })
        .eq('wallet_id', id).eq('user_id', user_id).in('status', ['active', 'matured']),
      supabase.from('refunds').select('id', { count: 'exact', head: true })
        .eq('destination_wallet_id', id).eq('user_id', user_id).in('status', ['pending', 'credited']),
      supabase.from('wallet_current_balance').select('current_balance')
        .eq('id', id).eq('user_id', user_id).maybeSingle(),
      supabase.from('recurring_transactions').select('id', { count: 'exact', head: true })
        .eq('wallet_id', id).eq('user_id', user_id),
    ])

    return {
      transactionCount: txResult.count ?? 0,
      activeFixedTerms: ftResult.count ?? 0,
      pendingRefunds:   refundResult.count ?? 0,
      currentBalance:   safeNumber(balanceResult.data?.current_balance),
      recurringCount:   recResult.count ?? 0,
    }
  },

  async delete(id: string): Promise<void> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('wallets')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id)

    if (error) throw error
  },

  async fixInitialBalance(
    walletId: string,
    target: number,
    currency: Currency,
    currentTransactionTotal: number,
    currentWalletBalance: number,
  ): Promise<void> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const catId = await categoriesService.getOrCreateSaldoInicialCategory()

    const { data: existingTx } = await supabase
      .from('transactions')
      .select('id, amount')
      .eq('user_id', user_id)
      .eq('wallet_id', walletId)
      .eq('category_id', catId)
      .eq('type', 'income')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    // transaction_total includes "Saldo inicial" transactions; wallet.balance is separate
    const saldoTxAmount = existingTx ? safeNumber((existingTx as { id: string; amount: unknown }).amount) : 0
    const otherTotal = currentTransactionTotal - saldoTxAmount  // non-initial transactions
    const newSaldoAmount = target - otherTotal

    if (newSaldoAmount < 0) {
      throw new Error('Las demás transacciones ya superan el saldo objetivo. Usá el modo de ajuste contable.')
    }

    // Normalise wallet.balance to 0 — all initial balance will live in the transaction
    if (currentWalletBalance !== 0) {
      const { error } = await supabase
        .from('wallets')
        .update({ balance: 0 })
        .eq('id', walletId)
        .eq('user_id', user_id)
      if (error) throw error
    }

    if (existingTx?.id) {
      if (newSaldoAmount > 0) {
        const { error } = await supabase
          .from('transactions')
          .update({ amount: newSaldoAmount })
          .eq('id', existingTx.id)
          .eq('user_id', user_id)
        if (error) throw error
      } else {
        await transactionsService.delete(existingTx.id)
      }
    } else if (newSaldoAmount > 0) {
      const { error } = await supabase
        .from('transactions')
        .insert([{
          user_id,
          wallet_id: walletId,
          type: 'income',
          amount: newSaldoAmount,
          currency,
          description: 'Saldo inicial',
          category_id: catId,
          date: new Date().toISOString().slice(0, 10),
          is_recurring: false,
          label: INITIAL_BALANCE_LABEL,
        }])
      if (error) throw error
    }
    // if newSaldoAmount === 0 and no existingTx: wallet.balance already set to 0, nothing else needed
  },

  async transfer(params: {
    fromWalletId: string
    toWalletId: string
    amount: number
    currency: string
    description: string
    date: string
  }): Promise<{ transfer_id: string; from_tx_id: string; to_tx_id: string }> {
    const supabase = getSupabase()
    const { data, error } = await supabase.rpc('rpc_wallet_transfer', {
      p_from_wallet_id: params.fromWalletId,
      p_to_wallet_id:   params.toWalletId,
      p_amount:         params.amount,
      p_currency:       params.currency,
      p_description:    params.description,
      p_date:           params.date,
    })
    if (error) throw error
    return data as { transfer_id: string; from_tx_id: string; to_tx_id: string }
  },

  async updateYieldSettings(id: string, settings: Pick<Wallet, 'generates_yield' | 'yield_mode' | 'annual_yield_rate' | 'yield_frequency'>): Promise<Wallet> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('wallets')
      .update(settings)
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async calculateYield(walletId: string): Promise<{ success: boolean; yield_amount: number; days_calculated: number; transaction_id?: string; message: string }> {
    const supabase = getSupabase()
    const { data, error } = await supabase.rpc('rpc_calculate_wallet_yield', { p_wallet_id: walletId })
    if (error) throw error
    return data as { success: boolean; yield_amount: number; days_calculated: number; transaction_id?: string; message: string }
  },

  async correctYieldTransaction(transactionId: string, correctedAmount: number): Promise<{ success: boolean; correction_id?: string; delta?: number; message: string }> {
    const supabase = getSupabase()
    const { data, error } = await supabase.rpc('rpc_correct_yield_transaction', {
      p_transaction_id:   transactionId,
      p_corrected_amount: correctedAmount,
    })
    if (error) throw error
    return data as { success: boolean; correction_id?: string; delta?: number; message: string }
  },

  async getYieldHistory(walletId: string): Promise<import('@/types').TransactionWithDetails[]> {
    const supabase = getSupabase()
    const user_id = await getUserId()
    if (!user_id) return []

    const { data, error } = await supabase
      .from('transactions_with_details')
      .select('*')
      .eq('user_id', user_id)
      .eq('wallet_id', walletId)
      .in('subtype', ['yield', 'correction'])
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []).map((t: Record<string, unknown>) => ({
      ...t,
      amount: safeNumber(t.amount),
    })) as import('@/types').TransactionWithDetails[]
  },

  async diagnose(): Promise<WalletDiagnostic[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase.rpc('rpc_wallet_diagnostics')
    if (error) throw error
    return (data ?? []).map((row: Record<string, unknown>) => ({
      wallet_id:         row.wallet_id as string,
      wallet_name:       row.wallet_name as string,
      currency:          row.currency as string,
      initial_balance:   safeNumber(row.initial_balance),
      income_total:      safeNumber(row.income_total),
      expense_total:     safeNumber(row.expense_total),
      computed_balance:  safeNumber(row.computed_balance),
      transaction_count: safeNumber(row.transaction_count),
    }))
  },
}
