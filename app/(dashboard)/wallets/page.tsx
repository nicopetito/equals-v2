'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, CreditCard, TrendingUp, Wallet } from 'lucide-react'
import { useWallets } from '@/hooks/useWallets'
import { walletsService } from '@/services/wallets.service'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/format'
import { WALLET_PROVIDERS } from '@/types'
import type { Wallet as WalletType } from '@/types'

const CURRENCY_OPTS = [
  { value: 'ARS', label: 'ARS' }, { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' }, { value: 'CRYPTO', label: 'CRYPTO' },
]

const CURRENCY_COLORS: Record<string, { color: string; bg: string }> = {
  ARS:    { color: '#6366F1', bg: '#EEF2FF' },
  USD:    { color: '#10B981', bg: '#ECFDF5' },
  EUR:    { color: '#0EA5E9', bg: '#F0F9FF' },
  CRYPTO: { color: '#F59E0B', bg: '#FFFBEB' },
}

export default function WalletsPage() {
  const { data: wallets, loading, refetch } = useWallets()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<WalletType | null>(null)
  const [form, setForm]           = useState<Partial<WalletType>>({ currency: 'ARS', balance: 0 })
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)

  function openCreate() { setEditing(null); setForm({ currency: 'ARS', balance: 0 }); setError(null); setModalOpen(true) }
  function openEdit(w: WalletType) { setEditing(w); setForm({ ...w }); setError(null); setModalOpen(true) }

  async function handleSave() {
    if (!form.name) { setError('El nombre es obligatorio.'); return }
    setSaving(true); setError(null)
    try {
      if (editing?.id) await walletsService.update(editing.id, form as Partial<WalletType>)
      else await walletsService.create(form as Omit<WalletType, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
      setModalOpen(false); refetch()
    } catch { setError('Error al guardar.') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try { await walletsService.delete(id); refetch() }
    finally { setDeleting(null) }
  }

  const providerOptions = [{ value: '', label: 'Sin proveedor' }, ...WALLET_PROVIDERS.map(p => ({ value: p.name, label: p.name }))]

  const totalByCurrency = wallets.reduce<Record<string, number>>((acc, w) => {
    if (w.currency) acc[w.currency] = (acc[w.currency] ?? 0) + (w.current_balance ?? 0)
    return acc
  }, {})

  return (
    <div className="p-5 md:p-7 max-w-4xl mx-auto space-y-6 animate-fade-in">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Billeteras
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {wallets.length} {wallets.length === 1 ? 'billetera' : 'billeteras'} configuradas
          </p>
        </div>
        <Button onClick={openCreate} size="md">
          <Plus size={16} /> Nueva billetera
        </Button>
      </div>

      {/* Resumen por moneda */}
      {Object.keys(totalByCurrency).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(totalByCurrency).map(([curr, bal]) => {
            const style = CURRENCY_COLORS[curr] ?? { color: '#6366F1', bg: '#EEF2FF' }
            return (
              <div
                key={curr}
                className="rounded-2xl p-4"
                style={{ background: style.bg, border: `1px solid ${style.color}20` }}
              >
                <span
                  className="text-xs font-extrabold px-2 py-0.5 rounded-full"
                  style={{ background: style.color + '18', color: style.color }}
                >
                  {curr}
                </span>
                <p
                  className="text-2xl font-extrabold tabular-nums mt-2"
                  style={{ color: bal >= 0 ? 'var(--income-600)' : 'var(--expense-600)' }}
                >
                  {formatCurrency(bal, curr)}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Saldo total</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Lista de billeteras */}
      {loading ? (
        <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
          <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          Cargando billeteras…
        </div>
      ) : wallets.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Sin billeteras"
          description="Agregá tu primera billetera para empezar a registrar tus movimientos."
          action={{ label: '+ Nueva billetera', onClick: openCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {wallets.map(wallet => {
            const currStyle = CURRENCY_COLORS[wallet.currency ?? 'ARS'] ?? { color: '#6366F1', bg: '#EEF2FF' }
            const isPositive = (wallet.current_balance ?? 0) >= 0
            return (
              <div
                key={wallet.id}
                className="rounded-2xl p-5 group transition-all hover:-translate-y-0.5"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: currStyle.bg }}
                    >
                      <CreditCard size={22} style={{ color: currStyle.color }} />
                    </div>
                    <div>
                      <p className="font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>
                        {wallet.name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {wallet.provider ?? 'Sin proveedor'} ·{' '}
                        <span className="font-semibold" style={{ color: currStyle.color }}>
                          {wallet.currency}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(wallet)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-50)'; e.currentTarget.style.color = 'var(--brand-500)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => wallet.id && handleDelete(wallet.id)}
                      disabled={deleting === wallet.id}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--expense-50)'; e.currentTarget.style.color = 'var(--expense-500)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Balance */}
                <div
                  className="rounded-xl p-3 mb-3"
                  style={{ background: isPositive ? 'var(--income-50)' : 'var(--expense-50)' }}
                >
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                    Saldo actual
                  </p>
                  <p
                    className="text-2xl font-extrabold tabular-nums"
                    style={{ color: isPositive ? 'var(--income-600)' : 'var(--expense-600)' }}
                  >
                    {formatCurrency(wallet.current_balance ?? 0, wallet.currency ?? 'ARS')}
                  </p>
                </div>

                {/* Footer */}
                <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <TrendingUp size={12} style={{ color: 'var(--brand-500)' }} />
                  {wallet.transaction_count ?? 0} movimientos registrados
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar billetera' : 'Nueva billetera'}>
        <div className="space-y-4">
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm font-medium"
              style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}
            >
              {error}
            </div>
          )}
          <Input
            label="Nombre de la billetera"
            value={form.name ?? ''}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Mercado Pago personal"
            required
          />
          <Select
            label="Proveedor / Banco"
            value={form.provider ?? ''}
            onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
            options={providerOptions}
          />
          <Select
            label="Moneda"
            value={form.currency ?? 'ARS'}
            onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
            options={CURRENCY_OPTS}
          />
          {!editing && (
            <Input
              label="Saldo inicial"
              type="number"
              min="0"
              step="0.01"
              value={form.balance ?? 0}
              onChange={e => setForm(f => ({ ...f, balance: parseFloat(e.target.value) || 0 }))}
              hint="Ingresá el saldo con el que arranca esta billetera"
            />
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editing ? 'Guardar cambios' : 'Crear billetera'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
