'use client'

import { useState, useEffect } from 'react'
import { fixedTermService } from '@/services/fixed_term.service'
import type { FixedTerm } from '@/types'
import { getErrorMessage } from '@/utils/errors'

export function useFixedTerms() {
  const [items, setItems]     = useState<FixedTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [rev, setRev]         = useState(0)

  useEffect(() => {
    let active = true
    fixedTermService.list()
      .then(r  => { if (active) setItems(r) })
      .catch(e => { if (active) setError(getErrorMessage(e, 'Error al cargar plazos fijos')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [rev])

  function refetch() { setError(null); setLoading(true); setRev(r => r + 1) }

  return { items, loading, error, refetch }
}
