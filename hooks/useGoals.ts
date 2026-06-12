'use client'

import { useState, useEffect } from 'react'
import { goalsService } from '@/services/goals.service'
import type { Goal } from '@/types'
import { getErrorMessage } from '@/utils/errors'

export function useGoals() {
  const [data, setData]       = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [rev, setRev]         = useState(0)

  useEffect(() => {
    let active = true
    goalsService.list()
      .then(r  => { if (active) setData(r) })
      .catch(e => { if (active) setError(getErrorMessage(e, 'Error loading goals')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [rev])

  function refetch() { setError(null); setLoading(true); setRev(r => r + 1) }

  return { data, loading, error, refetch }
}
