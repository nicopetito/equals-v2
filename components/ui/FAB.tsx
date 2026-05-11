'use client'

import { useState } from 'react'
import { Plus, X, TrendingUp, TrendingDown } from 'lucide-react'
import { transactionsService } from '@/services/transactions.service'
import { useCategories } from '@/hooks/useCategories'
import { useWallets } from '@/hooks/useWallets'
import { useToast } from '@/components/providers/ToastProvider'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { Transaction, Currency, TransactionType } from '@/types'

const CURRENCY_OPTS = [
  { value: 'ARS', label: 'ARS' }, { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' }, { value: 'CRYPTO', label: 'CRYPTO' },
]

const defaultForm = (): Partial<Transaction> => ({
  type: 'expense',
  currency: 'ARS',
  date: new Date().toISOString().split('T')[0],
})

export function FAB() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<Transaction>>(defaultForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { data: categories } = useCategories()
  const { data: wallets }    = useWallets()
  const { addToast }         = useToast()

  const categoryOptions = [
    { value: '', label: 'Sin categoría' },
    ...categories.map(c => ({ value: c.id!, label: c.name })),
  ]
  const walletOptions = [
    { value: '', label: 'Sin billetera' },
    ...wallets.map(w => ({ value: w.id!, label: w.name })),
  ]

  function openFAB() {
    setForm(defaultForm())
    setError(null)
    setOpen(true)
  }

  async function handleSave() {
    if (!form.description || !form.amount) {
      setError('Necesitás descripción y monto.')
      return
    }
    setSaving(true); setError(null)
    try {
      const payload = {
        ...form,
        category_id: form.category_id || null,
        wallet_id:   form.wallet_id   || null,
      } as Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>
      await transactionsService.create(payload)
      addToast(
        form.type === 'income' ? '✓ Ingreso registrado' : '✓ Gasto registrado',
        'success'
      )
      setOpen(false)
    } catch {
      setError('Error al guardar. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const isIncome = form.type === 'income'

  return (
    <>
      {/* Botón flotante — solo mobile */}
      <button
        onClick={openFAB}
        aria-label="Nueva transacción rápida"
        className="fixed bottom-24 right-4 z-40 flex md:hidden w-14 h-14 items-center justify-center rounded-full shadow-2xl transition-all active:scale-95 hover:scale-105"
        style={{
          background: 'var(--grad-brand)',
          boxShadow: '0 8px 30px rgba(99,102,241,0.45)',
        }}
      >
        <Plus size={26} className="text-white" strokeWidth={2.5} />
      </button>

      {/* Overlay + drawer quick-add */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 backdrop-blur-sm"
            style={{ background: 'rgba(15,23,42,0.45)' }}
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div
            className="relative w-full rounded-t-3xl sm:rounded-3xl sm:max-w-md p-6 space-y-4 animate-fade-in"
            style={{
              background: 'var(--bg-card)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* Handle bar */}
            <div className="w-10 h-1 rounded-full mx-auto mb-2" style={{ background: 'var(--border)' }} />

            {/* Cabecera */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>
                Registro rápido
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-slate-100"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Error */}
            {error && (
              <div
                className="rounded-xl px-3 py-2.5 text-sm font-medium"
                style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}
              >
                {error}
              </div>
            )}

            {/* Selector de tipo */}
            <div className="flex gap-2">
              {(['expense', 'income'] as TransactionType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, type: t }))}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all"
                  style={form.type === t
                    ? t === 'income'
                      ? { background: 'var(--income-50)', color: 'var(--income-600)', border: '2px solid var(--income-500)' }
                      : { background: 'var(--expense-50)', color: 'var(--expense-600)', border: '2px solid var(--expense-500)' }
                    : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '2px solid transparent' }
                  }
                >
                  {t === 'income' ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                  {t === 'income' ? 'Ingreso' : 'Gasto'}
                </button>
              ))}
            </div>

            <Input
              label="Descripción"
              value={form.description ?? ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="¿Qué fue este movimiento?"
              autoFocus
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Monto"
                type="number" min="0" step="0.01"
                value={form.amount ?? ''}
                onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="0,00"
              />
              <Select
                label="Moneda"
                value={form.currency ?? 'ARS'}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value as Currency }))}
                options={CURRENCY_OPTS}
              />
            </div>

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

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3.5 rounded-2xl text-white font-extrabold text-base transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{
                background: isIncome ? 'var(--grad-income)' : 'var(--grad-brand)',
                boxShadow: isIncome ? 'var(--shadow-income)' : 'var(--shadow-brand)',
              }}
            >
              {saving
                ? <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Guardando…
                  </span>
                : `Guardar ${isIncome ? 'ingreso' : 'gasto'}`
              }
            </button>
          </div>
        </div>
      )}
    </>
  )
}
