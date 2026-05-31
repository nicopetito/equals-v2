'use client'

import { useState, useEffect } from 'react'
import { transactionsService } from '@/services/transactions.service'
import type { TransactionWithDetails, TransactionFilters, TransactionSort } from '@/types'

export function useTransactions(filters?: TransactionFilters, sort?: TransactionSort) {
  const [data, setData]       = useState<TransactionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [rev, setRev]         = useState(0)

  const filtersKey = JSON.stringify(filters)
  const sortKey    = JSON.stringify(sort)

  useEffect(() => {
    let active = true
    transactionsService.list(filters, sort)
      .then(r  => { if (active) setData(r) })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Error loading transactions') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
    // filtersKey and sortKey are stable string representations of the objects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, sortKey, rev])

  function refetch() { setError(null); setLoading(true); setRev(r => r + 1) }

  return { data, loading, error, refetch }
}
