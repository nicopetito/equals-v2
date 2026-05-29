'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, CreditCard, TrendingUp, Wifi, SlidersHorizontal, Stethoscope } from 'lucide-react'
import { useWallets } from '@/hooks/useWallets'
import { walletsService } from '@/services/wallets.service'
import { refundService } from '@/services/refund.service'
import { useToast } from '@/components/providers/ToastProvider'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { HelpButton } from '@/components/help/HelpButton'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { DiagnosticModal } from '@/components/wallets/DiagnosticModal'
import { formatCurrency } from '@/utils/format'
import { WALLET_PROVIDERS } from '@/types'
import type { Wallet as WalletType, WalletWithBalance } from '@/types'

const CURRENCY_OPTS = [
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'CRYPTO', label: 'CRYPTO' },
]

interface CardTheme {
  grad: string
  glow: string
  chip: string
  accent: string
}

// Premium fintech themes per provider
const PROVIDER_THEMES: Record<string, CardTheme> = {
  'Mercado Pago': {
    grad:   'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
    glow:   'rgba(124,58,237,0.38)',
    chip:   '#bfaef8',
    accent: 'rgba(255,255,255,0.10)',
  },
  'Ualá': {
    grad:   'linear-gradient(135deg, #4C1D95 0%, #6D28D9 100%)',
    glow:   'rgba(109,40,217,0.42)',
    chip:   '#ddd6fe',
    accent: 'rgba(255,255,255,0.09)',
  },
  'Brubank': {
    grad:   'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)',
    glow:   'rgba(30,58,95,0.55)',
    chip:   '#93C5FD',
    accent: 'rgba(255,255,255,0.07)',
  },
  'Banco': {
    grad:   'linear-gradient(135deg, #1E3A5F 0%, #0C4A6E 100%)',
    glow:   'rgba(12,74,110,0.50)',
    chip:   '#7DD3FC',
    accent: 'rgba(255,255,255,0.07)',
  },
  'Binance': {
    grad:   'linear-gradient(135deg, #78350F 0%, #B45309 100%)',
    glow:   'rgba(180,83,9,0.42)',
    chip:   '#FDE68A',
    accent: 'rgba(255,255,255,0.09)',
  },
  'Cash': {
    grad:   'linear-gradient(135deg, #064E3B 0%, #065F46 100%)',
    glow:   'rgba(6,95,70,0.42)',
    chip:   '#6EE7B7',
    accent: 'rgba(255,255,255,0.08)',
  },
  'Otro': {
    grad:   'linear-gradient(135deg, #374151 0%, #1F2937 100%)',
    glow:   'rgba(55,65,81,0.50)',
    chip:   '#D1D5DB',
    accent: 'rgba(255,255,255,0.07)',
  },
}

// Currency-based fallback themes
const CURRENCY_THEMES: Record<string, CardTheme> = {
  ARS:    { grad: 'linear-gradient(135deg, #5B21B6 0%, #2563EB 100%)', glow: 'rgba(91,33,182,0.40)',  chip: '#c4b5fd', accent: 'rgba(255,255,255,0.09)' },
  USD:    { grad: 'linear-gradient(135deg, #065F46 0%, #047857 100%)', glow: 'rgba(4,120,87,0.40)',   chip: '#6EE7B7', accent: 'rgba(255,255,255,0.07)' },
  EUR:    { grad: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)', glow: 'rgba(29,78,216,0.40)',  chip: '#93C5FD', accent: 'rgba(255,255,255,0.07)' },
  CRYPTO: { grad: 'linear-gradient(135deg, #78350F 0%, #B45309 100%)', glow: 'rgba(180,83,9,0.40)',   chip: '#FDE68A', accent: 'rgba(255,255,255,0.09)' },
}

// Themes the user can manually pick in the form
const SELECTABLE_THEMES: Array<{ key: string; label: string } & CardTheme> = [
  { key: 'violet-blue', label: 'Violeta',    grad: 'linear-gradient(135deg, #5B21B6 0%, #2563EB 100%)', glow: 'rgba(91,33,182,0.40)',  chip: '#c4b5fd', accent: 'rgba(255,255,255,0.09)' },
  { key: 'blue-violet', label: 'Azul',       grad: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)', glow: 'rgba(124,58,237,0.38)', chip: '#bfaef8', accent: 'rgba(255,255,255,0.10)' },
  { key: 'dark-indigo', label: 'Índigo',     grad: 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 100%)', glow: 'rgba(109,40,217,0.42)', chip: '#ddd6fe', accent: 'rgba(255,255,255,0.09)' },
  { key: 'midnight',    label: 'Medianoche', grad: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)', glow: 'rgba(30,58,95,0.55)',   chip: '#93C5FD', accent: 'rgba(255,255,255,0.07)' },
  { key: 'ocean',       label: 'Petróleo',   grad: 'linear-gradient(135deg, #1E3A5F 0%, #0C4A6E 100%)', glow: 'rgba(12,74,110,0.50)',  chip: '#7DD3FC', accent: 'rgba(255,255,255,0.07)' },
  { key: 'sky',         label: 'Cielo',      grad: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)', glow: 'rgba(29,78,216,0.40)',  chip: '#93C5FD', accent: 'rgba(255,255,255,0.07)' },
  { key: 'emerald',     label: 'Esmeralda',  grad: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)', glow: 'rgba(6,95,70,0.42)',    chip: '#6EE7B7', accent: 'rgba(255,255,255,0.08)' },
  { key: 'forest',      label: 'Bosque',     grad: 'linear-gradient(135deg, #14532D 0%, #166534 100%)', glow: 'rgba(22,101,52,0.42)',  chip: '#86EFAC', accent: 'rgba(255,255,255,0.08)' },
  { key: 'amber',       label: 'Ámbar',      grad: 'linear-gradient(135deg, #78350F 0%, #B45309 100%)', glow: 'rgba(180,83,9,0.42)',   chip: '#FDE68A', accent: 'rgba(255,255,255,0.09)' },
  { key: 'rose',        label: 'Rosa',       grad: 'linear-gradient(135deg, #881337 0%, #9F1239 100%)', glow: 'rgba(159,18,57,0.42)',  chip: '#FDA4AF', accent: 'rgba(255,255,255,0.08)' },
  { key: 'slate',       label: 'Slate',      grad: 'linear-gradient(135deg, #374151 0%, #1F2937 100%)', glow: 'rgba(55,65,81,0.50)',   chip: '#D1D5DB', accent: 'rgba(255,255,255,0.07)' },
]

const SUMMARY_COLORS: Record<string, { color: string; bg: string }> = {
  ARS:    { color: '#7C3AED', bg: 'rgba(124,58,237,0.07)' },
  USD:    { color: '#059669', bg: 'rgba(5,150,105,0.07)' },
  EUR:    { color: '#1D4ED8', bg: 'rgba(29,78,216,0.07)' },
  CRYPTO: { color: '#B45309', bg: 'rgba(180,83,9,0.07)'  },
}

function getTheme(provider?: string, currency?: string, themeKey?: string): CardTheme {
  if (themeKey) {
    const custom = SELECTABLE_THEMES.find(t => t.key === themeKey)
    if (custom) return { grad: custom.grad, glow: custom.glow, chip: custom.chip, accent: custom.accent }
  }
  if (provider && PROVIDER_THEMES[provider]) return PROVIDER_THEMES[provider]
  return CURRENCY_THEMES[currency ?? 'ARS'] ?? CURRENCY_THEMES.ARS
}

function CardChip({ color }: { color: string }) {
  return (
    <svg width="30" height="22" viewBox="0 0 32 24" fill="none">
      <rect x="0" y="0" width="32" height="24" rx="4" fill={color} opacity="0.88" />
      <rect x="11" y="0" width="10" height="24" fill={color} opacity="0.42" />
      <rect x="0" y="8" width="32" height="8"  fill={color} opacity="0.42" />
    </svg>
  )
}

// Display metadata stored in localStorage — visual only, no sensitive data
interface WalletMeta { last_four: string; alias: string; theme: string }

const EMPTY_META: WalletMeta = { last_four: '', alias: '', theme: '' }

function loadMeta(id: string): WalletMeta {
  if (typeof window === 'undefined') return EMPTY_META
  try {
    const raw = localStorage.getItem(`eq_wallet_${id}`)
    return raw ? { ...EMPTY_META, ...(JSON.parse(raw) as Partial<WalletMeta>) } : EMPTY_META
  } catch { return EMPTY_META }
}

function saveMeta(id: string, meta: WalletMeta) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(`eq_wallet_${id}`, JSON.stringify(meta)) } catch {}
}

export default function WalletsPage() {
  const { data: wallets, loading, refetch } = useWallets()
  const { addToast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<WalletType | null>(null)
  const [form, setForm]           = useState<Partial<WalletType>>({ currency: 'ARS', balance: 0 })
  const [formMeta, setFormMeta]   = useState<WalletMeta>(EMPTY_META)
  const [metas, setMetas]         = useState<Record<string, WalletMeta>>({})
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string; name: string; transactionCount: number; activeFixedTerms: number; pendingRefunds: number
  } | null>(null)
  const [error, setError]         = useState<string | null>(null)

  const [reconcileOpen, setReconcileOpen]     = useState(false)
  const [reconcileWallet, setReconcileWallet] = useState<WalletWithBalance | null>(null)
  const [reconcileTarget, setReconcileTarget] = useState('')
  const [reconciling, setReconciling]         = useState(false)

  const [diagnosticOpen, setDiagnosticOpen] = useState(false)

  useEffect(() => {
    if (!wallets.length) return
    const loaded: Record<string, WalletMeta> = {}
    wallets.forEach(w => { if (w.id) loaded[w.id] = loadMeta(w.id) })
    setMetas(loaded)
  }, [wallets])

  function openCreate() {
    setEditing(null)
    setForm({ currency: 'ARS', balance: 0 })
    setFormMeta(EMPTY_META)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(w: WalletType) {
    setEditing(w)
    setForm({ ...w })
    setFormMeta(w.id ? loadMeta(w.id) : EMPTY_META)
    setError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name) { setError('El nombre es obligatorio.'); return }
    setSaving(true); setError(null)
    try {
      if (editing?.id) {
        await walletsService.update(editing.id, form as Partial<WalletType>)
        saveMeta(editing.id, formMeta)
        addToast('Billetera actualizada correctamente', 'success')
      } else {
        const created = await walletsService.create(
          form as Omit<WalletType, 'id' | 'user_id' | 'created_at' | 'updated_at'>
        )
        if (created?.id) saveMeta(created.id, formMeta)
        addToast('Billetera creada correctamente', 'success')
      }
      setModalOpen(false)
      refetch()
    } catch {
      setError('Error al guardar.')
      addToast('Error al guardar la billetera', 'error')
    } finally { setSaving(false) }
  }

  function openReconcile(w: WalletWithBalance) {
    setReconcileWallet(w)
    setReconcileTarget(String(w.current_balance ?? 0))
    setReconcileOpen(true)
  }

  async function handleReconcile() {
    if (!reconcileWallet?.id) return
    const target = parseFloat(reconcileTarget)
    if (isNaN(target)) return
    setReconciling(true)
    try {
      // Adjust initial_balance so that current_balance matches the target
      // current_balance = initial_balance + transaction_total
      // => new initial_balance = target - transaction_total
      const newBalance = target - (reconcileWallet.transaction_total ?? 0)
      await walletsService.update(reconcileWallet.id, { balance: newBalance })
      addToast(`Saldo de "${reconcileWallet.name}" conciliado`, 'success')
      setReconcileOpen(false)
      refetch()
    } catch {
      addToast('Error al conciliar la billetera', 'error')
    } finally { setReconciling(false) }
  }

  async function handleDeleteClick(id: string, name: string) {
    setDeleting(id)
    try {
      const impact = await walletsService.getDeleteImpact(id)
      setDeleteTarget({ id, name, ...impact })
    } catch {
      addToast('Error al verificar el impacto del borrado', 'error')
    } finally {
      setDeleting(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(deleteTarget.id)
    try {
      if (deleteTarget.pendingRefunds > 0) {
        await refundService.cancelByWallet(deleteTarget.id)
      }
      await walletsService.delete(deleteTarget.id)
      addToast(`Billetera "${deleteTarget.name}" eliminada`, 'info')
      setDeleteTarget(null)
      refetch()
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Error al eliminar', 'error')
    } finally {
      setDeleting(null)
    }
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
    <div className="p-5 md:p-7 max-w-5xl mx-auto space-y-5 animate-fade-in">

      {/* Compact row header */}
      <div
        className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4 relative overflow-hidden"
        style={{
          background:  'linear-gradient(135deg, #5B21B6 0%, #2563EB 100%)',
          boxShadow:   '0 8px 24px -6px rgba(91,33,182,0.32)',
        }}
      >
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.04)' }} />

        <div className="relative flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.16)' }}
          >
            <CreditCard size={17} style={{ color: '#e0d7ff' }} />
          </div>
          <div>
            <h1
              className="text-xl font-black tracking-tight leading-none"
              style={{ color: 'rgba(255,255,255,0.97)', fontFamily: 'var(--font-sora)' }}
            >
              Mis billeteras
            </h1>
            <p className="text-xs font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.52)' }}>
              {wallets.length} {wallets.length === 1 ? 'billetera' : 'billeteras'} configuradas
            </p>
          </div>
        </div>

        <div className="relative flex gap-2">
          <HelpButton section="wallets" />
          <Button onClick={() => setDiagnosticOpen(true)} variant="secondary" size="sm">
            <Stethoscope size={14} /> Diagnóstico
          </Button>
          <Button onClick={openCreate} variant="hero-primary">
            <Plus size={14} /> Nueva billetera
          </Button>
        </div>
      </div>

      {/* Totales por moneda */}
      {Object.keys(totalByCurrency).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(totalByCurrency).map(([curr, bal]) => {
            const s = SUMMARY_COLORS[curr] ?? { color: '#7C3AED', bg: 'rgba(124,58,237,0.07)' }
            return (
              <div
                key={curr}
                className="rounded-2xl p-4 transition-all hover:-translate-y-0.5"
                style={{ background: s.bg, border: `1px solid ${s.color}20` }}
              >
                <span
                  className="text-xs font-extrabold px-2 py-0.5 rounded-full"
                  style={{ background: s.color + '18', color: s.color }}
                >
                  {curr}
                </span>
                <p
                  className="text-xl font-extrabold tabular-nums mt-2 leading-tight"
                  style={{ color: bal >= 0 ? 'var(--income-600)' : 'var(--expense-600)' }}
                >
                  {formatCurrency(bal, curr)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Saldo total</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="rounded-3xl animate-shimmer" style={{ height: 164 }} />
          ))}
        </div>
      ) : wallets.length === 0 ? (
        <EmptyState
          type="wallets"
          title="Sin billeteras"
          description="Creá tu primera billetera para registrar efectivo, cuentas bancarias o carteras digitales. Equal no accede a tus cuentas reales."
          action={{ label: '+ Nueva billetera', onClick: openCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {wallets.map(wallet => {
            const curr  = wallet.currency ?? 'ARS'
            const meta  = wallet.id ? (metas[wallet.id] ?? EMPTY_META) : EMPTY_META
            const theme = getTheme(wallet.provider, curr, meta.theme)
            const last4 = meta.last_four || (wallet.id ? wallet.id.slice(-4).toUpperCase() : '••••')

            return (
              <div
                key={wallet.id}
                className="relative rounded-3xl p-5 overflow-hidden group"
                style={{
                  background:  theme.grad,
                  boxShadow:   `0 6px 24px ${theme.glow}`,
                  minHeight:   164,
                  transition:  'box-shadow 0.25s ease, transform 0.25s ease',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.transform  = 'translateY(-3px)'
                  el.style.boxShadow  = `0 14px 38px ${theme.glow}, 0 0 0 1px rgba(255,255,255,0.09)`
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.transform  = 'translateY(0)'
                  el.style.boxShadow  = `0 6px 24px ${theme.glow}`
                }}
              >
                {/* Decorative orbs */}
                <div
                  className="absolute -top-8 -right-8 w-28 h-28 rounded-full pointer-events-none"
                  style={{ background: theme.accent }}
                />
                <div
                  className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full pointer-events-none"
                  style={{ background: theme.accent }}
                />

                {/* Top row: chip + badge + actions */}
                <div className="relative flex items-start justify-between mb-4">
                  <CardChip color={theme.chip} />
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-xs font-extrabold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.18)', color: 'white' }}
                    >
                      {curr}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => openEdit(wallet)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white transition-colors"
                        style={{ background: 'rgba(255,255,255,0.17)' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.28)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.17)')}
                        title="Editar"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => openReconcile(wallet)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white transition-colors"
                        style={{ background: 'rgba(255,255,255,0.17)' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.55)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.17)')}
                        title="Conciliar saldo"
                      >
                        <SlidersHorizontal size={11} />
                      </button>
                      <button
                        onClick={() => wallet.id && handleDeleteClick(wallet.id, wallet.name)}
                        disabled={deleting === wallet.id}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white transition-colors"
                        style={{ background: 'rgba(255,255,255,0.17)' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.50)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.17)')}
                        title="Eliminar"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Name + provider + alias */}
                <div className="relative mb-1">
                  <p className="text-white font-bold text-base leading-snug">{wallet.name}</p>
                  {wallet.provider && (
                    <p className="text-white/60 text-xs font-medium">{wallet.provider}</p>
                  )}
                  {meta.alias && (
                    <p className="text-white/40 text-xs font-mono mt-0.5">Alias: {meta.alias}</p>
                  )}
                </div>

                {/* Card number — •••• •••• •••• XXXX */}
                <p className="relative text-white/40 text-xs font-mono tracking-[0.20em] mb-3">
                  {'•••• •••• •••• '}{last4}
                </p>

                {/* Balance + transactions */}
                <div className="relative flex items-end justify-between">
                  <div>
                    <p className="text-white/50 text-xs font-medium mb-0.5">Saldo disponible</p>
                    <p className="text-white text-xl font-extrabold tabular-nums leading-none">
                      {formatCurrency(wallet.current_balance ?? 0, curr)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-white/50 text-xs">
                      <TrendingUp size={10} />
                      <span className="font-semibold">{wallet.transaction_count ?? 0} mov.</span>
                    </div>
                    <Wifi size={14} className="text-white/30" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar billetera' : 'Nueva billetera'}
      >
        <div className="space-y-4">
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
            label="Nombre de la billetera"
            value={form.name ?? ''}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Mercado Pago principal"
            required
          />

          <Select
            label="Plataforma / Banco"
            value={form.provider ?? ''}
            onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
            options={providerOptions}
          />

          <Select
            label="Moneda principal"
            value={form.currency ?? 'ARS'}
            onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
            options={CURRENCY_OPTS}
          />

          {/* Color picker */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
              Color de la tarjeta
            </p>
            <div className="flex flex-wrap gap-2">
              {/* Auto option */}
              <button
                title="Auto"
                onClick={() => setFormMeta(m => ({ ...m, theme: '' }))}
                className="h-8 px-2.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background:   formMeta.theme === '' ? 'var(--brand-50)'  : 'var(--bg-subtle)',
                  color:        formMeta.theme === '' ? 'var(--brand-600)' : 'var(--text-muted)',
                  border:       formMeta.theme === '' ? '2px solid var(--brand-400)' : '2px solid var(--border)',
                }}
              >
                Auto
              </button>

              {SELECTABLE_THEMES.map(t => (
                <button
                  key={t.key}
                  title={t.label}
                  onClick={() => setFormMeta(m => ({ ...m, theme: t.key }))}
                  className="w-8 h-8 rounded-xl transition-all duration-150"
                  style={{
                    background: t.grad,
                    outline:    formMeta.theme === t.key ? '2px solid var(--brand-400)' : '2px solid transparent',
                    outlineOffset: '2px',
                    transform:  formMeta.theme === t.key ? 'scale(1.18)' : 'scale(1)',
                    boxShadow:  `0 2px 8px ${t.glow}`,
                  }}
                />
              ))}
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              {formMeta.theme
                ? SELECTABLE_THEMES.find(t => t.key === formMeta.theme)?.label
                : 'Automático según plataforma o moneda'}
            </p>
          </div>

          {/* Visual personalization — stored locally, no sensitive data */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Últimos 4 dígitos"
              value={formMeta.last_four}
              onChange={e => setFormMeta(m => ({ ...m, last_four: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              placeholder="2574"
              hint="Solo los últimos 4 (opcional)"
              maxLength={4}
              inputMode="numeric"
            />
            <Input
              label="Alias / Apodo"
              value={formMeta.alias}
              onChange={e => setFormMeta(m => ({ ...m, alias: e.target.value }))}
              placeholder="nicopetito.mp"
              hint="Alias representativo (opcional)"
            />
          </div>

          {!editing && (
            <Input
              label="Saldo inicial"
              type="number"
              min="0"
              step="0.01"
              value={form.balance ?? 0}
              onChange={e => setForm(f => ({ ...f, balance: parseFloat(e.target.value) || 0 }))}
              hint="El saldo con el que arranca esta billetera"
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
      {/* Reconcile modal */}
      <Modal
        open={reconcileOpen}
        onClose={() => setReconcileOpen(false)}
        title="Conciliar billetera"
      >
        {reconcileWallet && (() => {
          const curr   = reconcileWallet.currency ?? 'ARS'
          const target = parseFloat(reconcileTarget)
          const diff   = isNaN(target) ? 0 : target - (reconcileWallet.current_balance ?? 0)
          const hasDiff = !isNaN(target) && reconcileTarget !== ''

          return (
            <div className="space-y-4">

              {/* Info card */}
              <div
                className="rounded-2xl p-4"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                  {reconcileWallet.name}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Saldo registrado</span>
                  <span className="text-lg font-extrabold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(reconcileWallet.current_balance ?? 0, curr)}
                  </span>
                </div>
              </div>

              <Input
                label="Saldo real de la cuenta"
                type="number"
                step="0.01"
                value={reconcileTarget}
                onChange={e => setReconcileTarget(e.target.value)}
                placeholder="0.00"
                hint="Ingresá el saldo que muestra tu banco o app"
                autoFocus
              />

              {/* Diff preview */}
              {hasDiff && (
                <div
                  className="rounded-xl px-4 py-3 flex items-center justify-between"
                  style={{
                    background: diff > 0 ? 'var(--income-50)' : diff < 0 ? 'var(--expense-50)' : 'var(--bg-subtle)',
                    border: `1px solid ${diff > 0 ? 'var(--income-100)' : diff < 0 ? 'var(--expense-100)' : 'var(--border)'}`,
                  }}
                >
                  <div>
                    <p
                      className="text-sm font-bold tabular-nums"
                      style={{ color: diff > 0 ? 'var(--income-600)' : diff < 0 ? 'var(--expense-600)' : 'var(--text-muted)' }}
                    >
                      {diff === 0 ? 'Sin diferencia' : `${diff > 0 ? '+' : ''}${formatCurrency(diff, curr)}`}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {diff === 0
                        ? 'El saldo ya coincide'
                        : 'Ajuste de conciliación — no se registra como ingreso ni gasto'}
                    </p>
                  </div>
                  {diff !== 0 && (
                    <SlidersHorizontal
                      size={18}
                      style={{ color: diff > 0 ? 'var(--income-400)' : 'var(--expense-400)', flexShrink: 0 }}
                    />
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button variant="secondary" onClick={() => setReconcileOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={handleReconcile}
                  loading={reconciling}
                  disabled={!hasDiff || diff === 0}
                  className="flex-1"
                >
                  Confirmar ajuste
                </Button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar billetera"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              ¿Eliminar la billetera <strong>"{deleteTarget.name}"</strong>? Esta acción no se puede deshacer.
            </p>

            <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Impacto</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {deleteTarget.transactionCount} transacción{deleteTarget.transactionCount !== 1 ? 'es' : ''} perderán su referencia de billetera
              </p>

              {deleteTarget.activeFixedTerms > 0 && (
                <div className="rounded-lg px-3 py-2" style={{ background: 'var(--expense-50)', border: '1px solid var(--expense-100)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--expense-600)' }}>
                    {deleteTarget.activeFixedTerms} plazo{deleteTarget.activeFixedTerms !== 1 ? 's' : ''} fijo{deleteTarget.activeFixedTerms !== 1 ? 's' : ''} activo{deleteTarget.activeFixedTerms !== 1 ? 's' : ''} quedarán sin billetera asignada
                  </p>
                </div>
              )}

              {deleteTarget.pendingRefunds > 0 && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {deleteTarget.pendingRefunds} reintegro{deleteTarget.pendingRefunds !== 1 ? 's' : ''} pendiente{deleteTarget.pendingRefunds !== 1 ? 's' : ''} serán cancelados automáticamente
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} className="flex-1">
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={confirmDelete}
                loading={!!deleting}
                className="flex-1"
              >
                Eliminar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <DiagnosticModal
        open={diagnosticOpen}
        onClose={() => setDiagnosticOpen(false)}
        liveWallets={wallets}
      />
    </div>
  )
}
