'use client'

import { TrendingUp, Target, Shield, Wallet, Zap } from 'lucide-react'

const FEATURES = [
  { icon: TrendingUp, label: 'Ingresos y gastos en tiempo real',    color: '#4edea3' },
  { icon: Target,     label: 'Metas de ahorro con seguimiento',      color: '#ffb869' },
  { icon: Shield,     label: 'Tus datos son privados y seguros',     color: '#d0bcff' },
  { icon: Wallet,     label: 'Múltiples billeteras y monedas',       color: '#a5f3fc' },
]

interface AuthSidebarProps {
  variant?: 'default' | 'register'
}

export function AuthSidebar({ variant = 'default' }: AuthSidebarProps) {
  const heading = variant === 'register'
    ? 'Tu dinero, ordenado desde el día uno'
    : 'Tomá el control de tu dinero'

  const subtext = variant === 'register'
    ? 'Registrate gratis y empezá a tomar el control de tus finanzas personales.'
    : 'Gestioná tus finanzas de forma simple, visual y segura.'

  return (
    <div
      className="hidden lg:flex flex-col justify-between w-2/5 p-12"
      style={{
        background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Orbs decorativos */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'rgba(255,255,255,0.08)', transform: 'translate(30%, -30%)' }}
      />
      <div
        className="absolute bottom-0 left-0 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'rgba(255,255,255,0.06)', transform: 'translate(-30%, 30%)' }}
      />
      <div
        className="absolute top-1/2 left-1/2 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'rgba(255,255,255,0.03)', transform: 'translate(-50%, -50%)' }}
      />

      {/* Logo */}
      <div className="relative flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
          <Zap size={20} className="text-white" fill="white" />
        </div>
        <span className="text-white text-2xl font-extrabold" style={{ fontFamily: 'var(--font-sora)' }}>
          Equal
        </span>
      </div>

      {/* Mensaje central */}
      <div className="relative space-y-8">
        <div>
          <h2
            className="text-4xl font-extrabold text-white leading-tight mb-4"
            style={{ fontFamily: 'var(--font-sora)' }}
          >
            {heading}
          </h2>
          <p className="text-white/75 text-lg leading-relaxed">
            {subtext}
          </p>
        </div>
        <div className="space-y-3">
          {FEATURES.map(f => (
            <div key={f.label} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.18)' }}
              >
                <f.icon size={15} color={f.color} />
              </div>
              <span className="text-white/90 text-sm font-medium">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="relative text-white/40 text-xs">
        © 2025 Equal · Finanzas personales
      </p>
    </div>
  )
}
