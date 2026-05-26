'use client'

import { useState, useEffect } from 'react'
import { RotateCcw, ChevronUp, ChevronDown, Zap } from 'lucide-react'
import { transactionsService } from '@/services/transactions.service'
import { refundService } from '@/services/refund.service'
import { transactionTemplateService } from '@/services/transaction_template.service'
import { calculateRefundAmount, validateRefundRule, buildRefundPayload } from '@/utils/refund'
import { useToast } from '@/components/providers/ToastProvider'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { formatCurrency, safeNumber } from '@/utils/format'
import type {
  Transaction, TransactionWithDetails, Currency, TransactionType,
  RefundFormState, RefundRuleType, Category,
} from '@/types'

const CURRENCY_OPTS = [
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'CRYPTO', label: 'CRYPTO' },
]

const DEFAULT_REFUND_FORM: RefundFormState = {
  enabled: false,
  rule_type: 'percentage',
  percentage: '',
  fixed_amount: '',
  cap_amount: '',
  expected_date: '',
  destination_wallet_id: '',
  note: '',
}

function RefundSection({
  form: refundForm,
  onChange,
  expanded,
  onToggleExpand,
  expenseAmount,
  expenseCurrency,
  expenseDate,
  walletOptions,
}: {
  form: RefundFormState
  onChange: (patch: Partial<RefundFormState>) => void
  expanded: boolean
  onToggleExpand: () => void
  expenseAmount: number
  expenseCurrency: string
  expenseDate: string
  walletOptions: { value: string; label: string }[]
}) {
  const pct = parseFloat(refundForm.percentage)
  const fix = parseFloat(refundForm.fixed_amount)
  const cap = parseFloat(refundForm.cap_amount)

  const pctForCalc = refundForm.rule_type !== 'fixed' ? (isNaN(pct) ? 0 : pct) : null
  const capForCalc = refundForm.rule_type === 'fixed'
    ? (isNaN(fix) ? 0 : fix)
    : refundForm.rule_type === 'percentage_cap'
      ? (isNaN(cap) ? 0 : cap)
      : null

  const preview = refundForm.enabled
    ? calculateRefundAmount(safeNumber(expenseAmount), refundForm.rule_type, pctForCalc, capForCalc)
    : 0

  const walletName = walletOptions.find(w => w.value === refundForm.destination_wallet_id)?.label

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)' }}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <RotateCcw size={13} style={{ color: 'var(--brand-500)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Agregar reintegro
          </span>
          {refundForm.enabled && preview > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--income-50)', color: 'var(--income-600)', border: '1px solid var(--income-100)' }}
            >
              +{formatCurrency(preview, expenseCurrency)}
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp size={13} style={{ color: 'var(--text-muted)' }} />
          : <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
        }
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 space-y-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between pt-2.5">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Activar reintegro para este gasto
            </span>
            <button
              type="button"
              onClick={() => onChange({ enabled: !refundForm.enabled })}
              className="relative w-9 h-5 rounded-full transition-colors"
              style={{ background: refundForm.enabled ? 'var(--brand-500)' : 'var(--border)' }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ transform: refundForm.enabled ? 'translateX(18px)' : 'translateX(2px)' }}
              />
            </button>
          </div>

          {refundForm.enabled && (
            <>
              <Select
                label="Tipo de reintegro"
                value={refundForm.rule_type}
                onChange={e => onChange({ rule_type: e.target.value as RefundRuleType })}
                options={[
                  { value: 'percentage',     label: 'Porcentaje del gasto' },
                  { value: 'fixed',          label: 'Monto fijo' },
                  { value: 'percentage_cap', label: 'Porcentaje con tope' },
                ]}
              />

              {(refundForm.rule_type === 'percentage' || refundForm.rule_type === 'percentage_cap') && (
                <Input
                  label="Porcentaje (%)"
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={refundForm.percentage}
                  onChange={e => onChange({ percentage: e.target.value })}
                  placeholder="Ej: 10"
                />
              )}

              {refundForm.rule_type === 'fixed' && (
                <Input
                  label="Monto fijo del reintegro"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={refundForm.fixed_amount}
                  onChange={e => onChange({ fixed_amount: e.target.value })}
                  placeholder="Ej: 500"
                />
              )}

              {refundForm.rule_type === 'percentage_cap' && (
                <Input
                  label="Tope máximo"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={refundForm.cap_amount}
                  onChange={e => onChange({ cap_amount: e.target.value })}
                  placeholder="Ej: 2000"
                />
              )}

              <Input
                label="Fecha esperada de acreditación"
                type="date"
                value={refundForm.expected_date}
                onChange={e => onChange({ expected_date: e.target.value })}
              />

              <Select
                label="Acreditar en billetera *"
                value={refundForm.destination_wallet_id}
                onChange={e => onChange({ destination_wallet_id: e.target.value })}
                options={[{ value: '', label: 'Seleccioná billetera…' }, ...walletOptions]}
              />

              <Input
                label="Nota (opcional)"
                value={refundForm.note}
                onChange={e => onChange({ note: e.target.value })}
                placeholder="Ej: Cashback Visa, mutual, PAMI…"
              />

              {preview > 0 && (
                <div
                  className="rounded-xl px-3 py-2.5 flex items-center gap-2"
                  style={{ background: 'var(--income-50)', border: '1px solid var(--income-100)' }}
                >
                  <RotateCcw size={12} style={{ color: 'var(--income-600)' }} />
                  <p className="text-xs font-medium" style={{ color: 'var(--income-700, #15803d)' }}>
                    Vas a recibir{' '}
                    <strong>{formatCurrency(preview, expenseCurrency)}</strong>
                    {refundForm.expected_date && ` el ${refundForm.expected_date}`}
                    {walletName && ` en ${walletName}`}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface NewTransactionModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  wallets: { id?: string; name: string }[]
  categories: Category[]
  editing?: TransactionWithDetails | null
}

export function NewTransactionModal({
  open,
  onClose,
  onSaved,
  wallets,
  categories,
  editing = null,
}: NewTransactionModalProps) {
  const { addToast } = useToast()

  const [form, setForm]               = useState<Partial<Transaction>>({ type: 'expense', currency: 'ARS', date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving]           = useState(false)
  const [formError, setFormError]     = useState<string | null>(null)
  const [refundForm, setRefundForm]   = useState<RefundFormState>(DEFAULT_REFUND_FORM)
  const [refundExpanded, setRefundExpanded] = useState(false)
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName]     = useState('')

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({ ...editing })
      } else {
        setForm({ type: 'expense', currency: 'ARS', date: new Date().toISOString().split('T')[0] })
      }
      setFormError(null)
      setRefundForm(DEFAULT_REFUND_FORM)
      setRefundExpanded(false)
      setSaveAsTemplate(false)
      setTemplateName('')
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

  async function handleSave() {
    if (!form.description || !form.amount || !form.date) {
      setFormError('Completá todos los campos obligatorios.')
      return
    }

    if (!editing && form.type === 'expense' && refundForm.enabled) {
      const refundError = validateRefundRule(refundForm, form.amount ?? 0, form.date ?? '')
      if (refundError) { setFormError(refundError); return }
    }

    setSaving(true)
    setFormError(null)
    const payload = { ...form, category_id: form.category_id || null, wallet_id: form.wallet_id || null }

    try {
      if (editing?.id) {
        await transactionsService.update(editing.id, payload as Partial<Transaction>)
        addToast('Transacción actualizada', 'success')
      } else {
        const newTx = await transactionsService.create(
          payload as Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>
        )

        if (form.type === 'expense' && refundForm.enabled && newTx?.id) {
          const refundPayload = buildRefundPayload(
            refundForm,
            newTx.id,
            form.amount ?? 0,
            form.currency ?? 'ARS',
          )
          try {
            await refundService.create(refundPayload)
            addToast('Transacción creada con reintegro programado', 'success')
          } catch (refundErr) {
            console.error('[NewTransactionModal] refund creation failed:', refundErr)
            addToast('Transacción creada, pero el reintegro no pudo registrarse', 'info')
          }
        } else {
          addToast('Transacción creada', 'success')
        }

        if (newTx?.id && saveAsTemplate) {
          const finalName = templateName.trim() || form.description || 'Plantilla rápida'
          transactionTemplateService.create({
            name: finalName,
            type: form.type ?? 'expense',
            suggested_amount: safeNumber(form.amount) || null,
            currency: form.currency ?? 'ARS',
            category_id: form.category_id ?? null,
            wallet_id: form.wallet_id ?? null,
            description: null,
            icon: null,
            color: null,
            has_refund_rule: false,
            refund_rule: null,
            sort_order: 0,
            is_active: true,
            is_favorite: false,
          }).then(() => {
            addToast('Plantilla guardada para acceso rápido', 'success')
          }).catch(() => {})
        }
      }

      onClose()
      onSaved()
    } catch {
      setFormError('Error al guardar. Intentá de nuevo.')
      addToast('Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar transacción' : 'Nueva transacción'}>
      <div className="space-y-2.5">
        {formError && (
          <div
            className="rounded-xl px-3 py-2 text-xs font-medium"
            style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}
          >
            {formError}
          </div>
        )}

        <div
          className="grid grid-cols-2 gap-1 p-1 rounded-xl"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}
        >
          {(['expense', 'income'] as TransactionType[]).map(t => (
            <button
              key={t}
              onClick={() => setForm(f => ({ ...f, type: t }))}
              className="py-1.5 rounded-lg font-semibold text-sm transition-all duration-150"
              style={form.type === t
                ? {
                    background: 'var(--brand-50)',
                    color: t === 'income' ? 'var(--income-600)' : 'var(--expense-600)',
                    border: '1px solid var(--brand-100)',
                    boxShadow: 'var(--shadow-xs)',
                  }
                : {
                    color: 'var(--text-muted)',
                    border: '1px solid transparent',
                  }
              }
            >
              {t === 'income' ? '↑ Ingreso' : '↓ Gasto'}
            </button>
          ))}
        </div>

        <Input
          label="Descripción"
          value={form.description ?? ''}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Ej: Supermercado, salario, alquiler…"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Monto"
            type="number"
            min="0"
            step="0.01"
            value={form.amount ?? ''}
            onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
            required
          />
          <Select
            label="Moneda"
            value={form.currency ?? 'ARS'}
            onChange={e => setForm(f => ({ ...f, currency: e.target.value as Currency }))}
            options={CURRENCY_OPTS}
          />
        </div>

        <Input
          label="Fecha"
          type="date"
          value={form.date ?? ''}
          onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Categoría"
            value={form.category_id ?? ''}
            onChange={e => setForm(f => ({ ...f, category_id: e.target.value || null }))}
            options={categoryOptions}
          />
          <Select
            label="Billetera"
            value={form.wallet_id ?? ''}
            onChange={e => setForm(f => ({ ...f, wallet_id: e.target.value || null }))}
            options={walletOptions}
          />
        </div>

        {!editing && form.type === 'expense' && (
          <RefundSection
            form={refundForm}
            onChange={patch => setRefundForm(f => ({ ...f, ...patch }))}
            expanded={refundExpanded}
            onToggleExpand={() => setRefundExpanded(v => !v)}
            expenseAmount={safeNumber(form.amount)}
            expenseCurrency={form.currency ?? 'ARS'}
            expenseDate={form.date ?? ''}
            walletOptions={walletOptions.filter(w => w.value !== '')}
          />
        )}

        {!editing && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)' }}
          >
            <button
              type="button"
              onClick={() => setSaveAsTemplate(v => !v)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-left"
            >
              <div className="flex items-center gap-2">
                <Zap size={13} style={{ color: 'var(--brand-500)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Guardar como transacción rápida
                </span>
              </div>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setSaveAsTemplate(v => !v) }}
                className="relative w-9 h-5 rounded-full transition-colors"
                style={{ background: saveAsTemplate ? 'var(--brand-500)' : 'var(--border)' }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ transform: saveAsTemplate ? 'translateX(18px)' : 'translateX(2px)' }}
                />
              </button>
            </button>
            {saveAsTemplate && (
              <div className="px-3.5 pb-3.5 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="pt-2.5">
                  <Input
                    label="Nombre de la plantilla"
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    placeholder={form.description ?? 'Ej: Supermercado semanal'}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="w-full">
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving} className="w-full">
            {editing ? 'Guardar' : 'Crear'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
