import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  trend?: { value: number; label: string }
  variant?: 'default' | 'income' | 'expense' | 'neutral' | 'goal' | 'sky'
  soft?: boolean
  loading?: boolean
}

const ACCENT = {
  default:  { icon: '#6d3bd7', bg: '#F0EBFF', border: '#E0D6FF', text: '#6d3bd7' },
  income:   { icon: '#16a34a', bg: '#f0fdf4', border: '#dcfce7', text: '#15803d' },
  expense:  { icon: '#e11d48', bg: '#fff1f2', border: '#ffe4e6', text: '#be123c' },
  goal:     { icon: '#0566d9', bg: '#EFF6FF', border: '#DBEAFE', text: '#0452b0' },
  sky:      { icon: '#0ea5e9', bg: '#F0F9FF', border: '#E0F2FE', text: '#0284c7' },
  neutral:  { icon: '#7B87A0', bg: '#F7F8FC', border: '#E4E7EF', text: '#3D4664' },
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default', soft: _soft = false, loading }: StatCardProps) {
  const a = ACCENT[variant]

  if (loading) {
    return (
      <div className="rounded-2xl p-5 animate-shimmer"
        style={{ minHeight: 110, border: '1px solid var(--border-light)' }} />
    )
  }

  return (
    <div
      className="glass-card rounded-2xl p-5 flex flex-col justify-between transition-all duration-150 cursor-default"
      style={{ minHeight: 110 }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
        e.currentTarget.style.borderColor = a.border
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        e.currentTarget.style.borderColor = 'var(--border)'
      }}
    >
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: a.bg }}>
          <Icon size={18} style={{ color: a.icon }} />
        </div>
        {trend && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: a.bg, color: a.text, border: `1px solid ${a.border}` }}>
            {trend.value >= 0 ? 'â–²' : 'â–¼'} {Math.abs(trend.value).toFixed(1)}%
          </span>
        )}
      </div>

      <div className="mt-3">
        <p className="text-xl font-bold tabular-nums leading-tight"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
          {value}
        </p>
        <p className="text-xs font-semibold mt-0.5 uppercase tracking-wide"
          style={{ color: 'var(--text-muted)' }}>
          {title}
        </p>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>{subtitle}</p>}
      </div>
    </div>
  )
}

