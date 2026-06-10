'use client'
import { useState, useEffect } from 'react'
import { transactionsService } from '@/services/transactions.service'
import type { TransactionFilters } from '@/types'

interface TransactionStats {
  income: number
  expenses: number
  loading: boolean
}

export function useTransactionStats(filters?: TransactionFilters): TransactionStats {
  const [income,   setIncome]   = useState(0)
  const [expenses, setExpenses] = useState(0)
  const [loading,  setLoading]  = useState(true)

  const filtersKey = JSON.stringify(filters)

  useEffect(() => {
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    transactionsService.getSummaryStats(filters)
      .then(({ income: i, expenses: e }) => {
        if (active) { setIncome(i); setExpenses(e) }
      })
      .catch(() => { /* silenciar — stats son informativas */ })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey])

  return { income, expenses, loading }
}
