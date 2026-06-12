'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/providers/ToastProvider'
import { pendingPaymentService } from '@/services/pending_payment.service'
import { formatCurrency } from '@/utils/format'
import type { PendingPayment, WalletWithBalance, Currency } from '@/types'
import { getErrorMessage } from '@/utils/errors'

interface Props {
  open: boolean
  onClose: () => void
  payment: PendingPayment | null
  wallets: WalletWithBalance[]
  onSuccess: () => void
}

export function CompletePendingModal({ open, onClose, payment, wallets, onSuccess }: Props) {
  const { addToast }                          = useToast()
  const [walletId, setWalletId]               = useState('')
  const [date, setDate]                       = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving]                   = useState(false)
  const [alreadyRecorded, setAlreadyRecorded] = useState(false)

  if (!payment) return null

  const isReceivable = payment.type === 'receivable'
  const currency     = payment.currency as Currency

  const suggestedWallets = wallets.filter(w => w.currency === payment.currency)
  const walletOptions    = [
    { value: '', label: 'Seleccioná una billetera...' },
    ...(suggestedWallets.length > 0 ? suggestedWallets : wallets).map(w => ({
      value: w.id ?? '',
      label: `${w.name} (${formatCurrency(w.current_balance ?? 0, w.currency as Currency)})`,
    })),
  ]

  const selectedWallet = wallets.find(w => w.id === walletId)

  async function handleConfirm() {
    if (!payment?.id) return

    setSaving(true)
    try {
      if (alreadyRecorded) {
        await pendingPaymentService.markDone(payment.id, payment.type)
        addToast('Pago cerrado sin nueva transacción', 'info')
      } else {
        if (!walletId) { addToast('Seleccioná una billetera', 'error'); setSaving(false); return }
        await pendingPaymentService.complete(payment.id, walletId, date)
        addToast(
          isReceivable
            ? `Cobro de ${payment.person_name} registrado`
            : `Pago a ${payment.person_name} registrado`,
          'success'
        )
      }
      onSuccess()
      handleClose()
    } catch (e) {
      addToast(getErrorMessage(e, 'Error al completar el pago'), 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setWalletId('')
    setDate(new Date().toISOString().slice(0, 10))
    setAlreadyRecorded(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isReceivable ? 'Marcar como cobrado' : 'Marcar como pagado'}
    >
      <div className="space-y-4">

        {/* Resumen del pago */}
        <div className="rounded-xl px-4 py-3"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-bold uppercase tracking-wide mb-1"
            style={{ color: 'var(--text-muted)' }}>
            {isReceivable ? 'Por cobrar de' : 'Por pagar a'}
          </p>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {payment.person_name}
          </p>
          <p className="text-xl font-extrabold tabular-nums mt-1"
            style={{
              color: isReceivable ? 'var(--income-600)' : 'var(--expense-600)',
              fontFamily: 'var(--font-sora)',
            }}>
            {formatCurrency(payment.amount, currency)}
          </p>
          {payment.description && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {payment.description}
            </p>
          )}
        </div>

        {/* Toggle: ya registré la transacción */}
        <button
          type="button"
          onClick={() => setAlreadyRecorded(v => !v)}
          className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all"
          style={{
            background: alreadyRecorded ? 'rgba(109,59,215,0.06)' : 'var(--bg-subtle)',
            border: alreadyRecorded ? '1.5px solid var(--brand-500)' : '1px solid var(--border)',
          }}
        >
          <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
            style={{
              background: alreadyRecorded ? 'var(--brand-500)' : 'transparent',
              border: alreadyRecorded ? '2px solid var(--brand-500)' : '2px solid var(--text-muted)',
            }}>
            {alreadyRecorded && (
              <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: alreadyRecorded ? 'var(--brand-500)' : 'var(--text-primary)' }}>
              Ya registré esta transacción
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
              Cerrar el pendiente sin crear un nuevo movimiento
            </p>
          </div>
        </button>

        {/* Billetera + Fecha (solo si no está ya registrado) */}
        {!alreadyRecorded && (
          <>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                {isReceivable ? 'Acreditar en billetera' : 'Debitar de billetera'}
              </label>
              <Select
                value={walletId}
                onChange={e => setWalletId(e.target.value)}
                options={walletOptions}
              />
              {suggestedWallets.length === 0 && wallets.length > 0 && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
                  No hay billeteras en {payment.currency}. Mostrando todas.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Fecha
              </label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            {walletId && selectedWallet && (
              <div className="rounded-xl px-3 py-2.5 text-xs"
                style={{
                  background: isReceivable ? 'rgba(78,222,163,0.06)' : 'rgba(255,180,171,0.06)',
                  border: `1px solid ${isReceivable ? 'rgba(78,222,163,0.2)' : 'rgba(255,180,171,0.2)'}`,
                  color: 'var(--text-secondary)',
                }}>
                Se creará un{' '}
                <strong>{isReceivable ? 'ingreso' : 'gasto'}</strong> de{' '}
                <strong>{formatCurrency(payment.amount, currency)}</strong> en{' '}
                <strong>{selectedWallet.name}</strong>.
              </div>
            )}
          </>
        )}

        {/* CTAs */}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={handleClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            loading={saving}
            disabled={saving || (!alreadyRecorded && !walletId)}
            className="flex-1"
          >
            {alreadyRecorded ? 'Cerrar pendiente' : isReceivable ? 'Confirmar cobro' : 'Confirmar pago'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
