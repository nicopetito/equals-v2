'use client'

import { useState, useEffect, useCallback } from 'react'
import { transactionTemplateService } from '@/services/transaction_template.service'
import type { TransactionTemplate, TransactionTemplateCreate } from '@/types'

export function useTransactionTemplates() {
  const [items, setItems] = useState<TransactionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await transactionTemplateService.list()
      setItems(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar plantillas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  const createTemplate = useCallback(async (data: TransactionTemplateCreate): Promise<TransactionTemplate> => {
    const created = await transactionTemplateService.create(data)
    await refetch()
    return created
  }, [refetch])

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
