'use client'

import { useState } from 'react'
import { ArrowLeftRight, SlidersHorizontal, HelpCircle, AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/providers/ToastProvider'
import { walletsService } from '@/services/wallets.service'
import { transactionsService } from '@/services/transactions.service'
import { categoriesService } from '@/services/categories.service'
import { formatCurrency, safeNumber } from '@/utils/format'
import { WALLET_ADJUSTMENT_LABEL } from '@/utils/constants'
import type { WalletWithBalance, Currency } from '@/types'
import { getErrorMessage } from '@/utils/errors'

type AdjustmentMode =
  | 'balance_correction'
  | 'internal_transfer'
  | 'payment_conversion'
  | 'unexplained_difference'

interface Props {
  open: boolean
  onClose: () => void
  wallet: WalletWithBalance | null
  wallets: WalletWithBalance[]
  onSuccess: () => void
}

const MODES: { id: AdjustmentMode; label: string; desc: string; icon: React.ElementType }[] = [
  {
    id: 'balance_correction',
    label: 'Corrección de saldo',
    desc: 'El saldo real no coincide con el que muestra la app',
    icon: SlidersHorizontal,
  },
  {
    id: 'internal_transfer',
    label: 'Transferencia interna',
    desc: 'Mover dinero de una billetera a otra (ej: Banco → Efectivo)',
    icon: ArrowLeftRight,
  },
  {
    id: 'payment_conversion',
    label: 'Conversión de medio de pago',
    desc: 'Pagué por transferencia y me dieron efectivo',
    icon: ArrowLeftRight,
  },
  {
    id: 'unexplained_difference',
    label: 'Diferencia detectada',
    desc: 'Faltante o sobrante no explicado — motivo obligatorio',
    icon: AlertTriangle,
  },
]

export function WalletAdjustmentModal({ open, onClose, wallet, wallets, onSuccess }: Props) {
  const { addToast } = useToast()
  const [mode, setMode]           = useState<AdjustmentMode>('balance_correction')
  const [realBalance, setRealBalance] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [targetWalletId, setTargetWalletId] = useState('')
  const [reason, setReason]       = useState('')
  const [date, setDate]           = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving]       = useState(false)

  // Reset when wallet changes or modal opens
  if (open && !saving && realBalance === '' && wallet) {
    setRealBalance(String(safeNumber(wallet.current_balance)))
  }

  const currentBalance = safeNumber(wallet?.current_balance)
  const currency       = (wallet?.currency ?? 'ARS') as Currency

  const diff = (() => {
    const real = parseFloat(realBalance)
    if (isNaN(real) || !wallet) return null
    return real - currentBalance
  })()

  const isSingleWalletMode = mode === 'balance_correction' || mode === 'unexplained_difference'
  const isTransferMode     = mode === 'internal_transfer' || mode === 'payment_conversion'

  const otherWallets = wallets.filter(w => w.id !== wallet?.id && w.currency === currency)

  function validate(): string | null {
    if (!wallet?.id) return 'No hay billetera seleccionada'
    if (isSingleWalletMode) {
      if (diff === null) return 'Ingresá un monto válido'
      if (diff === 0) return 'El saldo ya coincide — no hay diferencia que ajustar'
      if (mode === 'unexplained_difference' && !reason.trim()) return 'El motivo es obligatorio para una diferencia detectada'
    }
    if (isTransferMode) {
      const amt = parseFloat(transferAmount)
      if (isNaN(amt) || amt <= 0) return 'Ingresá un monto válido mayor a 0'
      if (!targetWalletId) return 'Seleccioná la billetera destino'
      if (amt > currentBalance) return `Saldo insuficiente (disponible: ${formatCurrency(currentBalance, currency)})`
    }
    return null
  }

  async function handleSave() {
    const err = validate()
    if (err) { addToast(err, 'error'); return }
    if (!wallet?.id) return

    setSaving(true)
    try {
      if (isSingleWalletMode) {
        const txType = diff! > 0 ? 'income' : 'expense'
        const catId  = await categoriesService.getOrCreateAjusteCategory(txType)
        const desc   = mode === 'unexplained_difference'
          ? `Diferencia detectada: ${reason.trim()}`
          : reason.trim() || 'Ajuste de saldo'

        await transactionsService.create({
          type:             txType,
          amount:           Math.abs(diff!),
          currency,
          description:      desc,
          wallet_id:        wallet.id,
          category_id:      catId,
          date,
          label:            WALLET_ADJUSTMENT_LABEL,
          transaction_kind: 'wallet_adjustment',
        })

        addToast(`Saldo de "${wallet.name}" ajustado`, 'success')
      } else {
        const amt  = parseFloat(transferAmount)
        const desc = mode === 'payment_conversion'
          ? reason.trim() || 'Conversión de medio de pago'
          : reason.trim() || 'Transferencia interna'

        await walletsService.transfer({
          fromWalletId: wallet.id,
          toWalletId:   targetWalletId,
          amount:       amt,
          currency,
          description:  desc,
          date,
        })

        const targetName = wallets.find(w => w.id === targetWalletId)?.name ?? 'billetera destino'
        addToast(`Transferencia de "${wallet.name}" a "${targetName}" registrada`, 'success')
      }

      onSuccess()
      handleClose()
    } catch (e) {
      addToast(getErrorMessage(e, 'Error al realizar el ajuste'), 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setMode('balance_correction')
    setRealBalance('')
    setTransferAmount('')
    setTargetWalletId('')
    setReason('')
    setDate(new Date().toISOString().slice(0, 10))
    onClose()
  }

  const modeInfo = MODES.find(m => m.id === mode)!

  return (
    <Modal open={open} onClose={handleClose} title="Ajustar billetera">
      <div className="space-y-5">

        {/* Billetera seleccionada */}
        {wallet && (
          <div className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
            <div>
              <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Billetera</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{wallet.name}</p>
            </div>
            <p className="text-base font-extrabold tabular-nums" style={{ color: 'var(--brand-500)', fontFamily: 'var(--font-sora)' }}>
              {formatCurrency(currentBalance, currency)}
            </p>
          </div>
        )}

        {/* Selector de modo */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
            Tipo de ajuste
          </p>
          <div className="grid grid-cols-2 gap-2">
            {MODES.map(m => {
              const Icon = m.icon
              const active = mode === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => { setMode(m.id); setRealBalance(wallet ? String(safeNumber(wallet.current_balance)) : '') }}
                  className="text-left rounded-xl px-3 py-3 transition-all"
                  style={{
                    background: active ? 'rgba(109,59,215,0.08)' : 'var(--bg-subtle)',
                    border: active ? '1.5px solid var(--brand-500)' : '1px solid var(--border)',
                  }}
                >
                  <Icon size={14} style={{ color: active ? 'var(--brand-500)' : 'var(--text-muted)', marginBottom: 4 }} />
                  <p className="text-xs font-bold" style={{ color: active ? 'var(--brand-500)' : 'var(--text-primary)' }}>
                    {m.label}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                    {m.desc}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Campos según modo */}
        {isSingleWalletMode && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Saldo real actual
              </label>
              <Input
                type="number"
                value={realBalance}
                onChange={e => setRealBalance(e.target.value)}
                placeholder={String(currentBalance)}
                min="0"
                step="0.01"
              />
              {diff !== null && diff !== 0 && (
                <p className="text-xs mt-1 font-semibold" style={{ color: diff > 0 ? 'var(--income-600)' : 'var(--expense-600)' }}>
                  {diff > 0 ? '▲' : '▼'} Diferencia: {formatCurrency(Math.abs(diff), currency)}
                  {' '}→ se creará un {diff > 0 ? 'ingreso' : 'egreso'} de ajuste
                </p>
              )}
              {diff === 0 && realBalance !== '' && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>El saldo coincide — no hay diferencia que ajustar.</p>
              )}
              {mode === 'balance_correction' && (
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  💡 El ajuste corrige el saldo — no representa un ingreso o gasto real.
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                {mode === 'unexplained_difference' ? 'Motivo (obligatorio)' : 'Descripción (opcional)'}
              </label>
              <Input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={mode === 'unexplained_difference' ? 'Ej: Faltante de caja sin justificación' : 'Ej: Corrección de saldo'}
              />
            </div>
          </div>
        )}

        {isTransferMode && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Monto a transferir ({currency})
              </label>
              <Input
                type="number"
                value={transferAmount}
                onChange={e => setTransferAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Billetera destino
              </label>
              {otherWallets.length > 0 ? (
                <Select
                  value={targetWalletId}
                  onChange={e => setTargetWalletId(e.target.value)}
                  options={[
                    { value: '', label: 'Seleccioná una billetera...' },
                    ...otherWallets.map(w => ({
                      value: w.id ?? '',
                      label: `${w.name} (${formatCurrency(safeNumber(w.current_balance), w.currency as Currency)})`,
                    })),
                  ]}
                />
              ) : (
                <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                  <HelpCircle size={12} />
                  No hay otras billeteras en {currency}. Creá una primero.
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Descripción (opcional)
              </label>
              <Input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={mode === 'payment_conversion' ? 'Ej: Efectivo recibido por transferencia' : 'Ej: Retiro de banco'}
              />
            </div>
          </div>
        )}

        {/* Fecha */}
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

        {/* Nota informativa */}
        <div className="flex items-start gap-2 text-xs rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(109,59,215,0.05)', border: '1px solid rgba(109,59,215,0.12)' }}>
          <HelpCircle size={12} style={{ color: 'var(--brand-500)', marginTop: 1, flexShrink: 0 }} />
          <p style={{ color: 'var(--text-secondary)' }}>
            {isTransferMode
              ? 'Esta operación no afecta el balance total. Solo mueve dinero entre billeteras y no se cuenta como ingreso ni gasto.'
              : 'El ajuste actualiza el saldo de esta billetera. No se contabiliza como ingreso ni gasto en estadísticas.'}
          </p>
        </div>

        {/* CTAs */}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={handleClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={saving || (isSingleWalletMode && (diff === null || diff === 0)) || (isTransferMode && (!transferAmount || !targetWalletId))}
            className="flex-1"
          >
            Confirmar ajuste
          </Button>
        </div>
      </div>
    </Modal>
  )
}
