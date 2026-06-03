'use client'

import type { Currency } from '@/types'
import { PERIOD_OPTIONS, type Period } from '@/utils/date'

export const DASHBOARD_CURRENCIES: { value: Currency | 'all'; label: string }[] = [
  { value: 'all',    label: 'Todas' },
  { value: 'ARS',   label: 'ARS' },
  { value: 'USD',   label: 'USD' },
  { value: 'EUR',   label: 'EUR' },
  { value: 'CRYPTO', label: 'CRYPTO' },
]

interface DashboardFiltersProps {
  selectedPeriod:   Period
  onPeriodChange:   (v: Period) => void
  selectedCurrency: Currency | 'all'
  onCurrencyChange: (v: Currency | 'all') => void
  periods?:    { value: Period;            label: string }[]
  currencies?: { value: Currency | 'all'; label: string }[]
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active:   boolean
  onClick:  () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 text-xs font-semibold rounded-full whitespace-nowrap shrink-0 transition-all duration-150"
      style={active
        ? {
            background:  'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)',
            color:       '#fff',
            boxShadow:   '0 2px 8px rgba(109,59,215,0.28)',
          }
        : {
            color: 'var(--text-muted)',
          }
      }
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'var(--bg-subtle)'
          e.currentTarget.style.color      = 'var(--text-secondary)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = ''
          e.currentTarget.style.color      = 'var(--text-muted)'
        }
      }}
    >
      {children}
    </button>
  )
}

export function DashboardFilters({
  selectedPeriod,
  onPeriodChange,
  selectedCurrency,
  onCurrencyChange,
  periods    = PERIOD_OPTIONS,
  currencies = DASHBOARD_CURRENCIES,
}: DashboardFiltersProps) {
  return (
    <div
      className="rounded-2xl px-4 py-3"
      style={{
        background: 'var(--bg-card)',
        border:     '1px solid var(--border)',
        boxShadow:  'var(--shadow-sm)',
      }}
    >
      {/* Fila de períodos */}
      <div className="relative">
        <div
          className="flex items-center gap-1 overflow-x-auto pb-0.5"
          style={{ scrollbarWidth: 'none' }}
        >
          {periods.map(opt => (
            <FilterChip
              key={opt.value}
              active={selectedPeriod === opt.value}
              onClick={() => onPeriodChange(opt.value)}
            >
              {opt.label}
            </FilterChip>
          ))}
        </div>
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-8"
          style={{ background: 'linear-gradient(to right, transparent, var(--bg-card))' }}
        />
      </div>

      {/* Separador */}
      <div className="my-2" style={{ height: 1, background: 'var(--border-light)' }} />

      {/* Fila de monedas */}
      <div className="relative">
        <div
          className="flex items-center gap-1 overflow-x-auto pb-0.5"
          style={{ scrollbarWidth: 'none' }}
        >
          {currencies.map(opt => (
            <FilterChip
              key={String(opt.value)}
              active={selectedCurrency === opt.value}
              onClick={() => onCurrencyChange(opt.value)}
            >
              {opt.label}
            </FilterChip>
          ))}
        </div>
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-8"
          style={{ background: 'linear-gradient(to right, transparent, var(--bg-card))' }}
        />
      </div>
    </div>
  )
}
