import type { TransactionType } from '@/types'

interface TypeBadgeProps {
  type: TransactionType
}

export function TypeBadge({ type }: TypeBadgeProps) {
  const isIncome = type === 'income'
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide"
      style={isIncome
        ? { background: 'var(--income-50)', color: 'var(--income-600)', border: '1px solid rgba(16,185,129,0.2)' }
        : { background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid rgba(244,63,94,0.2)' }
      }
    >
      {isIncome ? '↑ Ingreso' : '↓ Gasto'}
    </span>
  )
}
