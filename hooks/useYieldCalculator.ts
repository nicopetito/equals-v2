'use client'

import { useState, useCallback } from 'react'
import { walletsService } from '@/services/wallets.service'
import { formatCurrency } from '@/utils/format'
import type { WalletWithBalance } from '@/types'

export interface YieldCalculationResult {
  walletId: string
  walletName: string
  walletCurrency: string
  yieldAmount: number
  daysCalculated: number
  message: string
}

export function useYieldCalculator() {
  const [isCalculating, setIsCalculating] = useState(false)
  const [lastResults, setLastResults] = useState<YieldCalculationResult[]>([])

  const calculatePendingYields = useCallback(async (
    wallets: WalletWithBalance[]
  ): Promise<YieldCalculationResult[]> => {
    const eligible = wallets.filter(
      w => w.generates_yield && (w.annual_yield_rate ?? 0) > 0 && w.id
    )

    if (eligible.length === 0) return []

    setIsCalculating(true)
    const results: YieldCalculationResult[] = []

    try {
      const responses = await Promise.allSettled(
        eligible.map(w => walletsService.calculateYield(w.id!))
      )

      for (let i = 0; i < eligible.length; i++) {
        const wallet = eligible[i]
        const response = responses[i]

        if (response.status === 'fulfilled' && response.value.success) {
          results.push({
            walletId:       wallet.id!,
            walletName:     wallet.name,
            walletCurrency: wallet.currency ?? 'ARS',
            yieldAmount:    response.value.yield_amount,
            daysCalculated: response.value.days_calculated,
            message:        response.value.message,
          })
        }
      }

      setLastResults(results)
    } finally {
      setIsCalculating(false)
    }

    return results
  }, [])

  const formatYieldToast = useCallback((result: YieldCalculationResult): string => {
    const amount = formatCurrency(result.yieldAmount, result.walletCurrency as 'ARS' | 'USD' | 'EUR' | 'CRYPTO')
    const days = result.daysCalculated > 1 ? ` (${result.daysCalculated} días)` : ''
    return `Se registraron ${amount} de rendimiento estimado en ${result.walletName}${days}`
  }, [])

  return { isCalculating, lastResults, calculatePendingYields, formatYieldToast }
}
