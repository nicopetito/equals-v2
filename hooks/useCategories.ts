'use client'

import { useState, useEffect, useCallback } from 'react'
import { categoriesService } from '@/services/categories.service'
import type { Category } from '@/types'

export function useCategories() {
  const [data, setData] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await categoriesService.list()
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
