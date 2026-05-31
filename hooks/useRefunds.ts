'use client'

import { useState, useEffect } from 'react'
import { refundService } from '@/services/refund.service'
import type { Refund } from '@/types'

export function useRefunds() {
  const [items, setItems]     = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [rev, setRev]         = useState(0)

  useEffect(() => {
    let active = true
    refundService.list()
      .then(r  => { if (active) setItems(r) })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Error al cargar reintegros') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [rev])

  function refetch() { setError(null); setLoading(true); setRev(r => r + 1) }

  return { items, loading, error, refetch }
}

export function usePendingRefunds() {
  const [items, setItems]     = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [rev, setRev]         = useState(0)

  useEffect(() => {
    let active = true
    refundService.listPending()
      .then(r  => { if (active) setItems(r) })
      .catch(e => { console.error('[usePendingRefunds]', e) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [rev])

  function refetch() { setLoading(true); setRev(r => r + 1) }

  return { items, loading, refetch }
}
