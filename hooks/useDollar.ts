'use client'

import { useState, useEffect } from 'react'
import { dollarService } from '@/services/dollar.service'
import type { DollarRate } from '@/types'
import { getErrorMessage } from '@/utils/errors'

export function useDollar(refreshInterval = 60_000) {
  const [data, setData]       = useState<DollarRate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [rev, setRev]         = useState(0)

  useEffect(() => {
    let active = true
    dollarService.getRates()
      .then(rates => { if (active) { setData(rates); setError(null) } })
      .catch(e    => { if (active) setError(getErrorMessage(e, 'Error fetching rates')) })
      .finally(()  => { if (active) setLoading(false) })
    return () => { active = false }
  }, [rev])

  useEffect(() => {
    if (refreshInterval <= 0) return
    const interval = setInterval(() => setRev(r => r + 1), refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  function refetch() { setError(null); setLoading(true); setRev(r => r + 1) }
  return { data, loading, error, refetch }
}
