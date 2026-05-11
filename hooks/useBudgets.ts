'use client'

import { useState, useEffect, useCallback } from 'react'
import { budgetsService, type Budget } from '@/services/budgets.service'

export function useBudgets(month: string) {
  const [data, setData]       = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const budgets = await budgetsService.list(month)
      setData(budgets)
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { refetch() }, [refetch])

  return { data, loading, refetch }
}
