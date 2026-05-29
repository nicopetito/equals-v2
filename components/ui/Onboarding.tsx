'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, CreditCard, TrendingDown, Target, Check, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useWallets } from '@/hooks/useWallets'
import { useTransactions } from '@/hooks/useTransactions'
import { useGoals } from '@/hooks/useGoals'

const DONE_KEY = (userId: string) => `eq_onboarding_${userId}`

interface Step {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  cta: string
  href: string
  color: string
  bg: string
  checkCondition: boolean
}

function Confetti() {
  const pieces = Array.from({ length: 32 }, (_, i) => i)
  const colors = ['#a078ff','#059669','#ffb869','#DC2626','#adc6ff','#d0bcff','#c4b5fd']

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {pieces.map(i => {
        const color  = colors[i % colors.length]
        const left   = `${(i * 3.2) % 100}%`
        const delay  = `${(i * 0.08) % 1.5}s`
        const dur    = `${0.9 + (i % 5) * 0.2}s`
        const size   = 6 + (i % 4) * 3
        const rotate = (i * 47) % 360
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left, top: '-20px',
              width: size, height: size,
              background: color,
              borderRadius: i % 3 === 0 ? '50%' : i % 3 === 1 ? '2px' : '0',
              transform: `rotate(${rotate}deg)`,
              animation: `confettiFall ${dur} ${delay} ease-in forwards`,
            }}
          />
        )
      })}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0)   rotate(0deg)   scaleX(1); opacity: 1; }
          60%  { opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg) scaleX(0.6); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export function Onboarding() {
  const router   = useRouter()
  const { user } = useAuth()
  const { data: wallets }      = useWallets()
  const { data: transactions } = useTransactions()
  const { data: goals }        = useGoals()

  const [visible, setVisible]   = useState(false)
  const [stepIdx, setStepIdx]   = useState(0)
  const [confetti, setConfetti] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    const completed = localStorage.getItem(DONE_KEY(user.id))
    if (!completed) setVisible(true)
  }, [user?.id])

  const steps: Step[] = [
    {
      id: 'wallet',
      icon: <CreditCard size={28} />,
      title: 'Creá tu primera billetera',
      description: 'Registrá tu efectivo, cuenta bancaria o billetera virtual para empezar a llevar el control.',
      cta: 'Ir a Billeteras',
      href: '/wallets',
      color: '#F59E0B',
      bg: 'rgba(255,184,105,0.10)',
      checkCondition: wallets.length > 0,
    },
    {
      id: 'transaction',
      icon: <TrendingDown size={28} />,
      title: 'Registrá tu primer movimiento',
      description: 'Anotá un gasto o ingreso. Podés categorizar y asignarlo a una billetera.',
      cta: 'Ir a Transacciones',
      href: '/transactions',
      color: '#059669',
      bg: 'rgba(78,222,163,0.10)',
      checkCondition: transactions.length > 0,
    },
    {
      id: 'goal',
      icon: <Target size={28} />,
      title: 'Creá tu primer objetivo',
      description: '¿Ahorrás para un viaje, un auto o tu fondo de emergencia? Definí tu meta y seguí el progreso.',
      cta: 'Ir a Objetivos',
      href: '/goals',
      color: '#DC2626',
      bg: 'rgba(255,180,171,0.10)',
      checkCondition: goals.length > 0,
    },
  ]

  const currentStep = steps[stepIdx]
  const allDone     = steps.every(s => s.checkCondition)
  const progress    = steps.filter(s => s.checkCondition).length

  function markDone() {
    if (!user?.id) return
    localStorage.setItem(DONE_KEY(user.id), '1')
    setConfetti(true)
    setTimeout(() => { setConfetti(false); setVisible(false) }, 2800)
  }

  function dismiss() {
    if (!user?.id) return
    localStorage.setItem(DONE_KEY(user.id), '1')
    setVisible(false)
  }

  function goNext() {
    if (stepIdx < steps.length - 1) setStepIdx(s => s + 1)
    else markDone()
  }

  if (!visible) return null

  return (
    <>
      {confetti && <Confetti />}

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)' }}
      >
        <div
          className="relative w-full max-w-md rounded-3xl overflow-hidden animate-fade-in"
          style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-xl)' }}
        >
          {/* Barra de progreso superior */}
          <div className="h-1 w-full" style={{ background: 'var(--bg-subtle)' }}>
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${(progress / steps.length) * 100}%`,
                background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)',
              }}
            />
          </div>

          {/* Botón cerrar */}
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-black/5 z-10"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>

          <div className="p-8">
            {/* Encabezado de bienvenida (solo primer paso) */}
            {stepIdx === 0 && (
              <div className="mb-6 text-center">
                <span className="text-4xl block mb-2">👋</span>
                <h2
                  className="text-2xl font-extrabold"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
                >
                  ¡Bienvenido a Equal!
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  Completá estos 3 pasos para empezar a controlar tus finanzas
                </p>
              </div>
            )}

            {/* Indicadores de pasos */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {steps.map((s, i) => (
                <div
                  key={s.id}
                  className="flex items-center justify-center transition-all"
                  style={{
                    width: i === stepIdx ? 28 : 22,
                    height: i === stepIdx ? 28 : 22,
                    borderRadius: '50%',
                    background: s.checkCondition
                      ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                      : i === stepIdx
                        ? 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)'
                        : 'var(--bg-subtle)',
                    border: i === stepIdx && !s.checkCondition ? '2px solid var(--brand-500)' : 'none',
                  }}
                >
                  {s.checkCondition
                    ? <Check size={12} className="text-white" strokeWidth={3} />
                    : <span
                        className="text-xs font-extrabold"
                        style={{ color: i === stepIdx ? 'white' : 'var(--text-faint)' }}
                      >
                        {i + 1}
                      </span>
                  }
                </div>
              ))}
            </div>

            {/* Tarjeta del paso */}
            <div
              className="rounded-2xl p-5 mb-6 text-center"
              style={{ background: currentStep.bg, border: `1px solid ${currentStep.color}25` }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: currentStep.color + '20', color: currentStep.color }}
              >
                {currentStep.icon}
              </div>
              <h3
                className="font-extrabold text-lg mb-1"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
              >
                {currentStep.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {currentStep.description}
              </p>
              {currentStep.checkCondition && (
                <div
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full"
                  style={{ background: 'var(--income-50)', color: 'var(--income-600)' }}
                >
                  <Check size={14} strokeWidth={3} /> ¡Completado!
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              {!currentStep.checkCondition && (
                <button
                  onClick={() => { router.push(currentStep.href); dismiss() }}
                  className="flex-1 py-3.5 rounded-2xl text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{
                    background: currentStep.color,
                    boxShadow: `0 4px 16px ${currentStep.color}40`,
                  }}
                >
                  {currentStep.cta} <ChevronRight size={16} />
                </button>
              )}
              <button
                onClick={allDone ? markDone : goNext}
                className="flex-1 py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
                style={
                  allDone
                    ? { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: 'white', boxShadow: 'var(--shadow-income)' }
                    : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                }
              >
                {allDone ? '¡Listo para empezar! 🎉' : currentStep.checkCondition ? 'Continuar' : 'Omitir'}
                {!allDone && <ChevronRight size={15} />}
              </button>
            </div>

            <p className="text-center text-xs mt-4" style={{ color: 'var(--text-faint)' }}>
              {progress} de {steps.length} pasos completados
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
