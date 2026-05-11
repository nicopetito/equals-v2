'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, CreditCard, TrendingUp, Wifi } from 'lucide-react'
import { useWallets } from '@/hooks/useWallets'
import { walletsService } from '@/services/wallets.service'
import { useToast } from '@/components/providers/ToastProvider'
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

// Each currency gets a distinct credit-card gradient
const CARD_GRADIENTS: Record<string, { grad: string; glow: string; chip: string }> = {
  ARS:    { grad: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)', glow: 'rgba(99,102,241,0.4)',  chip: '#A5B4FC' },
  USD:    { grad: 'linear-gradient(135deg, #059669 0%, #047857 100%)', glow: 'rgba(5,150,105,0.4)',   chip: '#6EE7B7' },
  EUR:    { grad: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)', glow: 'rgba(2,132,199,0.4)',   chip: '#7DD3FC' },
  CRYPTO: { grad: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)', glow: 'rgba(217,119,6,0.4)',   chip: '#FDE68A' },
}

const SUMMARY_COLORS: Record<string, { color: string; bg: string }> = {
  ARS:    { color: '#6366F1', bg: '#EEF2FF' },
  USD:    { color: '#10B981', bg: '#ECFDF5' },
  EUR:    { color: '#0EA5E9', bg: '#F0F9FF' },
  CRYPTO: { color: '#F59E0B', bg: '#FFFBEB' },
}

function CardChip({ color }: { color: string }) {
  return (
    <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
      <rect x="0" y="0" width="32" height="24" rx="4" fill={color} opacity="0.9" />
      <rect x="11" y="0" width="10" height="24" fill={color} opacity="0.5" />
      <rect x="0" y="8" width="32" height="8" fill={color} opacity="0.5" />
    </svg>
  )
}

export default function WalletsPage() {
  const { data: wallets, loading, refetch } = useWallets()
  const { addToast } = useToast()
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
      if (editing?.id) {
        await walletsService.update(editing.id, form as Partial<WalletType>)
        addToast('Billetera actualizada correctamente', 'success')
      } else {
        await walletsService.create(form as Omit<WalletType, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
        addToast('Billetera creada correctamente', 'success')
      }
      setModalOpen(false); refetch()
    } catch {
      setError('Error al guardar.')
      addToast('Error al guardar la billetera', 'error')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string, name: string) {
    setDeleting(id)
    try {
      await walletsService.delete(id)
      addToast(`Billetera "${name}" eliminada`, 'info')
      refetch()
    } finally { setDeleting(null) }
  }

  const providerOptions = [
    { value: '', label: 'Sin proveedor' },
    ...WALLET_PROVIDERS.map(p => ({ value: p.name, label: p.name })),
  ]

  const totalByCurrency = wallets.reduce<Record<string, number>>((acc, w) => {
    if (w.currency) acc[w.currency] = (acc[w.currency] ?? 0) + (w.current_balance ?? 0)
    return acc
  }, {})

  return (
    <div className="p-5 md:p-7 max-w-5xl mx-auto space-y-6 animate-fade-in">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Mis billeteras
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {wallets.length} {wallets.length === 1 ? 'billetera' : 'billeteras'} configuradas
          </p>
        </div>
        <Button onClick={openCreate} size="md">
          <Plus size={16} /> Nueva billetera
        </Button>
      </div>

      {/* Resumen total por moneda */}
      {Object.keys(totalByCurrency).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(totalByCurrency).map(([curr, bal]) => {
            const s = SUMMARY_COLORS[curr] ?? { color: '#6366F1', bg: '#EEF2FF' }
            return (
              <div
                key={curr}
                className="rounded-2xl p-4 transition-all hover:-translate-y-0.5"
                style={{ background: s.bg, border: `1px solid ${s.color}20` }}
              >
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full" style={{ background: s.color + '20', color: s.color }}>
                  {curr}
                </span>
                <p className="text-2xl font-extrabold tabular-nums mt-2" style={{ color: bal >= 0 ? 'var(--income-600)' : 'var(--expense-600)' }}>
                  {formatCurrency(bal, curr)}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Saldo total</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Grid de tarjetas estilo credit card */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[1, 2].map(i => (
            <div key={i} className="rounded-3xl animate-shimmer" style={{ height: 200 }} />
          ))}
        </div>
      ) : wallets.length === 0 ? (
        <EmptyState
          type="wallets"
          title="Sin billeteras"
          description="Agregá tu primera billetera para empezar a registrar tus movimientos."
          action={{ label: '+ Nueva billetera', onClick: openCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {wallets.map(wallet => {
            const curr    = wallet.currency ?? 'ARS'
            const cardStyle = CARD_GRADIENTS[curr] ?? CARD_GRADIENTS.ARS
            const isPositive = (wallet.current_balance ?? 0) >= 0
            // Fake last 4 digits from wallet id for visual realism
            const last4 = wallet.id ? wallet.id.slice(-4).toUpperCase() : '••••'

            return (
              <div
                key={wallet.id}
                className="relative rounded-3xl p-6 overflow-hidden group transition-all hover:-translate-y-1 hover:scale-[1.01]"
                style={{
                  background: cardStyle.grad,
                  boxShadow: `0 8px 32px ${cardStyle.glow}`,
                  minHeight: 200,
                }}
              >
                {/* Decorative circles */}
                <div
                  className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                />
                <div
                  className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full pointer-events-none"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                />

                {/* Fila superior: chip + acciones */}
                <div className="relative flex items-start justify-between mb-5">
                  <CardChip color={cardStyle.chip} />
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-extrabold px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                    >
                      {curr}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(wallet)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors text-white"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => wallet.id && handleDelete(wallet.id, wallet.name)}
                        disabled={deleting === wallet.id}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/20 hover:bg-red-400/60 transition-colors text-white"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Nombre y proveedor */}
                <div className="relative mb-1">
                  <p className="text-white font-extrabold text-lg leading-tight">{wallet.name}</p>
                  <p className="text-white/65 text-xs font-medium">{wallet.provider ?? 'Sin proveedor'}</p>
                </div>

                {/* Número estilizado */}
                <p className="relative text-white/50 text-sm font-mono tracking-widest mb-3">
                  ••••  ••••  ••••  {last4}
                </p>

                {/* Balance + movimientos */}
                <div className="relative flex items-end justify-between">
                  <div>
                    <p className="text-white/65 text-xs font-medium mb-0.5">Saldo disponible</p>
                    <p className="text-white text-2xl font-extrabold tabular-nums">
                      {formatCurrency(wallet.current_balance ?? 0, curr)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-white/65 text-xs">
                      <TrendingUp size={11} />
                      <span className="font-semibold">{wallet.transaction_count ?? 0} movimientos</span>
                    </div>
                    <Wifi size={18} className="text-white/40 ml-auto mt-1" />
                  </div>
                </div>
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
            placeholder="Ej: Mercado Pago, Efectivo, Cuenta USD"
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
              type="number" min="0" step="0.01"
              value={form.balance ?? 0}
              onChange={e => setForm(f => ({ ...f, balance: parseFloat(e.target.value) || 0 }))}
              hint="El saldo con el que arranca esta billetera"
            />
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editing ? 'Guardar cambios' : 'Crear billetera'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
