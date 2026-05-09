import type { TransactionType } from '@/types'

interface TypeBadgeProps {
  type: TransactionType
}

export function TypeBadge({ type }: TypeBadgeProps) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={
        type === 'income'
          ? { background: '#d1fae5', color: '#059669' }
          : { background: '#fee2e2', color: '#dc2626' }
      }
    >
      {type === 'income' ? 'Ingreso' : 'Gasto'}
    </span>
  )
}
