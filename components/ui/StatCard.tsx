import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  trend?: { value: number; label: string }
  variant?: 'default' | 'income' | 'expense' | 'neutral' | 'goal' | 'sky'
  loading?: boolean
}

const VARIANTS = {
  default:  { grad: 'var(--grad-brand)',   shadow: 'var(--shadow-brand)',   text: '#EEF2FF' },
  income:   { grad: 'var(--grad-income)',  shadow: 'var(--shadow-income)',  text: '#ECFDF5' },
  expense:  { grad: 'var(--grad-expense)', shadow: 'var(--shadow-expense)', text: '#FFF1F2' },
  goal:     { grad: 'var(--grad-goal)',    shadow: '0 8px 24px rgba(245,158,11,0.35)', text: '#FFFBEB' },
  sky:      { grad: 'var(--grad-sky)',     shadow: '0 8px 24px rgba(14,165,233,0.35)', text: '#F0F9FF' },
  neutral:  { grad: 'linear-gradient(135deg,#475569,#334155)', shadow: '0 8px 24px rgba(71,85,105,0.3)', text: '#F8FAFC' },
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default', loading }: StatCardProps) {
  const v = VARIANTS[variant]

  if (loading) {
    return (
      <div
        className="rounded-2xl p-5 animate-pulse"
        style={{ background: v.grad, boxShadow: v.shadow, minHeight: 120 }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-xl bg-white/20" />
          <div className="w-14 h-6 rounded-full bg-white/20" />
        </div>
        <div className="h-8 bg-white/20 rounded-xl w-3/4 mb-2" />
        <div className="h-4 bg-white/15 rounded-lg w-1/2" />
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl p-5 flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:scale-[1.01]"
      style={{
        background: v.grad,
        boxShadow: v.shadow,
        minHeight: 120,
      }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}
        >
          <Icon size={21} className="text-white" />
        </div>
        {trend && (
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
            }}
          >
            {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value).toFixed(1)}%
          </span>
        )}
      </div>

      <div className="mt-4">
        <p className="text-2xl font-bold tabular-nums text-white leading-tight">{value}</p>
        <p className="text-sm font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>{title}</p>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{subtitle}</p>
        )}
      </div>
    </div>
  )
}
