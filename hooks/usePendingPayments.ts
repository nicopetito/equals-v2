import { useState, useEffect, useMemo } from 'react'
import { pendingPaymentService } from '@/services/pending_payment.service'
import { safeNumber } from '@/utils/format'
import type { PendingPayment, PendingPaymentFilters, PendingPaymentCurrencyGroup, PendingPaymentSummary } from '@/types'

export function usePendingPayments(filters?: PendingPaymentFilters) {
  const [items, setItems]     = useState<PendingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [rev, setRev]         = useState(0)

  const filtersKey = JSON.stringify(filters)

  useEffect(() => {
    let active = true
    setLoading(true)
    pendingPaymentService.list(filters)
      .then(data  => { if (active) setItems(data) })
      .catch(err  => { if (active) setError(err instanceof Error ? err.message : 'Error') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, rev])

  function refetch() {
    setError(null)
    setRev(r => r + 1)
  }

  return { items, loading, error, refetch }
}

export function usePendingPaymentsSummary() {
  const { items, loading } = usePendingPayments()

  const summary = useMemo((): PendingPaymentSummary => {
    const today  = new Date().toISOString().slice(0, 10)
    const active = items.filter(p => p.status === 'pending')

    const byCurrency: Record<string, PendingPaymentCurrencyGroup> = {}
    for (const p of active) {
      const cur = p.currency || 'ARS'
      if (!byCurrency[cur]) byCurrency[cur] = { receivable: 0, payable: 0 }
      if (p.type === 'receivable') byCurrency[cur].receivable += safeNumber(p.amount)
      else                         byCurrency[cur].payable    += safeNumber(p.amount)
    }

    return {
      byCurrency,
      overdue: active.filter(p => p.due_date && p.due_date < today).length,
      count:   active.length,
    }
  }, [items])

  return { summary, loading }
}
