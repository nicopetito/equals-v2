'use client'

import { useState, useEffect, useCallback } from 'react'
import { fixedTermService } from '@/services/fixed_term.service'
import type { FixedTerm } from '@/types'

export function useFixedTerms() {
  const [items, setItems] = useState<FixedTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fixedTermService.list()
      setItems(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar plazos fijos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { items, loading, error, refetch }
}
