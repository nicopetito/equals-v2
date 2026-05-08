'use client'

import { useState, useEffect } from 'react'
import { dollarService } from '@/services/dollar.service'
import type { DollarRate } from '@/types'

export function useDollar(refreshInterval = 60_000) {
  const [data, setData] = useState<DollarRate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const rates = await dollarService.getRates()
      setData(rates)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error fetching rates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  return { data, loading, error, refetch: load }
}
