'use client'
import { Tag } from 'lucide-react'
import { KIND_COPY, LABEL_COPY } from '@/utils/constants'
import type { TransactionKind } from '@/types'

interface KindBadgeProps {
  kind?: TransactionKind | null
  label?: string | null
}

const KIND_TOOLTIP: Partial<Record<TransactionKind, string>> = {
  initial_balance:    'Capital inicial al registrar la billetera. No cuenta como ingreso.',
  wallet_adjustment:  'Corrección manual de saldo. No es ingreso ni gasto real.',
  transfer:           'Movimiento entre tus billeteras. No afecta tu balance total.',
  reserve_deposit:    'Dinero reservado, no gastado aún.',
  reserve_withdrawal: 'Liberación de reserva, no es ingreso nuevo.',
  yield:              'Rendimiento estimado. Se muestra separado de ingresos.',
  refund_credit:      'Reintegro acreditado. Se incluye en ingresos pero separado del ahorro.',
}

export function KindBadge({ kind, label }: KindBadgeProps) {
  if (!kind && !label) return null
  const text    = kind ? (KIND_COPY[kind] ?? kind) : (LABEL_COPY[label!] ?? label)
  const tooltip = kind ? KIND_TOOLTIP[kind] : undefined
  return (
    <span
      aria-label={tooltip ?? text ?? undefined}
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
      style={{ background: 'rgba(109,59,215,0.10)', color: 'var(--brand-500)', border: '1px solid rgba(109,59,215,0.20)' }}
    >
      <Tag size={8} aria-hidden="true" />
      {text}
    </span>
  )
}
