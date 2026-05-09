import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  trend?: { value: number; label: string }
  variant?: 'default' | 'income' | 'expense' | 'neutral'
  loading?: boolean
}

const ICON_VARIANTS = {
  default: { background: 'linear-gradient(135deg,#463397,#9850eb)', color: 'white' },
  income:  { background: 'linear-gradient(135deg,#10b981,#34d399)', color: 'white' },
  expense: { background: 'linear-gradient(135deg,#ef4444,#f87171)', color: 'white' },
  neutral: { background: '#f3f4f6', color: '#6b7280' },
}

const VALUE_COLORS = {
  default: '#463397',
  income:  '#059669',
  expense: '#dc2626',
  neutral: '#374151',
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default', loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse" style={{ boxShadow: '0 2px 4px rgba(70,51,151,0.08)' }}>
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-xl bg-gray-100" />
        </div>
        <div className="h-7 bg-gray-100 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
      </div>
    )
  }

  return (
    <div
      className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-violet-200 transition-all hover:-translate-y-0.5"
      style={{ boxShadow: '0 2px 4px rgba(70,51,151,0.08)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-xl" style={ICON_VARIANTS[variant]}>
          <Icon size={20} />
        </div>
        {trend && (
          <span className={cn('text-xs font-semibold px-2 py-1 rounded-full', trend.value >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500')}>
            {trend.value >= 0 ? '+' : ''}{trend.value.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tabular-nums mb-1" style={{ color: VALUE_COLORS[variant] }}>{value}</p>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}
