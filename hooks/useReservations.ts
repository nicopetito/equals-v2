'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from 'react'
import { reservationsService } from '@/services/reservations.service'
import type { Reservation } from '@/types'
import { getErrorMessage } from '@/utils/errors'

export function useReservations() {
  const [data, setData]       = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [rev, setRev]         = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    reservationsService.list()
      .then(r  => { if (active) setData(r) })
      .catch(e => { if (active) setError(getErrorMessage(e, 'Error al cargar reservas')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [rev])

  function refetch() {
    setError(null)
    setRev(r => r + 1)
  }

  return { data, loading, error, refetch }
}
