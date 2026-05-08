import { cn } from '@/lib/utils'
import type { TransactionType } from '@/types'

interface TypeBadgeProps {
  type: TransactionType
}

export function TypeBadge({ type }: TypeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
        type === 'income'
          ? 'bg-emerald-500/10 text-emerald-400'
          : 'bg-red-500/10 text-red-400'
      )}
    >
      {type === 'income' ? 'Ingreso' : 'Gasto'}
    </span>
  )
}
