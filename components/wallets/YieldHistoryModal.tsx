'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, RotateCcw, Calendar } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { walletsService } from '@/services/wallets.service'
import { formatCurrency, safeNumber } from '@/utils/format'
import type { WalletWithBalance, TransactionWithDetails } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  wallet: WalletWithBalance | null
}

export function YieldHistoryModal({ open, onClose, wallet }: Props) {
  const [history, setHistory]   = useState<TransactionWithDetails[]>([])
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    if (open && wallet?.id) {
      setLoading(true)
      walletsService.getYieldHistory(wallet.id)
        .then(setHistory)
        .finally(() => setLoading(false))
    }
  }, [open, wallet?.id])

  const formatPeriod = (tx: TransactionWithDetails) => {
    if (!tx.yield_period_start || !tx.yield_period_end) return null
    const start = new Date(tx.yield_period_start + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    const end   = new Date(tx.yield_period_end   + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    return start === end ? start : `${start} – ${end}`
  }

  if (!wallet) return null

  return (
    <Modal open={open} onClose={onClose} title={`Historial de rendimientos — ${wallet.name}`}>
      <div className="min-h-[200px]">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-[var(--text-muted)] text-sm">
            Cargando historial…
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <TrendingUp size={32} className="text-[var(--text-faint)]" />
            <p className="text-sm text-[var(--text-muted)]">Todavía no hay rendimientos registrados</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto -mx-1 px-1">
            {history.map(tx => {
              const isYield      = tx.subtype === 'yield'
              const isCorrection = tx.subtype === 'correction'
              const amount       = safeNumber(tx.amount)
              const currency     = (tx.currency ?? wallet.currency ?? 'ARS') as 'ARS' | 'USD' | 'EUR' | 'CRYPTO'
              const period       = formatPeriod(tx)
              const txDate       = new Date(tx.date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })

              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] hover:bg-[var(--bg-card)] transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isYield ? 'bg-[var(--brand-500)]/10' : 'bg-amber-50'}`}>
                    {isYield
                      ? <TrendingUp size={14} className="text-[var(--brand-500)]" />
                      : <RotateCcw  size={14} className="text-amber-600" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {isYield ? 'Rendimiento estimado' : 'Corrección'}
                      </span>
                      {tx.is_estimated && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--brand-500)]/10 text-[var(--brand-500)]">
                          ESTIMADO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[var(--text-muted)]">
                      <Calendar size={10} />
                      <span>{txDate}</span>
                      {period && <span>· período {period}</span>}
                      {tx.estimated_rate && <span>· {safeNumber(tx.estimated_rate).toFixed(2)}% TNA</span>}
                    </div>
                  </div>

                  <div className={`text-sm font-semibold tabular-nums ${isYield || tx.type === 'income' ? 'text-[var(--income-600)]' : 'text-[var(--expense-600)]'}`}>
                    {isCorrection && tx.type === 'expense' ? '-' : '+'}
                    {formatCurrency(amount, currency)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}
