'use client'

import { useState, useEffect, useCallback } from 'react'
import { transactionTemplateService } from '@/services/transaction_template.service'
import type { TransactionTemplate, TransactionTemplateCreate } from '@/types'
import { getErrorMessage } from '@/utils/errors'

export function useTransactionTemplates() {
  const [items, setItems]     = useState<TransactionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [rev, setRev]         = useState(0)

  useEffect(() => {
    let active = true
    transactionTemplateService.list()
      .then(r  => { if (active) setItems(r) })
      .catch(e => { if (active) setError(getErrorMessage(e, 'Error al cargar plantillas')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [rev])

  function refetch() { setError(null); setLoading(true); setRev(r => r + 1) }

  const createTemplate = useCallback(async (data: TransactionTemplateCreate): Promise<TransactionTemplate> => {
    const created = await transactionTemplateService.create(data)
    refetch()
    return created
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rev])

  const updateTemplate = useCallback(async (id: string, data: Partial<TransactionTemplateCreate>): Promise<TransactionTemplate> => {
    const updated = await transactionTemplateService.update(id, data)
    setItems(prev => prev.map(t => t.id === id ? updated : t))
    return updated
  }, [])

  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    await transactionTemplateService.delete(id)
    setItems(prev => prev.filter(t => t.id !== id))
  }, [])

  const toggleActive = useCallback(async (id: string, value: boolean): Promise<void> => {
    const updated = await transactionTemplateService.toggleActive(id, value)
    setItems(prev => prev.map(t => t.id === id ? updated : t))
  }, [])

  const toggleFavorite = useCallback(async (id: string, value: boolean): Promise<void> => {
    const updated = await transactionTemplateService.toggleFavorite(id, value)
    setItems(prev => prev.map(t => t.id === id ? updated : t))
  }, [])

  return {
    items,
    loading,
    error,
    refetch,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleActive,
    toggleFavorite,
  }
}
