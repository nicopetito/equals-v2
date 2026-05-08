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

const VARIANTS = {
  default: 'border-gray-800',
  income: 'border-emerald-800/50',
  expense: 'border-red-800/50',
  neutral: 'border-gray-800',
}

const ICON_VARIANTS = {
  default: 'bg-indigo-500/10 text-indigo-400',
  income: 'bg-emerald-500/10 text-emerald-400',
  expense: 'bg-red-500/10 text-red-400',
  neutral: 'bg-gray-700 text-gray-400',
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default', loading }: StatCardProps) {
  if (loading) {
    return (
      <div className={cn('bg-gray-900 border rounded-2xl p-5 animate-pulse', VARIANTS[variant])}>
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-gray-800" />
        </div>
        <div className="h-7 bg-gray-800 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-800 rounded w-1/2" />
      </div>
    )
  }

  return (
    <div className={cn('bg-gray-900 border rounded-2xl p-5 hover:border-gray-700 transition-colors', VARIANTS[variant])}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2.5 rounded-xl', ICON_VARIANTS[variant])}>
          <Icon size={20} />
        </div>
        {trend && (
          <span
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-full',
              trend.value >= 0
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-red-500/10 text-red-400'
            )}
          >
            {trend.value >= 0 ? '+' : ''}{trend.value.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-100 mb-1 tabular-nums">{value}</p>
      <p className="text-sm text-gray-500">{title}</p>
      {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
    </div>
  )
}
