'use client'

import { useState, useEffect } from 'react'
import { RotateCcw } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { calculateRefundAmount } from '@/utils/refund'
import { formatCurrency } from '@/utils/format'
import type { TransactionTemplate } from '@/types'
import type { WalletWithBalance } from '@/types/wallet'

interface TemplateConfirmModalProps {
  open: boolean
  template: TransactionTemplate | null
  wallets: WalletWithBalance[]
  categories: { id?: string; name: string }[]
  onClose: () => void
  onConfirm: (overrides: { amount: number; wallet_id: string; date: string; category_id: string; note: string }) => Promise<void>
}

export function TemplateConfirmModal({
  open,
  template,
  wallets,
  categories,
  onClose,
  onConfirm,
}: TemplateConfirmModalProps) {
  const [amount, setCAmount]        = useState('')
  const [walletId, setWalletId]     = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate]             = useState(new Date().toISOString().split('T')[0])
  const [note, setNote]             = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    if (template) {
      setCAmount(template.suggested_amount?.toString() ?? '')
      setWalletId(template.wallet_id ?? '')
      setCategoryId(template.category_id ?? '')
      setDate(new Date().toISOString().split('T')[0])
      setNote('')
      setError('')
    }
  }, [template])

  if (!template) return null

  const walletOptions = [
    { value: '', label: 'Sin billetera' },
    ...wallets.map(w => ({ value: w.id!, label: w.name })),
  ]
  const categoryOptions = [
    { value: '', label: 'Sin categoría' },
    ...categories.map(c => ({ value: c.id ?? '', label: c.name })),
  ]

  const refundPreview = template.has_refund_rule && template.refund_rule
    ? calculateRefundAmount(
        parseFloat(amount) || 0,
        template.refund_rule.rule_type,
        template.refund_rule.percentage,
        template.refund_rule.cap_amount,
      )
    : 0

  const isIncome    = template.type === 'income'
  const accentColor = isIncome ? 'var(--income-500)' : 'var(--expense-500)'
  const accentBg    = isIncome ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.06)'

  async function handleConfirm() {
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) { setError('El monto debe ser mayor a 0.'); return }
    setSaving(true)
    setError('')
    try {
      await onConfirm({ amount: numAmount, wallet_id: walletId, date, category_id: categoryId, note })
      onClose()
    } catch {
      setError('No se pudo registrar. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Confirmar transacción rápida" size="sm">
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
          style={{ background: accentBg, border: `1px solid ${accentColor}22` }}>
          <span className="text-xl leading-none">{template.icon ?? (isIncome ? '↑' : '↓')}</span>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{template.name}</p>
            <p className="text-[11px]" style={{ color: accentColor }}>
              {isIncome ? 'Ingreso' : 'Gasto'} · {template.currency}
            </p>
          </div>
        </div>

        {error && (
          <p className="text-xs font-medium rounded-xl px-3 py-2"
            style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}>
            {error}
          </p>
        )}

        <Input
          label="Monto *"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={e => setCAmount(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Fecha" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <Select label="Billetera" value={walletId} onChange={e => setWalletId(e.target.value)} options={walletOptions} />
        </div>

        <Select label="Categoría" value={categoryId} onChange={e => setCategoryId(e.target.value)} options={categoryOptions} />

        <Input
          label="Nota (opcional)"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Ej: con descuento, cuotas…"
        />

        {refundPreview > 0 && (
          <div className="rounded-xl px-3 py-2 flex items-center gap-2"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
            <RotateCcw size={12} style={{ color: '#10b981' }} />
            <p className="text-xs font-medium" style={{ color: '#065f46' }}>
              Reintegro esperado:{' '}
              <strong>{formatCurrency(refundPreview, template.currency)}</strong>
              {template.refund_rule?.expected_days ? ` en ~${template.refund_rule.expected_days} días` : ''}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="w-full">Cancelar</Button>
          <Button onClick={handleConfirm} loading={saving} className="w-full">Registrar</Button>
        </div>
      </div>
    </Modal>
  )
}
