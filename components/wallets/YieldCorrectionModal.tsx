'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/providers/ToastProvider'
import { walletsService } from '@/services/wallets.service'
import { formatCurrency, safeNumber } from '@/utils/format'
import type { WalletWithBalance, TransactionWithDetails } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  wallet: WalletWithBalance | null
  onSuccess: () => void
}

export function YieldCorrectionModal({ open, onClose, wallet, onSuccess }: Props) {
  const { addToast } = useToast()
  const [lastYield, setLastYield]         = useState<TransactionWithDetails | null>(null)
  const [correctedAmount, setCorrectedAmount] = useState('')
  const [loading, setLoading]             = useState(false)
  const [fetching, setFetching]           = useState(false)

  useEffect(() => {
    if (open && wallet?.id) {
      setFetching(true)
      setCorrectedAmount('')
      walletsService.getYieldHistory(wallet.id)
        .then(history => {
          const lastYieldTx = history.find(tx => tx.subtype === 'yield')
          setLastYield(lastYieldTx ?? null)
        })
        .finally(() => setFetching(false))
    }
  }, [open, wallet?.id])

  const currency = ((wallet?.currency ?? 'ARS') as 'ARS' | 'USD' | 'EUR' | 'CRYPTO')
  const originalAmount = safeNumber(lastYield?.amount)
  const corrected = parseFloat(correctedAmount)
  const delta = !isNaN(corrected) ? corrected - originalAmount : null

  const handleCorrect = async () => {
    if (!lastYield?.id || !wallet) return
    if (isNaN(corrected) || corrected < 0) {
      addToast('Ingresá un monto válido mayor o igual a 0', 'error')
      return
    }
    if (delta === 0) {
      addToast('El monto es igual al original, no hay nada que corregir', 'info')
      return
    }

    setLoading(true)
    try {
      const result = await walletsService.correctYieldTransaction(lastYield.id, corrected)
      if (result.success) {
        addToast('Corrección registrada correctamente', 'success')
        onSuccess()
        onClose()
      } else {
        addToast(result.message === 'no_change' ? 'Sin cambios a aplicar' : 'No se pudo registrar la corrección', 'error')
      }
    } catch {
      addToast('Error al registrar la corrección', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!wallet) return null

  return (
    <Modal open={open} onClose={onClose} title="Corregir último rendimiento">
      <div className="space-y-5">

        {fetching ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">Cargando…</p>
        ) : !lastYield ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">No hay rendimientos estimados para corregir en esta billetera.</p>
          </div>
        ) : (
          <>
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] space-y-2">
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Último rendimiento registrado</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">
                  {new Date(lastYield.date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
                <span className="text-lg font-semibold tabular-nums text-[var(--income-600)]">
                  {formatCurrency(originalAmount, currency)}
                </span>
              </div>
              {lastYield.yield_period_start && lastYield.yield_period_end && (
                <p className="text-xs text-[var(--text-muted)]">
                  Período: {lastYield.yield_period_start} → {lastYield.yield_period_end}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Monto real del rendimiento
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder={`Ej: ${(originalAmount * 1.05).toFixed(2)}`}
                value={correctedAmount}
                onChange={e => setCorrectedAmount(e.target.value)}
              />
            </div>

            {delta !== null && delta !== 0 && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${delta > 0 ? 'bg-[var(--income-50)] border border-[var(--income-200)] text-[var(--income-700)]' : 'bg-[var(--expense-50)] border border-[var(--expense-200)] text-[var(--expense-700)]'}`}>
                <span className="font-medium">
                  {delta > 0 ? `+${formatCurrency(delta, currency)}` : `-${formatCurrency(Math.abs(delta), currency)}`}
                </span>
                <span className="text-[var(--text-muted)]">
                  {delta > 0 ? 'se sumarán al balance' : 'se descontarán del balance'}
                </span>
              </div>
            )}

            <p className="text-xs text-[var(--text-muted)]">
              El rendimiento original se conserva como registro histórico. La corrección crea una transacción adicional con la diferencia.
            </p>

            <div className="flex gap-3 pt-1">
              <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button variant="primary" size="sm" loading={loading} onClick={handleCorrect} className="flex-1" disabled={!correctedAmount || delta === 0}>
                Confirmar corrección
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
