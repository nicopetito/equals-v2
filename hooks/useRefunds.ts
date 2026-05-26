'use client'

import { useState, useEffect, useCallback } from 'react'
import { refundService } from '@/services/refund.service'
import type { Refund } from '@/types'

export function useRefunds() {
  const [items, setItems] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await refundService.list()
      setItems(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar reintegros')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { items, loading, error, refetch }
}

export function usePendingRefunds() {
  const [items, setItems] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const result = await refundService.listPending()
      setItems(result)
    } catch {
      // silencioso — no crashear el dashboard si la tabla no existe aún
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { items, loading, refetch }
}
