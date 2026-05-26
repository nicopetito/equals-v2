'use client'

import { useState, useEffect, useCallback } from 'react'
import { budgetsService } from '@/services/budgets.service'
import type { Budget } from '@/types'

export function useBudgets(month: number, year: number) {
  const [data, setData]       = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const budgets = await budgetsService.list(month, year)
      setData(budgets)
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { refetch() }, [refetch])

  return { data, loading, refetch }
}
