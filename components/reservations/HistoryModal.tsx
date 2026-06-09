'use client'

import { useState, useEffect } from 'react'
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { reservationsService } from '@/services/reservations.service'
import { formatCurrency } from '@/utils/format'
import type { Reservation, ReservationMovement } from '@/types'

interface Props {
  open:        boolean
  onClose:     () => void
  reservation: Reservation | null
}

export function HistoryModal({ open, onClose, reservation }: Props) {
  const [movements, setMovements] = useState<ReservationMovement[]>([])
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    if (!open || !reservation?.id) return
    setLoading(true)
    reservationsService.getMovements(reservation.id)
      .then(setMovements)
      .catch(() => setMovements([]))
      .finally(() => setLoading(false))
  }, [open, reservation?.id])

  if (!reservation) return null

  return (
    <Modal open={open} onClose={onClose} title={`Historial — ${reservation.name}`} size="sm">
      <div className="space-y-2 min-h-[120px]">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--bg-subtle)' }} />
            ))}
          </div>
        )}

        {!loading && movements.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              Sin movimientos aún
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
              Apartá o retirá dinero para ver el historial
            </p>
          </div>
        )}

        {!loading && movements.map(m => (
          <div
            key={m.id}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
          >
            {m.type === 'deposit' ? (
              <ArrowDownCircle size={16} style={{ color: 'var(--brand-500)', flexShrink: 0 }} />
            ) : (
              <ArrowUpCircle size={16} style={{ color: 'var(--income-500)', flexShrink: 0 }} />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {m.type === 'deposit' ? 'Aporte' : 'Retiro'}
                {m.note ? ` · ${m.note}` : ''}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                {m.created_at ? new Date(m.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
              </p>
            </div>
            <span
              className="text-sm font-bold tabular-nums shrink-0"
              style={{
                color: m.type === 'deposit' ? 'var(--brand-500)' : 'var(--income-500)',
                fontFamily: 'var(--font-sora)',
              }}
            >
              {m.type === 'deposit' ? '+' : '-'}{formatCurrency(m.amount, reservation.currency as never)}
            </span>
          </div>
        ))}
      </div>
    </Modal>
  )
}
