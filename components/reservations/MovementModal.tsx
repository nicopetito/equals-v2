'use client'

import { useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/utils/format'
import { getErrorMessage } from '@/utils/errors'
import type { Reservation } from '@/types'

interface Props {
  open:        boolean
  onClose:     () => void
  mode:        'deposit' | 'withdrawal'
  reservation: Reservation
  walletBalance?: number
  onConfirm:   (amount: number, description: string, date: string) => Promise<void>
}

export function MovementModal({ open, onClose, mode, reservation, walletBalance, onConfirm }: Props) {
  const [amount, setAmount]     = useState('')
  const [desc, setDesc]         = useState('')
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const isDeposit = mode === 'deposit'
  const maxAmount = isDeposit ? (walletBalance ?? 0) : reservation.amount

  async function handleConfirm() {
    const num = parseFloat(amount)
    if (!amount || isNaN(num) || num <= 0) {
      setError('Ingresá un monto válido mayor a 0')
      return
    }
    if (num > maxAmount) {
      const label = isDeposit ? 'saldo disponible en la billetera' : 'monto en la reserva'
      setError(`El monto supera el ${label} (${formatCurrency(maxAmount, reservation.currency as never)})`)
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onConfirm(num, desc.trim(), date)
      setAmount('')
      setDesc('')
      setDate(new Date().toISOString().split('T')[0])
      onClose()
    } catch (e) {
      setError(getErrorMessage(e, 'Error al procesar movimiento'))
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setAmount('')
    setDesc('')
    setDate(new Date().toISOString().split('T')[0])
    setError(null)
    onClose()
  }

  const title  = isDeposit ? 'Apartar dinero' : 'Retirar dinero'
  const Icon   = isDeposit ? ArrowDownCircle : ArrowUpCircle
  const color  = isDeposit ? 'var(--brand-500)' : 'var(--income-500)'

  return (
    <Modal open={open} onClose={handleClose} title={title} size="sm">
      <div className="space-y-4">
        {/* Header info */}
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
        >
          <Icon size={18} style={{ color, flexShrink: 0 }} />
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {reservation.name}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {isDeposit
                ? `Disponible en billetera: ${formatCurrency(walletBalance ?? 0, reservation.currency as never)}`
                : `En reserva: ${formatCurrency(reservation.amount, reservation.currency as never)}`}
            </p>
          </div>
        </div>

        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm font-medium"
            style={{
              background: 'var(--expense-50)',
              color:      'var(--expense-600)',
              border:     '1px solid var(--expense-100)',
            }}
          >
            {error}
          </div>
        )}

        <Input
          label="Monto"
          type="number"
          min="0"
          step="any"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
          autoFocus
        />

        <Input
          label="Descripción (opcional)"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder={isDeposit ? 'Ej: Ahorro del mes' : 'Ej: Retiro parcial'}
        />

        <Input
          label="Fecha"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" onClick={handleClose} className="flex-1" disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} loading={saving} className="flex-1">
            {isDeposit ? 'Apartar' : 'Retirar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
