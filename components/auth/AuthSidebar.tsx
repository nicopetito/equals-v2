'use client'

import { TrendingUp, Target, Shield, Wallet, Zap } from 'lucide-react'

const FEATURES = [
  { icon: TrendingUp, label: 'Ingresos y gastos en tiempo real',   color: 'var(--income-400)' },
  { icon: Target,     label: 'Metas de ahorro con seguimiento',     color: 'var(--goal-400)'   },
  { icon: Shield,     label: 'Tus datos son privados y seguros',    color: 'var(--brand-300)'  },
  { icon: Wallet,     label: 'Múltiples billeteras y monedas',      color: 'var(--sky-300)'    },
]

function FinanceIllustration() {
  return (
    <svg
      viewBox="0 0 280 155"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      aria-hidden="true"
    >
      {/* Grid lines */}
      <line x1="0" y1="125" x2="280" y2="125" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
      <line x1="0" y1="95"  x2="280" y2="95"  stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
      <line x1="0" y1="65"  x2="280" y2="65"  stroke="rgba(255,255,255,0.10)" strokeWidth="1" />

      {/* Area fill */}
      <path
        d="M0 118 C35 114 55 100 88 105 C121 110 148 84 178 70 C208 56 232 42 280 28 L280 155 L0 155 Z"
        fill="rgba(255,255,255,0.11)"
      />

      {/* Line */}
      <path
        d="M0 118 C35 114 55 100 88 105 C121 110 148 84 178 70 C208 56 232 42 280 28"
        stroke="rgba(255,255,255,0.80)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      <circle cx="88"  cy="105" r="3"  fill="rgba(255,255,255,0.55)" />
      <circle cx="178" cy="70"  r="3"  fill="rgba(255,255,255,0.55)" />
      {/* Highlighted point */}
      <circle cx="253" cy="34"  r="9"  fill="rgba(255,255,255,0.14)" />
      <circle cx="253" cy="34"  r="4.5" fill="white" fillOpacity="0.90" />

      {/* Balance card */}
      <rect x="146" y="3" width="100" height="46" rx="10" fill="rgba(255,255,255,0.17)" />
      <text x="161" y="21"  fill="rgba(255,255,255,0.70)" fontSize="8.5" fontFamily="system-ui, sans-serif">Patrimonio total</text>
      <text x="161" y="38"  fill="white"                  fontSize="14"  fontFamily="system-ui, sans-serif" fontWeight="700">$124.500</text>

      {/* Growth badge */}
      <rect x="146" y="55" width="62" height="19" rx="9" fill="rgba(78,222,163,0.22)" />
      <text x="159" y="68" fill="rgba(160,255,210,0.95)" fontSize="9" fontFamily="system-ui, sans-serif" fontWeight="600">▲ +12.3%</text>

      {/* Secondary metric */}
      <rect x="4" y="5" width="82" height="38" rx="8" fill="rgba(255,255,255,0.12)" />
      <text x="14" y="20" fill="rgba(255,255,255,0.65)" fontSize="8"   fontFamily="system-ui, sans-serif">Este mes</text>
      <text x="14" y="34" fill="white"                  fontSize="12"  fontFamily="system-ui, sans-serif" fontWeight="700">−$8.200</text>
    </svg>
  )
}

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
      className="hidden lg:flex flex-col justify-between w-2/5 p-8 lg:p-10"
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

      {/* Mensaje + ilustración + features */}
      <div className="relative space-y-6">
        <div>
          <h2
            className="text-3xl font-extrabold text-white leading-tight mb-2"
            style={{ fontFamily: 'var(--font-sora)' }}
          >
            {heading}
          </h2>
          <p className="text-white/75 text-base leading-relaxed">
            {subtext}
          </p>
        </div>

        {/* Ilustración financiera */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', padding: '16px 12px 8px' }}>
          <FinanceIllustration />
        </div>

        <div className="space-y-2.5">
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
