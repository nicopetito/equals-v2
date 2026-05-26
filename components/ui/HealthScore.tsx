'use client'

import { useMemo } from 'react'
import { useCountUp } from '@/hooks/useCountUp'
import { ShieldCheck, TrendingUp, AlertCircle, Trophy } from 'lucide-react'

interface HealthScoreProps {
  income: number
  expenses: number
  transactionCount: number
  categoryCount: number
  loading?: boolean
}

function getLabel(score: number): { text: string; color: string; bg: string; icon: typeof ShieldCheck } {
  if (score >= 80) return { text: 'Excelente',  color: '#16a34a', bg: 'rgba(78,222,163,0.10)',  icon: Trophy }
  if (score >= 60) return { text: 'Muy bueno',  color: '#d0bcff', bg: 'rgba(208,188,255,0.10)', icon: ShieldCheck }
  if (score >= 40) return { text: 'En progreso',color: '#ffb869', bg: 'rgba(255,184,105,0.10)', icon: TrendingUp }
  return             { text: 'Por mejorar', color: '#e11d48', bg: 'rgba(255,180,171,0.10)', icon: AlertCircle }
}

function scoreArc(score: number) {
  // SVG arc: 0â€“100 mapped to a semicircle (180Â°)
  const r = 54
  const cx = 64
  const cy = 64
  const startAngle = Math.PI
  const endAngle   = Math.PI + (score / 100) * Math.PI
  const x1 = cx + r * Math.cos(startAngle)
  const y1 = cy + r * Math.sin(startAngle)
  const x2 = cx + r * Math.cos(endAngle)
  const y2 = cy + r * Math.sin(endAngle)
  const largeArc = score > 50 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`
}

export function HealthScore({ income, expenses, transactionCount, categoryCount, loading }: HealthScoreProps) {
  const score = useMemo(() => {
    if (income === 0 && expenses === 0) return 0

    // Componentes del score (total 100)
    // 1. Balance positivo (40 pts)
    const balance = income - expenses
    const balancePts = balance >= 0 ? Math.min(40, 40 * (balance / Math.max(income, 1))) : 0

    // 2. Tasa de ahorro (30 pts): saving rate ideal > 20%
    const savingRate = income > 0 ? ((income - expenses) / income) * 100 : 0
    const savingPts = Math.max(0, Math.min(30, savingRate * 1.5))

    // 3. Actividad (20 pts): mÃ¡s de 10 transacciones
    const activityPts = Math.min(20, transactionCount * 2)

    // 4. Diversidad de categorÃ­as (10 pts)
    const diversityPts = Math.min(10, categoryCount * 2)

    return Math.round(balancePts + savingPts + activityPts + diversityPts)
  }, [income, expenses, transactionCount, categoryCount])

  const animatedScore = useCountUp(score, 1200, 0)
  const label = getLabel(score)
  const Icon  = label.icon

  const savingRate = income > 0 ? Math.max(0, Math.round(((income - expenses) / income) * 100)) : 0

  if (loading) {
    return (
      <div
        className="rounded-2xl p-5 animate-shimmer"
        style={{ height: 160, border: '1px solid var(--border)' }}
      />
    )
  }

  return (
    <div
      className="glass-card rounded-2xl p-5 flex flex-col"
    >
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: label.bg }}>
            <Icon size={16} style={{ color: label.color }} />
          </div>
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            Salud financiera
          </span>
        </div>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: label.bg, color: label.color }}
        >
          {label.text}
        </span>
      </div>

      <div className="flex items-center gap-5">
        {/* Arc gauge SVG */}
        <div className="relative shrink-0" style={{ width: 128, height: 70 }}>
          <svg viewBox="0 0 128 70" className="overflow-visible">
            {/* Track */}
            <path
              d="M 10 64 A 54 54 0 1 1 118 64"
              fill="none"
              stroke="var(--bg-subtle)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Score arc */}
            {score > 0 && (
              <path
                d={scoreArc(score)}
                fill="none"
                stroke={label.color}
                strokeWidth="10"
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 6px ${label.color}60)` }}
              />
            )}
          </svg>
          {/* NÃºmero central */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
            <span className="text-3xl font-extrabold tabular-nums leading-none" style={{ color: label.color }}>
              {animatedScore}
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>/ 100</span>
          </div>
        </div>

        {/* Detalles */}
        <div className="flex-1 space-y-2.5">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: 'var(--text-muted)' }}>Tasa de ahorro</span>
              <span className="font-bold" style={{ color: savingRate >= 20 ? 'var(--income-600)' : 'var(--expense-600)' }}>
                {savingRate}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min(savingRate, 100)}%`,
                  background: savingRate >= 20 ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' : 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: 'var(--text-muted)' }}>Actividad</span>
              <span className="font-bold" style={{ color: 'var(--brand-500)' }}>
                {transactionCount} movimientos
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min(transactionCount * 10, 100)}%`,
                  background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <p className="text-[11px] mt-3 leading-relaxed"
        style={{ color: 'var(--text-faint)', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
        Este puntaje combina balance positivo (40%), tasa de ahorro (30%), actividad (20%) y diversidad de categorías (10%).
      </p>
    </div>
  )
}



