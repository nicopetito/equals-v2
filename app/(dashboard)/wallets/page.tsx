'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, CreditCard, TrendingUp, Wifi, SlidersHorizontal, Stethoscope, RotateCcw, History } from 'lucide-react'
import { useWallets } from '@/hooks/useWallets'
import { walletsService } from '@/services/wallets.service'
import { useToast } from '@/components/providers/ToastProvider'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { HelpButton } from '@/components/help/HelpButton'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { DiagnosticModal } from '@/components/wallets/DiagnosticModal'
import { WalletAdjustmentModal } from '@/components/wallets/WalletAdjustmentModal'
import { YieldConfigModal } from '@/components/wallets/YieldConfigModal'
import { YieldHistoryModal } from '@/components/wallets/YieldHistoryModal'
import { YieldCorrectionModal } from '@/components/wallets/YieldCorrectionModal'
import { YieldBanner } from '@/components/ui/YieldBanner'
import { useYieldCalculator } from '@/hooks/useYieldCalculator'
import { formatCurrency, plural } from '@/utils/format'
import { WALLET_PROVIDERS, WALLET_TYPE_OPTIONS, WALLET_NAME_SUGGESTIONS } from '@/types'
import type { Wallet as WalletType, WalletWithBalance, Currency, WalletType as WalletKind } from '@/types'
import { motion } from 'motion/react'
import { staggerContainer, staggerItem } from '@/utils/animations'

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
  const { calculatePendingYields, formatYieldToast } = useYieldCalculator()
  const hasCalculatedYields = useRef(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<WalletType | null>(null)
  const [form, setForm]           = useState<Partial<WalletType>>({ currency: 'ARS', balance: 0 })
  const [formMeta, setFormMeta]   = useState<WalletMeta>(EMPTY_META)
  const [metas, setMetas]         = useState<Record<string, WalletMeta>>({})
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string; name: string; transactionCount: number; activeFixedTerms: number; pendingRefunds: number; currentBalance: number; recurringCount: number
  } | null>(null)
  const [error, setError]         = useState<string | null>(null)

  const [adjustOpen, setAdjustOpen]     = useState(false)
  const [adjustWallet, setAdjustWallet] = useState<WalletWithBalance | null>(null)

  const [diagnosticOpen, setDiagnosticOpen] = useState(false)

  const [yieldConfigTarget, setYieldConfigTarget]       = useState<WalletWithBalance | null>(null)
  const [yieldHistoryTarget, setYieldHistoryTarget]     = useState<WalletWithBalance | null>(null)
  const [yieldCorrectionTarget, setYieldCorrectionTarget] = useState<WalletWithBalance | null>(null)

  useEffect(() => {
    if (!wallets.length) return
    const loaded: Record<string, WalletMeta> = {}
    wallets.forEach(w => { if (w.id) loaded[w.id] = loadMeta(w.id) })
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMetas(loaded)
  }, [wallets])

  // Auto-cálculo de rendimientos al cargar billeteras (idempotente por diseño del RPC)
  useEffect(() => {
    if (!wallets.length || hasCalculatedYields.current) return
    hasCalculatedYields.current = true

    calculatePendingYields(wallets).then(results => {
      results.forEach(r => addToast(formatYieldToast(r), 'success'))
      if (results.length > 0) refetch()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets.length])

  function openCreate() {
    setEditing(null)
    setForm({ currency: 'ARS', balance: 0, wallet_type: 'digital', include_in_balance: true })
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
        // Strip WalletWithBalance-only computed fields that don't exist in the wallets table
        const { initial_balance: _ib, transaction_total: _tt, current_balance: _cb, transaction_count: _tc, yield_month_total: _ymt, ...walletFields } = form as Record<string, unknown>
        await walletsService.update(editing.id, walletFields as Partial<WalletType>)
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

  function openAdjust(w: WalletWithBalance) {
    setAdjustWallet(w)
    setAdjustOpen(true)
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
    // All conditions must be clear — the modal already prevents reaching this point when blocked
    setDeleting(deleteTarget.id)
    try {
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

      <YieldBanner onConfigure={() => {
        const first = wallets[0]
        if (first) setYieldConfigTarget(first)
      }} />

      {/* Compact row header */}
      <div
        className="rounded-2xl px-4 py-4 sm:px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative overflow-hidden"
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
              {wallets.length} {plural(wallets.length, 'billetera configurada', 'billeteras configuradas')}
            </p>
          </div>
        </div>

        <div className="relative flex gap-2 flex-wrap">
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
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {Object.entries(totalByCurrency).map(([curr, bal]) => {
            const s = SUMMARY_COLORS[curr] ?? { color: '#7C3AED', bg: 'rgba(124,58,237,0.07)' }
            return (
              <motion.div key={curr} variants={staggerItem}>
              <div
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
              </motion.div>
            )
          })}
        </motion.div>
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
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {wallets.map(wallet => {
            const curr  = wallet.currency ?? 'ARS'
            const meta  = wallet.id ? (metas[wallet.id] ?? EMPTY_META) : EMPTY_META
            const theme = getTheme(wallet.provider, curr, meta.theme)
            const last4 = meta.last_four || (wallet.id ? wallet.id.slice(-4).toUpperCase() : '••••')
            const isEfectivo = wallet.wallet_type === 'cash'
              || wallet.name?.toLowerCase().includes('efectivo')
              || wallet.provider?.toLowerCase() === 'cash'

            return (
              <motion.div key={wallet.id} variants={staggerItem}>
              <div
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
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span
                      className="text-xs font-extrabold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.18)', color: 'white' }}
                    >
                      {curr}
                    </span>
                    {wallet.wallet_type === 'cash' && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.85)' }}
                      >
                        Efectivo
                      </span>
                    )}
                    {wallet.generates_yield && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                        style={{ background: 'rgba(255,255,255,0.18)', color: 'white' }}
                      >
                        <TrendingUp size={9} />
                        {wallet.annual_yield_rate ? `${Number(wallet.annual_yield_rate).toFixed(0)}% TNA` : 'Rinde'}
                      </span>
                    )}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => setYieldConfigTarget(wallet)}
                        className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-white transition-colors"
                        style={{ background: 'rgba(255,255,255,0.17)' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(109,59,215,0.55)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.17)')}
                        title="Configurar rendimiento"
                      >
                        <TrendingUp size={13} />
                      </button>
                      {wallet.generates_yield && (
                        <>
                          <button
                            onClick={() => setYieldCorrectionTarget(wallet)}
                            className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-white transition-colors"
                            style={{ background: 'rgba(255,255,255,0.17)' }}
                            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(217,119,6,0.55)')}
                            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.17)')}
                            title="Corregir último rendimiento"
                          >
                            <RotateCcw size={13} />
                          </button>
                          <button
                            onClick={() => setYieldHistoryTarget(wallet)}
                            className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-white transition-colors"
                            style={{ background: 'rgba(255,255,255,0.17)' }}
                            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.28)')}
                            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.17)')}
                            title="Historial de rendimientos"
                          >
                            <History size={13} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => openEdit(wallet)}
                        className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-white transition-colors"
                        style={{ background: 'rgba(255,255,255,0.17)' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.28)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.17)')}
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => openAdjust(wallet)}
                        className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-white transition-colors"
                        style={{ background: 'rgba(255,255,255,0.17)' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.55)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.17)')}
                        title="Ajustar billetera"
                      >
                        <SlidersHorizontal size={13} />
                      </button>
                      <button
                        onClick={() => wallet.id && handleDeleteClick(wallet.id, wallet.name)}
                        disabled={deleting === wallet.id}
                        className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-white transition-colors"
                        style={{ background: 'rgba(255,255,255,0.17)' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.50)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.17)')}
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
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
                {isEfectivo ? (
                  <p className="relative text-white/40 text-xs font-medium mb-3">Billetera física</p>
                ) : (
                  <p className="relative text-white/40 text-xs font-mono tracking-[0.20em] mb-3">
                    {'•••• •••• •••• '}{last4}
                  </p>
                )}

                {/* Balance + transactions */}
                <div className="relative flex items-end justify-between">
                  <div>
                    <p className="text-white/50 text-xs font-medium mb-0.5">Saldo disponible</p>
                    <p className="text-white text-xl font-extrabold tabular-nums leading-none whitespace-nowrap">
                      {formatCurrency(wallet.current_balance ?? 0, curr)}
                    </p>
                    {wallet.generates_yield && (wallet.yield_month_total ?? 0) > 0 && (
                      <p className="text-white/55 text-xs font-medium mt-0.5 flex items-center gap-0.5">
                        <TrendingUp size={9} />
                        +{formatCurrency(wallet.yield_month_total ?? 0, curr)} este mes
                      </p>
                    )}
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
              </motion.div>
            )
          })}
        </motion.div>
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

          <Select
            label="Tipo de billetera"
            value={form.wallet_type ?? 'digital'}
            onChange={e => setForm(f => ({ ...f, wallet_type: e.target.value as WalletKind }))}
            options={WALLET_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
          />

          <div>
            <Input
              label="Nombre de la billetera"
              value={form.name ?? ''}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Mercado Pago principal"
              required
            />
            {!editing && !form.name && (() => {
              const key = `${form.wallet_type ?? 'digital'}_${form.currency ?? 'ARS'}`
              const suggestions = WALLET_NAME_SUGGESTIONS[key] ?? []
              if (!suggestions.length) return null
              return (
                <div className="mt-2">
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Sugerencias rápidas
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map(s => (
                      <button key={s} type="button"
                        onClick={() => setForm(f => ({ ...f, name: s }))}
                        className="text-xs px-2.5 py-1 rounded-lg transition-all"
                        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--brand-500)' }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>

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

          <label className="flex items-center gap-3 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={form.include_in_balance ?? true}
              onChange={e => setForm(f => ({ ...f, include_in_balance: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Incluir en balance y patrimonio
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Desactivar si este dinero no está disponible o no querés contarlo
              </p>
            </div>
          </label>

          {editing && (
            <div
              className="rounded-xl p-3 flex items-center justify-between gap-3"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Saldo actual
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {formatCurrency((editing as WalletWithBalance).current_balance ?? 0, (editing.currency ?? 'ARS') as Currency)}
                  {' — si no coincide con la realidad, ajustá el saldo'}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setModalOpen(false)
                  setTimeout(() => {
                    setAdjustWallet(editing as WalletWithBalance)
                    setAdjustOpen(true)
                  }, 150)
                }}
              >
                <SlidersHorizontal size={13} />
                Ajustar saldo
              </Button>
            </div>
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
      <WalletAdjustmentModal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        wallet={adjustWallet}
        wallets={wallets}
        onSuccess={refetch}
      />

      {/* Delete confirmation modal */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar billetera"
      >
        {deleteTarget && (() => {
          const blockReasons: string[] = []
          if (deleteTarget.transactionCount > 0)
            blockReasons.push(`${deleteTarget.transactionCount} transacción${deleteTarget.transactionCount !== 1 ? 'es' : ''} asociada${deleteTarget.transactionCount !== 1 ? 's' : ''}`)
          if (deleteTarget.currentBalance !== 0)
            blockReasons.push(`saldo de ${formatCurrency(deleteTarget.currentBalance, '')} distinto de $0`)
          if (deleteTarget.activeFixedTerms > 0)
            blockReasons.push(`${deleteTarget.activeFixedTerms} plazo${deleteTarget.activeFixedTerms !== 1 ? 's' : ''} fijo${deleteTarget.activeFixedTerms !== 1 ? 's' : ''} activo${deleteTarget.activeFixedTerms !== 1 ? 's' : ''}`)
          if (deleteTarget.pendingRefunds > 0)
            blockReasons.push(`${deleteTarget.pendingRefunds} reintegro${deleteTarget.pendingRefunds !== 1 ? 's' : ''} pendiente${deleteTarget.pendingRefunds !== 1 ? 's' : ''}`)
          if (deleteTarget.recurringCount > 0)
            blockReasons.push(`${deleteTarget.recurringCount} operación${deleteTarget.recurringCount !== 1 ? 'es' : ''} programada${deleteTarget.recurringCount !== 1 ? 's' : ''} asignada${deleteTarget.recurringCount !== 1 ? 's' : ''}`)

          const isBlocked = blockReasons.length > 0

          return (
            <div className="space-y-4">
              {isBlocked ? (
                <>
                  <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--expense-50)', border: '1px solid var(--expense-100)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--expense-700, #b91c1c)' }}>
                      No podés eliminar esta billetera porque tiene movimientos asociados.
                    </p>
                    <ul className="space-y-1">
                      {blockReasons.map(r => (
                        <li key={r} className="text-sm flex items-start gap-1.5" style={{ color: 'var(--expense-600)' }}>
                          <span className="mt-0.5 shrink-0">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Reasigná o eliminá esos movimientos antes de continuar.
                    </p>
                  </div>
                  {deleteTarget.transactionCount > 0 && (
                    <a
                      href={`/transactions?wallet_id=${deleteTarget.id}`}
                      className="block text-center text-sm font-semibold py-2 rounded-xl transition-all"
                      style={{ background: 'var(--bg-subtle)', color: 'var(--brand-500)', border: '1px solid var(--border)' }}
                    >
                      Ver transacciones asociadas →
                    </a>
                  )}
                  <Button variant="secondary" onClick={() => setDeleteTarget(null)} className="w-full">
                    Cerrar
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    ¿Eliminar la billetera <strong>&ldquo;{deleteTarget.name}&rdquo;</strong>? Esta acción no se puede deshacer.
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Esta billetera no tiene transacciones, saldo, plazos fijos ni reintegros asociados. Es seguro eliminarla.
                  </p>
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
                </>
              )}
            </div>
          )
        })()}
      </Modal>

      <DiagnosticModal
        open={diagnosticOpen}
        onClose={() => setDiagnosticOpen(false)}
        liveWallets={wallets}
      />

      <YieldConfigModal
        open={yieldConfigTarget !== null}
        onClose={() => setYieldConfigTarget(null)}
        wallet={yieldConfigTarget}
        onSuccess={refetch}
      />

      <YieldHistoryModal
        open={yieldHistoryTarget !== null}
        onClose={() => setYieldHistoryTarget(null)}
        wallet={yieldHistoryTarget}
      />

      <YieldCorrectionModal
        open={yieldCorrectionTarget !== null}
        onClose={() => setYieldCorrectionTarget(null)}
        wallet={yieldCorrectionTarget}
        onSuccess={refetch}
      />
    </div>
  )
}
