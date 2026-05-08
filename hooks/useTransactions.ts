'use client'

import { useState, useEffect, useCallback } from 'react'
import { transactionsService } from '@/services/transactions.service'
import type { TransactionWithDetails, TransactionFilters, TransactionSort } from '@/types'

export function useTransactions(filters?: TransactionFilters, sort?: TransactionSort) {
  const [data, setData] = useState<TransactionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await transactionsService.list(filters, sort)
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading transactions')
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters), JSON.stringify(sort)])

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
