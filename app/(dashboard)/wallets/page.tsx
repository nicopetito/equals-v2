'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, CreditCard, TrendingUp, TrendingDown } from 'lucide-react'
import { useWallets } from '@/hooks/useWallets'
import { walletsService } from '@/services/wallets.service'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/format'
import { WALLET_PROVIDERS } from '@/types'
import type { Wallet } from '@/types'

const CURRENCY_OPTS = [
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'CRYPTO', label: 'CRYPTO' },
]

export default function WalletsPage() {
  const { data: wallets, loading, refetch } = useWallets()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Wallet | null>(null)
  const [form, setForm] = useState<Partial<Wallet>>({ currency: 'ARS', balance: 0 })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setForm({ currency: 'ARS', balance: 0 })
    setError(null)
    setModalOpen(true)
  }

  function openEdit(w: Wallet) {
    setEditing(w)
    setForm({ ...w })
    setError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name) { setError('El nombre es obligatorio.'); return }
    setSaving(true)
    setError(null)
    try {
      if (editing?.id) {
        await walletsService.update(editing.id, form as Partial<Wallet>)
      } else {
        await walletsService.create(form as Omit<Wallet, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
      }
      setModalOpen(false)
      refetch()
    } catch { setError('Error al guardar.') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try { await walletsService.delete(id); refetch() }
    finally { setDeleting(null) }
  }

  const providerOptions = WALLET_PROVIDERS.map((p) => ({ value: p.name, label: p.name }))

  const totalByCurrency = wallets.reduce<Record<string, number>>((acc, w) => {
    if (w.currency) acc[w.currency] = (acc[w.currency] ?? 0) + (w.current_balance ?? 0)
    return acc
  }, {})

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Billeteras</h1>
          <p className="text-gray-500 text-sm mt-1">{wallets.length} billeteras</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus size={16} />
          Nueva billetera
        </Button>
      </div>

      {/* Summary */}
      {Object.keys(totalByCurrency).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(totalByCurrency).map(([curr, bal]) => (
            <div key={curr} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Total {curr}</p>
              <p className={`text-xl font-bold tabular-nums ${bal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(bal, curr)}
              </p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-500">Cargando…</div>
      ) : wallets.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Sin billeteras"
          description="Agregá tu primera billetera para empezar a registrar movimientos."
          action={{ label: 'Nueva billetera', onClick: openCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {wallets.map((wallet) => (
            <div key={wallet.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 group hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                    <CreditCard size={20} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-200">{wallet.name}</p>
                    <p className="text-xs text-gray-500">{wallet.provider ?? 'Sin proveedor'} · {wallet.currency}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(wallet)} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-500 hover:text-gray-200">
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => wallet.id && handleDelete(wallet.id)}
                    disabled={deleting === wallet.id}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${(wallet.current_balance ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(wallet.current_balance ?? 0, wallet.currency ?? 'ARS')}
              </p>
              <div className="flex gap-4 mt-3 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <TrendingUp size={12} className="text-emerald-600" />
                  {wallet.transaction_count ?? 0} movimientos
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar billetera' : 'Nueva billetera'}>
        <div className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">{error}</div>
          )}
          <Input
            label="Nombre"
            value={form.name ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Mercado Pago personal"
            required
          />
          <Select
            label="Proveedor"
            value={form.provider ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
            options={[{ value: '', label: 'Sin proveedor' }, ...providerOptions]}
          />
          <Select
            label="Moneda"
            value={form.currency ?? 'ARS'}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
            options={CURRENCY_OPTS}
          />
          {!editing && (
            <Input
              label="Saldo inicial"
              type="number"
              min="0"
              step="0.01"
              value={form.balance ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, balance: parseFloat(e.target.value) || 0 }))}
            />
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
