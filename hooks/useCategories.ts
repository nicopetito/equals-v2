'use client'

import { useState, useEffect } from 'react'
import { categoriesService } from '@/services/categories.service'
import type { Category } from '@/types'
import { getErrorMessage } from '@/utils/errors'

export function useCategories() {
  const [data, setData]       = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [rev, setRev]         = useState(0)

  useEffect(() => {
    let active = true
    categoriesService.list()
      .then(r  => { if (active) setData(r) })
      .catch(e => { if (active) setError(getErrorMessage(e, 'Error loading categories')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [rev])

  function refetch() { setError(null); setLoading(true); setRev(r => r + 1) }

  return { data, loading, error, refetch }
}
