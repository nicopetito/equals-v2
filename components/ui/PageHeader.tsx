import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  icon: React.ElementType
  color?: string
  children?: ReactNode
  layout?: 'centered' | 'split'
}

export function PageHeader({ title, subtitle, icon: Icon, color = '#d0bcff', children, layout = 'centered' }: PageHeaderProps) {
  return (
    <div
      className={`rounded-3xl px-6 py-6 relative overflow-hidden ${layout === 'split' ? 'flex items-center' : 'flex flex-col items-center text-center gap-3'}`}
      style={{
        background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)',
        boxShadow: '0 20px 40px -10px rgba(109,59,215,0.35)',
      }}
    >
      {/* Background wave */}
      <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none opacity-15">
        <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1000 100">
          <path d="M0,80 Q150,20 300,70 T600,40 T900,10 L1000,10 L1000,100 L0,100 Z" fill="white" fillOpacity="0.3" />
        </svg>
      </div>

      {layout === 'centered' ? (
        <>
          <div className="relative z-10 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.20)' }}
            >
              <Icon size={19} style={{ color }} />
            </div>
            <h1
              className="text-3xl font-black tracking-tight"
              style={{ color: 'rgba(255,255,255,0.96)', fontFamily: 'var(--font-sora)' }}
            >
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="relative z-10 text-sm font-medium -mt-1" style={{ color: 'rgba(255,255,255,0.60)' }}>
              {subtitle}
            </p>
          )}
          {children && (
            <div className="relative z-10 flex gap-2 flex-wrap justify-center">
              {children}
            </div>
          )}
        </>
      ) : (
        <div className="relative z-10 w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.20)' }}
            >
              <Icon size={19} style={{ color }} />
            </div>
            <div className="min-w-0">
              <h1
                className="text-3xl font-black tracking-tight leading-none"
                style={{ color: 'rgba(255,255,255,0.96)', fontFamily: 'var(--font-sora)' }}
              >
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.60)' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {children && (
            <div className="flex gap-2 flex-wrap justify-end shrink-0">
              {children}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
