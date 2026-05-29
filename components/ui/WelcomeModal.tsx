'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { CreditCard, TrendingDown, Target, Zap, X } from 'lucide-react'

const ACTIONS = [
  {
    icon: CreditCard,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.10)',
    title: 'Agregá una billetera',
    desc: 'Registrá tu efectivo, cuenta bancaria o billetera virtual.',
    href: '/wallets',
  },
  {
    icon: TrendingDown,
    color: 'var(--income-500)',
    bg: 'var(--income-50)',
    title: 'Registrá un movimiento',
    desc: 'Anotá un gasto o ingreso y empezá a ver tu situación financiera.',
    href: '/transactions',
  },
  {
    icon: Target,
    color: 'var(--goal-500)',
    bg: 'var(--goal-50)',
    title: 'Definí un objetivo',
    desc: 'Ahorrá para un viaje, un fondo de emergencia o lo que sea.',
    href: '/goals',
  },
]

export function WelcomeModal() {
  const [open,     setOpen]     = useState(false)
  const [userName, setUserName] = useState('')
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) return
    const key = `equal_welcomed_${user.id}`
    if (localStorage.getItem(key)) return

    const name: string =
      (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ||
      user.email?.split('@')[0] ||
      ''
    setUserName(name)
    setOpen(true)
  }, [user])

  function dismiss(href?: string) {
    if (!user?.id) return
    localStorage.setItem(`equal_welcomed_${user.id}`, '1')
    setOpen(false)
    if (href) router.push(href)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(13,15,28,0.55)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full max-w-lg rounded-3xl overflow-hidden animate-fade-in"
        style={{ boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)' }}
      >
        {/* Sección superior — gradiente brand */}
        <div
          className="relative p-8 text-center"
          style={{ background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)' }}
        >
          <button
            onClick={() => dismiss()}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
            aria-label="Cerrar"
          >
            <X size={15} className="text-white" />
          </button>
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-5">
            <Zap size={28} className="text-white" fill="white" />
          </div>
          <h1
            className="text-3xl font-black text-white leading-tight"
            style={{ fontFamily: 'var(--font-sora)' }}
          >
            {userName ? `Hola, ${userName}!` : '¡Bienvenido a Equal!'}
          </h1>
          <p className="text-white/75 text-sm mt-2">
            Tu cuenta está lista. Empezá a ordenar tus finanzas hoy.
          </p>
        </div>

        {/* Sección inferior — acciones */}
        <div className="p-6" style={{ background: 'var(--bg-card)' }}>
          <h2
            className="text-base font-bold mb-1"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
          >
            Por dónde empezar
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Completá estos pasos para sacarle el máximo provecho a Equal.
          </p>

          <div className="space-y-2 mb-5">
            {ACTIONS.map(action => (
              <button
                key={action.href}
                onClick={() => dismiss(action.href)}
                className="w-full flex items-center gap-3 rounded-2xl p-3.5 text-left transition-all duration-200 hover:-translate-y-px"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: action.bg }}
                >
                  <action.icon size={18} style={{ color: action.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {action.title}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                    {action.desc}
                  </p>
                </div>
                <span className="text-base flex-shrink-0" style={{ color: 'var(--text-faint)' }}>→</span>
              </button>
            ))}
          </div>

          <Button
            onClick={() => dismiss()}
            variant="secondary"
            className="w-full"
            size="md"
          >
            Explorar el dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
