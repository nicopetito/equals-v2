import { useState, useEffect, useMemo } from 'react'
import { pendingPaymentService } from '@/services/pending_payment.service'
import type { PendingPayment, PendingPaymentFilters } from '@/types'

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

  const summary = useMemo(() => {
    const today  = new Date().toISOString().slice(0, 10)
    const active = items.filter(p => p.status === 'pending')
    return {
      receivable: active.filter(p => p.type === 'receivable').reduce((s, p) => s + p.amount, 0),
      payable:    active.filter(p => p.type === 'payable').reduce((s, p) => s + p.amount, 0),
      overdue:    active.filter(p => p.due_date && p.due_date < today).length,
      count:      active.length,
    }
  }, [items])

  return { summary, loading }
}
