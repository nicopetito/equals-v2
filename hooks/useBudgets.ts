'use client'

import { useState, useEffect } from 'react'
import { budgetsService } from '@/services/budgets.service'
import type { Budget } from '@/types'

export function useBudgets(month: number, year: number) {
  const [data, setData]       = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [rev, setRev]         = useState(0)

  useEffect(() => {
    let active = true
    budgetsService.list(month, year)
      .then(r  => { if (active) setData(r) })
      .catch(() => { /* budgets non-critical */ })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [month, year, rev])

  function refetch() { setLoading(true); setRev(r => r + 1) }

  return { data, loading, refetch }
}
