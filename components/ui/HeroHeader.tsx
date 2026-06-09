import type { ReactNode } from 'react'

interface HeroHeaderProps {
  title: string
  subtitle?: string
  icon: React.ElementType
  iconSize?: number
  className?: string
  children?: ReactNode
}

export function HeroHeader({
  title,
  subtitle,
  icon: Icon,
  iconSize = 17,
  className,
  children,
}: HeroHeaderProps) {
  return (
    <div
      className={`enter-1 hero-animated rounded-3xl px-4 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative overflow-hidden${className ? ` ${className}` : ''}`}
      style={{ boxShadow: '0 12px 32px -8px rgba(109,59,215,0.45), 0 0 60px rgba(109,59,215,0.12)' }}
    >
      <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none opacity-10">
        <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1000 100">
          <path d="M0,80 Q150,20 300,70 T600,40 T900,10 L1000,10 L1000,100 L0,100 Z" fill="white" />
        </svg>
      </div>

      <div className="relative z-10 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.20)' }}
        >
          <Icon size={iconSize} className="text-white" />
        </div>
        <div>
          <p
            className="text-xl font-extrabold text-white"
            style={{ fontFamily: 'var(--font-sora)', letterSpacing: '-0.02em' }}
          >
            {title}
          </p>
          {subtitle && (
            <p className="text-[11px] text-white/55 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {children && (
        <div className="relative z-10 flex gap-2 flex-wrap">
          {children}
        </div>
      )}
    </div>
  )
}
