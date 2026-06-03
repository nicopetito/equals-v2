'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Wallet, Check, ChevronRight, ChevronLeft, ArrowRight, Plus,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { modalOverlay, scaleIn, stepForward } from '@/utils/animations'
import { useAuth } from '@/hooks/useAuth'
import { useWallets } from '@/hooks/useWallets'
import { walletsService } from '@/services/wallets.service'
import { useToast } from '@/components/providers/ToastProvider'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

// ─── Constants ────────────────────────────────────────────────────────────────

type Step = 'intro' | 'form' | 'success'

const QUICK_NAMES = ['Digital', 'Efectivo', 'Banco', 'Mercado Pago', 'Ualá', 'Otra']

const CURRENCY_OPTS = [
  { value: 'ARS',    label: 'ARS — Pesos argentinos' },
  { value: 'USD',    label: 'USD — Dólares'           },
  { value: 'EUR',    label: 'EUR — Euros'              },
  { value: 'CRYPTO', label: 'CRYPTO — Criptomonedas'  },
]

const INTRO_BULLETS = [
  { icon: '💳', text: 'Es el lugar desde donde entra o sale tu dinero: efectivo, banco, Mercado Pago, Ualá u otra cuenta.' },
  { icon: '📊', text: 'Sin una billetera, Equal no puede registrar ingresos ni gastos correctamente.' },
  { icon: '✏️', text: 'Podés editarla, agregar más billeteras y cambiar todo en cualquier momento.' },
  { icon: '0️⃣', text: 'El saldo inicial puede ser 0 si todavía no sabés cuánto tenés o no querés cargarlo ahora.' },
]

// ─── Main component ───────────────────────────────────────────────────────────

export function FirstWalletWizard() {
  const { user }                               = useAuth()
  const { data: wallets, loading, refetch }    = useWallets()
  const { addToast }                           = useToast()
  const router                                 = useRouter()

  const [visible, setVisible]       = useState<boolean | null>(null)
  const [step, setStep]             = useState<Step>('intro')
  const [name, setName]             = useState('')
  const [currency, setCurrency]     = useState('ARS')
  const [balance, setBalance]       = useState('0')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [createdName, setCreatedName] = useState('')

  useEffect(() => {
    if (loading || !user?.id || visible !== null) return
    if (wallets.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true)
      // Marcar WelcomeModal como visto — el wizard cubre ese flujo
      localStorage.setItem(`equal_welcomed_${user.id}`, '1')
    } else {
      setVisible(false)
    }
  }, [loading, user?.id, wallets.length, visible])

  if (!visible) return null

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) { setError('El nombre es obligatorio.'); return }
    setError(null)
    setSaving(true)
    try {
      await walletsService.create({ name: trimmed, currency, balance: parseFloat(balance) || 0 })
      setCreatedName(trimmed)
      refetch()
      setStep('success')
    } catch {
      addToast('No se pudo crear la billetera. Intentá de nuevo.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      variants={modalOverlay}
      initial="hidden"
      animate="visible"
      style={{ background: 'rgba(13,15,28,0.72)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        variants={scaleIn}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-xl)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div key="intro" variants={stepForward} initial="hidden" animate="visible" exit="exit">
              <IntroStep onNext={() => setStep('form')} />
            </motion.div>
          )}
          {step === 'form' && (
            <motion.div key="form" variants={stepForward} initial="hidden" animate="visible" exit="exit">
              <FormStep
                name={name}
                setName={setName}
                currency={currency}
                setCurrency={setCurrency}
                balance={balance}
                setBalance={setBalance}
                error={error}
                saving={saving}
                onBack={() => { setError(null); setStep('intro') }}
                onSubmit={handleCreate}
              />
            </motion.div>
          )}
          {step === 'success' && (
            <motion.div key="success" variants={stepForward} initial="hidden" animate="visible" exit="exit">
              <SuccessStep
                walletName={createdName}
                onDashboard={() => setVisible(false)}
                onNewWallet={() => { setVisible(false); router.push('/wallets') }}
                onNewTransaction={() => { setVisible(false); router.push('/transactions') }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

// ─── IntroStep ────────────────────────────────────────────────────────────────

function IntroStep({ onNext }: { onNext: () => void }) {
  return (
    <div>
      {/* Gradient header */}
      <div
        className="px-8 pt-8 pb-6 text-center"
        style={{ background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        >
          <Wallet size={26} className="text-white" />
        </div>
        <h2
          className="text-xl font-extrabold text-white leading-snug"
          style={{ fontFamily: 'var(--font-sora)' }}
        >
          Empecemos por tu<br />primera billetera
        </h2>
        <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.72)' }}>
          Paso 1 de 2
        </p>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-5">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          ¿Qué es una billetera en Equal?
        </p>

        <div className="space-y-3.5">
          {INTRO_BULLETS.map(({ icon, text }) => (
            <div key={icon} className="flex items-start gap-3">
              <span className="text-lg leading-none shrink-0 mt-0.5">{icon}</span>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {text}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={onNext}
          className="w-full rounded-xl py-3 font-bold text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)' }}
        >
          Crear mi primera billetera
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

// ─── FormStep ─────────────────────────────────────────────────────────────────

interface FormStepProps {
  name: string;     setName: (v: string) => void
  currency: string; setCurrency: (v: string) => void
  balance: string;  setBalance: (v: string) => void
  error: string | null
  saving: boolean
  onBack: () => void
  onSubmit: () => void
}

function FormStep({
  name, setName, currency, setCurrency, balance, setBalance,
  error, saving, onBack, onSubmit,
}: FormStepProps) {
  return (
    <div>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg transition-colors shrink-0"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          aria-label="Volver"
        >
          <ChevronLeft size={16} />
        </button>
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            Paso 2 de 2
          </p>
          <h3
            className="font-extrabold text-base leading-tight"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
          >
            Creá tu billetera
          </h3>
        </div>
      </div>

      {/* Form body */}
      <div className="px-6 py-5 space-y-4">
        {/* Quick name chips */}
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: 'var(--text-muted)' }}
          >
            Elegí un nombre rápido
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_NAMES.map(qn => (
              <button
                key={qn}
                type="button"
                onClick={() => setName(qn)}
                className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={name === qn
                  ? {
                      background: 'var(--brand-50)',
                      color: 'var(--brand-600)',
                      border: '1.5px solid var(--brand-400)',
                    }
                  : {
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-secondary)',
                      border: '1.5px solid var(--border)',
                    }
                }
              >
                {qn}
              </button>
            ))}
          </div>
        </div>

        {/* Name input */}
        <Input
          label="Nombre de la billetera"
          value={name}
          onChange={e => { setName(e.target.value) }}
          placeholder="Ej: Digital, Efectivo, Banco…"
          error={error ?? undefined}
          required
          autoFocus
        />

        {/* Currency */}
        <Select
          label="Moneda"
          value={currency}
          onChange={e => setCurrency(e.target.value)}
          options={CURRENCY_OPTS}
        />

        {/* Balance */}
        <div>
          <Input
            label="Saldo inicial"
            type="number"
            min="0"
            step="0.01"
            value={balance}
            onChange={e => setBalance(e.target.value)}
          />
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Podés dejarlo en 0 y modificarlo después.
          </p>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="w-full rounded-xl py-3 font-bold text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)' }}
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Creando…
            </>
          ) : (
            <>
              Crear billetera
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── SuccessStep ──────────────────────────────────────────────────────────────

interface SuccessStepProps {
  walletName: string
  onDashboard: () => void
  onNewWallet: () => void
  onNewTransaction: () => void
}

function SuccessStep({ walletName, onDashboard, onNewWallet, onNewTransaction }: SuccessStepProps) {
  return (
    <div className="px-6 py-8 text-center">
      {/* Check icon */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
        style={{
          background: 'var(--income-50)',
          border: '2px solid var(--income-200)',
        }}
      >
        <Check size={30} style={{ color: 'var(--income-500)' }} />
      </div>

      <h3
        className="text-xl font-extrabold mb-2 leading-snug"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
      >
        ¡Tu primera billetera<br />está lista!
      </h3>

      <p className="text-sm mb-7 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <span className="font-semibold" style={{ color: 'var(--brand-500)' }}>
          &ldquo;{walletName}&rdquo;
        </span>{' '}
        está lista para usar. Ahora Equal puede registrar movimientos reales asociados a esta billetera.
      </p>

      <div className="space-y-2.5">
        <button
          onClick={onNewTransaction}
          className="w-full rounded-xl py-2.5 font-bold text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)' }}
        >
          <Plus size={14} />
          Registrar primer ingreso
        </button>

        <button
          onClick={onNewWallet}
          className="w-full rounded-xl py-2.5 font-semibold text-sm transition-colors"
          style={{
            color: 'var(--brand-600)',
            background: 'var(--brand-50)',
            border: '1.5px solid var(--brand-100)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-100)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--brand-50)' }}
        >
          Crear otra billetera
        </button>

        <button
          onClick={onDashboard}
          className="w-full rounded-xl py-2.5 font-medium text-sm transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          Ir al dashboard →
        </button>
      </div>
    </div>
  )
}
