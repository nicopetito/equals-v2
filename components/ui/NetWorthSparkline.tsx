'use client'

import { useMemo } from 'react'
import { Wallet, Target, TrendingUp } from 'lucide-react'
import type { WalletWithBalance, Goal, FixedTerm, Reservation } from '@/types'
import { formatCurrency } from '@/utils/format'
import { calculateNetWorth } from '@/utils/finance'

interface Props {
  wallets: WalletWithBalance[]
  goals: Goal[]
  fixedTerms: FixedTerm[]
  reservations?: Reservation[]
  // Moneda específica a mostrar, o 'all' para mostrar el total de todas.
  currency: string
  loading?: boolean
}

export function NetWorthSparkline({ wallets, goals, fixedTerms, reservations = [], currency, loading }: Props) {
  const netWorth = useMemo(
    () => calculateNetWorth(wallets, goals, fixedTerms, reservations),
    [wallets, goals, fixedTerms, reservations]
  )

  const displayCur = currency === 'all' ? 'ARS' : currency

  // Breakdown para la moneda seleccionada; si no hay datos para esa moneda, ceros.
  const breakdown = useMemo(() => {
    if (currency === 'all') {
      // Suma todos los totales por moneda en ARS equivalente (sin conversión — solo para mostrar ARS)
      return netWorth['ARS'] ?? { liquid: 0, goals: 0, investments: 0, total: 0 }
    }
    return netWorth[currency] ?? { liquid: 0, goals: 0, investments: 0, total: 0 }
  }, [netWorth, currency])

  const hasData = breakdown.total !== 0 || breakdown.liquid !== 0

  if (loading) {
    return (
      <div
        className="rounded-2xl animate-shimmer"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', minHeight: 130 }}
      />
    )
  }

  const totalPositive = breakdown.total >= 0
  const totalColor    = totalPositive ? 'var(--income-600)' : 'var(--expense-600)'

  const hasInterest = breakdown.investmentsInterest > 0

  const rows = [
    {
      label: 'Disponible',
      value: breakdown.liquid,
      icon: Wallet,
      color: 'var(--brand-500)',
      bg: 'var(--brand-50)',
    },
    ...(breakdown.goals > 0 ? [{
      label: 'Objetivos',
      value: breakdown.goals,
      icon: Target,
      color: 'var(--goal-600, #0284c7)',
      bg: 'var(--goal-50, #f0f9ff)',
    }] : []),
    // When there's no interest, show a single "Inversiones" row with the principal.
    // When there is interest, show capital and interest as separate rows.
    ...(breakdown.investmentsEstimated > 0 && !hasInterest ? [{
      label: 'Inversiones',
      value: breakdown.investments,
      icon: TrendingUp,
      color: 'var(--income-600)',
      bg: 'var(--income-50)',
    }] : []),
    ...(breakdown.investmentsEstimated > 0 && hasInterest ? [
      {
        label: 'Capital invertido',
        value: breakdown.investments,
        icon: TrendingUp,
        color: 'var(--income-600)',
        bg: 'var(--income-50)',
      },
      {
        label: 'Interés estimado',
        value: breakdown.investmentsInterest,
        icon: TrendingUp,
        color: 'var(--income-500)',
        bg: 'var(--income-50)',
      },
    ] : []),
  ]

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          Patrimonio actual
        </p>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-faint)' }}
        >
          {displayCur}
        </span>
      </div>

      {/* Total */}
      <p
        className="text-xl font-extrabold tabular-nums leading-none"
        style={{ color: totalColor, fontFamily: 'var(--font-sora)' }}
      >
        {formatCurrency(breakdown.total, displayCur)}
      </p>

      {/* Desglose */}
      {hasData ? (
        <div className="space-y-2 pt-1" style={{ borderTop: '1px solid var(--border-light, var(--border))' }}>
          {rows.map(row => (
            <div key={row.label} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: row.bg }}
                >
                  <row.icon size={11} style={{ color: row.color }} />
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.label}</span>
              </div>
              <span
                className="text-xs font-bold tabular-nums"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
              >
                {formatCurrency(row.value, displayCur)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
          Aparecerá cuando tengas billeteras, objetivos o inversiones registradas.
        </p>
      )}
    </div>
  )
}
