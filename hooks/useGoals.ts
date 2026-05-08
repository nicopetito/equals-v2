'use client'

import { useState, useEffect, useCallback } from 'react'
import { goalsService } from '@/services/goals.service'
import type { Goal } from '@/types'

export function useGoals() {
  const [data, setData] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await goalsService.list()
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading goals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
