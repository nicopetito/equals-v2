'use client'

import { useState, useEffect } from 'react'
import { walletsService } from '@/services/wallets.service'
import type { WalletWithBalance } from '@/types'

export function useWallets() {
  const [data, setData]       = useState<WalletWithBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [rev, setRev]         = useState(0)

  useEffect(() => {
    let active = true
    walletsService.listWithBalance()
      .then(r  => { if (active) setData(r) })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Error loading wallets') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [rev])

  function refetch() { setError(null); setLoading(true); setRev(r => r + 1) }

  return { data, loading, error, refetch }
}
