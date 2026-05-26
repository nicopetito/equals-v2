'use client'

import { useState, useEffect } from 'react'
import { RotateCcw, ChevronUp, ChevronDown } from 'lucide-react'
import { transactionTemplateService } from '@/services/transaction_template.service'
import { calculateRefundAmount } from '@/utils/refund'
import { safeNumber, formatCurrency } from '@/utils/format'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { TransactionTemplate, TransactionTemplateCreate, Category, RefundRuleType } from '@/types'

const CURRENCY_OPTS = [
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'CRYPTO', label: 'CRYPTO' },
]

const COLORS = ['#6d3bd7', '#0566d9', '#16a34a', '#e11d48', '#d97706', '#0ea5e9']

interface FormState {
  name: string
  type: 'income' | 'expense'
  suggested_amount: string
  currency: string
  category_id: string
  wallet_id: string
  icon: string
  color: string
  description: string
  is_active: boolean
  is_favorite: boolean
  has_refund_rule: boolean
  refund_rule_type: RefundRuleType
  refund_pct: string
  refund_fixed: string
  refund_cap: string
  refund_days: string
  refund_wallet_id: string
  refund_note: string
}

const DEFAULT_FORM: FormState = {
  name: '',
  type: 'expense',
  suggested_amount: '',
  currency: 'ARS',
  category_id: '',
  wallet_id: '',
  icon: '',
  color: '',
  description: '',
  is_active: true,
  is_favorite: false,
  has_refund_rule: false,
  refund_rule_type: 'percentage',
  refund_pct: '',
  refund_fixed: '',
  refund_cap: '',
  refund_days: '30',
  refund_wallet_id: '',
  refund_note: '',
}

interface TemplateFormModalProps {
  open: boolean
  onClose: () => void
  onSaved: (template: TransactionTemplate) => void
  wallets: { id?: string; name: string }[]
  categories: Category[]
  editing?: TransactionTemplate | null
}

export function TemplateFormModal({
  open,
  onClose,
  onSaved,
  wallets,
  categories,
  editing = null,
}: TemplateFormModalProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [refundExpanded, setRefundExpanded] = useState(false)

  useEffect(() => {
    if (open) {
      if (editing) {
        const r = editing.refund_rule
        setForm({
          name: editing.name,
          type: editing.type,
          suggested_amount: editing.suggested_amount?.toString() ?? '',
          currency: editing.currency,
          category_id: editing.category_id ?? '',
          wallet_id: editing.wallet_id ?? '',
          icon: editing.icon ?? '',
          color: editing.color ?? '',
          description: editing.description ?? '',
          is_active: editing.is_active,
          is_favorite: editing.is_favorite,
          has_refund_rule: editing.has_refund_rule,
          refund_rule_type: r?.rule_type ?? 'percentage',
          refund_pct: r?.percentage?.toString() ?? '',
          refund_fixed: r?.cap_amount?.toString() ?? '',
          refund_cap: r?.cap_amount?.toString() ?? '',
          refund_days: r?.expected_days?.toString() ?? '30',
          refund_wallet_id: r?.destination_wallet_id ?? '',
          refund_note: r?.note ?? '',
        })
        setRefundExpanded(editing.has_refund_rule)
      } else {
        setForm(DEFAULT_FORM)
        setRefundExpanded(false)
      }
      setFormError(null)
    }
  }, [open, editing])

  const categoryOptions = [
    { value: '', label: 'Sin categoría' },
    ...categories.map(c => ({ value: c.id ?? '', label: c.name })),
  ]
  const walletOptions = [
    { value: '', label: 'Sin billetera' },
    ...wallets.map(w => ({ value: w.id ?? '', label: w.name })),
  ]
  const walletOptionsRequired = wallets.map(w => ({ value: w.id ?? '', label: w.name }))

  const refundPreview = form.has_refund_rule
    ? calculateRefundAmount(
        safeNumber(form.suggested_amount),
        form.refund_rule_type,
        form.refund_rule_type !== 'fixed' ? (parseFloat(form.refund_pct) || 0) : null,
        form.refund_rule_type === 'fixed'
          ? (parseFloat(form.refund_fixed) || 0)
          : form.refund_rule_type === 'percentage_cap'
          ? (parseFloat(form.refund_cap) || 0)
          : null,
      )
    : 0

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError('El nombre es obligatorio.')
      return
    }
    const amount = form.suggested_amount ? safeNumber(form.suggested_amount) : null
    if (form.suggested_amount && (!amount || amount <= 0)) {
      setFormError('El monto sugerido debe ser mayor a 0.')
      return
    }
    if (form.has_refund_rule && form.type === 'expense' && !form.refund_wallet_id) {
      setFormError('Seleccioná una billetera de destino para el reintegro.')
      return
    }

    setSaving(true)
    setFormError(null)

    const refundRule = form.has_refund_rule && form.type === 'expense' && form.refund_wallet_id
      ? {
          rule_type: form.refund_rule_type,
          percentage: form.refund_rule_type !== 'fixed' ? (parseFloat(form.refund_pct) || null) : null,
          cap_amount: form.refund_rule_type === 'fixed'
            ? (parseFloat(form.refund_fixed) || null)
            : form.refund_rule_type === 'percentage_cap'
            ? (parseFloat(form.refund_cap) || null)
            : null,
          expected_days: parseInt(form.refund_days) || 30,
          destination_wallet_id: form.refund_wallet_id,
          note: form.refund_note.trim() || null,
        }
      : null

    const payload: TransactionTemplateCreate = {
      name: form.name.trim(),
      type: form.type,
      suggested_amount: amount,
      currency: form.currency,
      category_id: form.category_id || null,
      wallet_id: form.wallet_id || null,
      icon: form.icon.trim() || null,
      color: form.color || null,
      description: form.description.trim() || null,
      has_refund_rule: !!refundRule,
      refund_rule: refundRule,
      sort_order: editing?.sort_order ?? 0,
      is_active: form.is_active,
      is_favorite: form.is_favorite,
    }

    try {
      let result: TransactionTemplate
      if (editing) {
        result = await transactionTemplateService.update(editing.id, payload)
      } else {
        result = await transactionTemplateService.create(payload)
      }
      onSaved(result)
    } catch {
      setFormError('Error al guardar la plantilla. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar plantilla' : 'Nueva plantilla'}
      size="md"
    >
      <div className="space-y-3">
        {formError && (
          <div
            className="rounded-xl px-3 py-2 text-xs font-medium"
            style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}
          >
            {formError}
          </div>
        )}

        {/* Type toggle */}
        <div
          className="grid grid-cols-2 gap-1 p-1 rounded-xl"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}
        >
          {(['expense', 'income'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setForm(f => ({ ...f, type: t, has_refund_rule: t === 'income' ? false : f.has_refund_rule }))}
              className="py-1.5 rounded-lg font-semibold text-sm transition-all duration-150"
              style={form.type === t
                ? {
                    background: 'var(--brand-50)',
                    color: t === 'income' ? 'var(--income-600)' : 'var(--expense-600)',
                    border: '1px solid var(--brand-100)',
                    boxShadow: 'var(--shadow-xs)',
                  }
                : { color: 'var(--text-muted)', border: '1px solid transparent' }
              }
            >
              {t === 'income' ? '↑ Ingreso' : '↓ Gasto'}
            </button>
          ))}
        </div>

        {/* Name */}
        <Input
          label="Nombre *"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Ej: Padel, Supermercado, Sueldo…"
          required
        />

        {/* Amount + Currency */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Monto sugerido"
            type="number"
            min="0"
            step="0.01"
            value={form.suggested_amount}
            onChange={e => setForm(f => ({ ...f, suggested_amount: e.target.value }))}
            placeholder="0.00"
          />
          <Select
            label="Moneda"
            value={form.currency}
            onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
            options={CURRENCY_OPTS}
          />
        </div>

        {/* Category + Wallet */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Categoría"
            value={form.category_id}
            onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
            options={categoryOptions}
          />
          <Select
            label="Billetera"
            value={form.wallet_id}
            onChange={e => setForm(f => ({ ...f, wallet_id: e.target.value }))}
            options={walletOptions}
          />
        </div>

        {/* Icon + Color */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Ícono (emoji)"
            value={form.icon}
            onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
            placeholder="Ej: 🛒 🏋️ ⛽"
          />
          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Color
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: f.color === c ? '' : c }))}
                  className="w-6 h-6 rounded-full transition-all"
                  style={{
                    background: c,
                    outline: form.color === c ? `2px solid ${c}` : '2px solid transparent',
                    outlineOffset: 2,
                    transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
              {form.color && (
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: '' }))}
                  className="text-[10px] font-semibold"
                  style={{ color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <Input
          label="Nota / descripción (opcional)"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Ej: Gasto mensual, pago con tarjeta…"
        />

        {/* Toggles: is_active + is_favorite */}
        <div
          className="flex items-center justify-between gap-4 rounded-xl px-3.5 py-2.5"
          style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)' }}
        >
          <label className="flex items-center gap-2.5 cursor-pointer">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              className="relative w-9 h-5 rounded-full transition-colors"
              style={{ background: form.is_active ? 'var(--brand-500)' : 'var(--border)' }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ transform: form.is_active ? 'translateX(18px)' : 'translateX(2px)' }}
              />
            </button>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Activa
            </span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_favorite: !f.is_favorite }))}
              className="relative w-9 h-5 rounded-full transition-colors"
              style={{ background: form.is_favorite ? '#d97706' : 'var(--border)' }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ transform: form.is_favorite ? 'translateX(18px)' : 'translateX(2px)' }}
              />
            </button>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              ★ Favorita
            </span>
          </label>
        </div>

        {/* Refund section — only for expenses */}
        {form.type === 'expense' && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)' }}
          >
            <button
              type="button"
              onClick={() => setRefundExpanded(v => !v)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-left"
            >
              <div className="flex items-center gap-2">
                <RotateCcw size={13} style={{ color: 'var(--brand-500)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Regla de reintegro
                </span>
                {form.has_refund_rule && refundPreview > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'var(--income-50)', color: 'var(--income-600)', border: '1px solid var(--income-100)' }}
                  >
                    +{formatCurrency(refundPreview, form.currency)}
                  </span>
                )}
              </div>
              {refundExpanded
                ? <ChevronUp size={13} style={{ color: 'var(--text-muted)' }} />
                : <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
              }
            </button>

            {refundExpanded && (
              <div className="px-3.5 pb-3.5 space-y-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between pt-2.5">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    Activar regla de reintegro
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, has_refund_rule: !f.has_refund_rule }))}
                    className="relative w-9 h-5 rounded-full transition-colors"
                    style={{ background: form.has_refund_rule ? 'var(--brand-500)' : 'var(--border)' }}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                      style={{ transform: form.has_refund_rule ? 'translateX(18px)' : 'translateX(2px)' }}
                    />
                  </button>
                </div>

                {form.has_refund_rule && (
                  <>
                    <Select
                      label="Tipo de reintegro"
                      value={form.refund_rule_type}
                      onChange={e => setForm(f => ({ ...f, refund_rule_type: e.target.value as RefundRuleType }))}
                      options={[
                        { value: 'percentage',     label: 'Porcentaje del gasto' },
                        { value: 'fixed',          label: 'Monto fijo' },
                        { value: 'percentage_cap', label: 'Porcentaje con tope' },
                      ]}
                    />

                    {(form.refund_rule_type === 'percentage' || form.refund_rule_type === 'percentage_cap') && (
                      <Input
                        label="Porcentaje (%)"
                        type="number"
                        min="0.01"
                        max="100"
                        step="0.01"
                        value={form.refund_pct}
                        onChange={e => setForm(f => ({ ...f, refund_pct: e.target.value }))}
                        placeholder="Ej: 10"
                      />
                    )}

                    {form.refund_rule_type === 'fixed' && (
                      <Input
                        label="Monto fijo del reintegro"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={form.refund_fixed}
                        onChange={e => setForm(f => ({ ...f, refund_fixed: e.target.value }))}
                        placeholder="Ej: 500"
                      />
                    )}

                    {form.refund_rule_type === 'percentage_cap' && (
                      <Input
                        label="Tope máximo"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={form.refund_cap}
                        onChange={e => setForm(f => ({ ...f, refund_cap: e.target.value }))}
                        placeholder="Ej: 2000"
                      />
                    )}

                    <Input
                      label="Días de espera estimados"
                      type="number"
                      min="1"
                      step="1"
                      value={form.refund_days}
                      onChange={e => setForm(f => ({ ...f, refund_days: e.target.value }))}
                      placeholder="Ej: 30"
                    />

                    <Select
                      label="Acreditar en billetera *"
                      value={form.refund_wallet_id}
                      onChange={e => setForm(f => ({ ...f, refund_wallet_id: e.target.value }))}
                      options={[{ value: '', label: 'Seleccioná billetera…' }, ...walletOptionsRequired]}
                    />

                    <Input
                      label="Nota (opcional)"
                      value={form.refund_note}
                      onChange={e => setForm(f => ({ ...f, refund_note: e.target.value }))}
                      placeholder="Ej: Cashback Visa, PAMI…"
                    />

                    {refundPreview > 0 && (
                      <div
                        className="rounded-xl px-3 py-2 flex items-center gap-2"
                        style={{ background: 'var(--income-50)', border: '1px solid var(--income-100)' }}
                      >
                        <RotateCcw size={12} style={{ color: 'var(--income-600)' }} />
                        <p className="text-xs font-medium" style={{ color: 'var(--income-700, #15803d)' }}>
                          Reintegro estimado:{' '}
                          <strong>{formatCurrency(refundPreview, form.currency)}</strong>
                          {form.refund_days && ` en ~${form.refund_days} días`}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="w-full">
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving} className="w-full">
            {editing ? 'Guardar' : 'Crear plantilla'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
