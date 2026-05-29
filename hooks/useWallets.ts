'use client'

import { useState, useEffect, useCallback } from 'react'
import { walletsService } from '@/services/wallets.service'
import type { WalletWithBalance } from '@/types'

export function useWallets() {
  const [data, setData] = useState<WalletWithBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await walletsService.listWithBalance()
      setData(result)
    } catch (e) {
      console.error('[useWallets] error:', e)
      setError(e instanceof Error ? e.message : 'Error loading wallets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
