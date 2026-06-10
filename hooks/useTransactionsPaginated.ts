'use client'
import { useState, useEffect } from 'react'
import { transactionsService } from '@/services/transactions.service'
import type { TransactionWithDetails, TransactionFilters, TransactionSort, PaginatedResult } from '@/types'

export function useTransactionsPaginated(
  filters?: TransactionFilters,
  sort?: TransactionSort,
  page: number = 1,
  pageSize: number = 10,
) {
  const [result, setResult] = useState<PaginatedResult<TransactionWithDetails>>({
    data: [], total: 0, page: 1, pageSize, totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rev, setRev] = useState(0)

  const filtersKey = JSON.stringify(filters)
  const sortKey    = JSON.stringify(sort)

  useEffect(() => {
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    transactionsService.listPaginated(filters, sort, page, pageSize)
      .then(r  => { if (active) setResult(r) })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Error') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, sortKey, page, pageSize, rev])

  function refetch() { setError(null); setRev(r => r + 1) }

  return { ...result, loading, error, refetch }
}
