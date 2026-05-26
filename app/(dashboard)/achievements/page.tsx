'use client'

import { useMemo, useEffect, useState } from 'react'
import React from 'react'
import {
  TrendingUp, Award, Flame, Target, CheckCircle2, Lock,
  EyeOff, PiggyBank, LayoutGrid, Tags, CheckSquare,
  CalendarCheck, ShieldCheck, BookOpen, Edit3, FileText,
  Upload, Trophy, Globe, ListChecks, DollarSign, Banknote,
  Lightbulb,
} from 'lucide-react'
import { PageHeader }       from '@/components/ui/PageHeader'
import { HelpButton }       from '@/components/help/HelpButton'
import { EmptyState }       from '@/components/ui/EmptyState'
import { useTransactions }  from '@/hooks/useTransactions'
import { useGoals }         from '@/hooks/useGoals'
import { useAuth }          from '@/hooks/useAuth'
import { useFixedTerms }    from '@/hooks/useFixedTerms'
import { useBudgets }       from '@/hooks/useBudgets'
import { safeNumber }       from '@/utils/format'
import {
  computeAchievements, updateStreak, getImportUsed,
  type Achievement, type AchievementState, type AchievementCategory,
  type StreakData,
} from '@/utils/achievements'

// ── Configuración visual por categoría ──────────────────────────────────────

const CATEGORY_CONFIG: Record<AchievementCategory, {
  label: string; color: string; bg: string; border: string
}> = {
  ahorro:       { label: 'Ahorro',       color: 'var(--income-500)', bg: 'var(--income-50)',   border: 'var(--income-100)' },
  organización: { label: 'Organización', color: 'var(--goal-500)',   bg: 'var(--goal-50)',     border: 'var(--goal-100)' },
  disciplina:   { label: 'Disciplina',   color: 'var(--brand-500)',  bg: 'var(--brand-50)',    border: 'var(--brand-100)' },
  inversión:    { label: 'Inversión',    color: '#D97706',           bg: '#FFFBEB',            border: '#FDE68A' },
  objetivos:    { label: 'Objetivos',    color: 'var(--sky-500)',    bg: 'var(--sky-50)',      border: 'var(--sky-100)' },
  constancia:   { label: 'Constancia',   color: 'var(--expense-500)',bg: 'var(--expense-50)',  border: 'var(--expense-100)' },
}

// ── Mapa de iconos ────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  PiggyBank, TrendingUp, Banknote, BookOpen, LayoutGrid, Tags, CheckSquare,
  Flame, CalendarCheck, Award, ShieldCheck, Edit3, FileText, Upload,
  Target, CheckCircle2, Trophy, ListChecks, Globe, DollarSign,
}

function getIcon(name: string): React.ElementType {
  return ICON_MAP[name] ?? Award
}

// ── Filtros ───────────────────────────────────────────────────────────────────

type FilterTab = 'all' | AchievementState

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all',         label: 'Todos' },
  { value: 'unlocked',    label: 'Desbloqueados' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'locked',      label: 'Bloqueados' },
  { value: 'hidden',      label: 'Ocultos' },
]

// ── Insights motivacionales ───────────────────────────────────────────────────

function computeInsights(
  streak: StreakData,
  achievements: Achievement[],
  savingRate: number,
): string[] {
  const insights: string[] = []

  if (streak.current > 0 && streak.current < streak.best) {
    const diff = streak.best - streak.current
    if (diff <= 3) {
      insights.push(
        `Estás a ${diff} día${diff === 1 ? '' : 's'} de superar tu mejor racha de ${streak.best} días.`
      )
    }
  }
  if (streak.current > 0 && streak.current >= streak.best && streak.best >= 7) {
    insights.push(`Racha activa de ${streak.current} días — tu mejor marca personal. Seguí así.`)
  }

  const closest = achievements
    .filter(a => a.state === 'in_progress' && (a.progress ?? 0) >= 70)
    .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))[0]

  if (closest) {
    insights.push(`Estás al ${closest.progress?.toFixed(0)}% de "${closest.title}". Casi lo lográs.`)
  }

  if (insights.length < 2) {
    if (savingRate >= 20) {
      insights.push(`Tu tasa de ahorro este mes es ${savingRate.toFixed(0)}% — muy por encima del promedio.`)
    } else if (savingRate > 0 && savingRate < 10) {
      insights.push(`Tu tasa de ahorro este mes es ${savingRate.toFixed(0)}%. Pequeños ajustes pueden llevarte al 10%.`)
    }
  }

  return insights.slice(0, 2)
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function StateBadge({
  state,
  catColor,
  catBg,
  catBorder,
}: {
  state: AchievementState
  catColor: string
  catBg: string
  catBorder: string
}) {
  if (state === 'unlocked') return (
    <span
      className="text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1"
      style={{ background: catBg, color: catColor, border: `1px solid ${catBorder}` }}
    >
      <CheckCircle2 size={9} />
      Logrado
    </span>
  )
  if (state === 'in_progress') return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
      style={{ background: 'var(--goal-50)', color: 'var(--goal-600)', border: '1px solid var(--goal-100)' }}
    >
      En progreso
    </span>
  )
  if (state === 'hidden') return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
      style={{ background: 'var(--bg-subtle)', color: 'var(--text-faint)', border: '1px solid var(--border)' }}
    >
      Oculto
    </span>
  )
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1"
      style={{ background: 'var(--bg-subtle)', color: 'var(--text-faint)', border: '1px solid var(--border)' }}
    >
      <Lock size={8} />
      Bloqueado
    </span>
  )
}

function AchievementCard({ a }: { a: Achievement }) {
  const cat      = CATEGORY_CONFIG[a.category]
  const isHidden   = a.state === 'hidden'
  const isUnlocked = a.state === 'unlocked'
  const isLocked   = a.state === 'locked'
  const isProgress = a.state === 'in_progress'

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3 transition-all duration-200 cursor-default"
      style={{
        background: 'var(--bg-card)',
        border: isUnlocked
          ? `1px solid ${cat.border}`
          : '1px solid var(--border)',
        boxShadow: isUnlocked
          ? `var(--shadow-sm), 0 0 0 1px ${cat.border}`
          : 'var(--shadow-sm)',
        opacity: isLocked || isHidden ? 0.6 : 1,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = isUnlocked
          ? `var(--shadow-sm), 0 0 0 1px ${cat.border}`
          : 'var(--shadow-sm)'
        e.currentTarget.style.transform = ''
      }}
    >
      {/* Fila 1: Ícono + badge de estado */}
      <div className="flex items-start justify-between gap-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: isHidden || isLocked ? 'var(--bg-subtle)' : cat.bg }}
        >
          {isHidden
            ? <EyeOff size={18} style={{ color: 'var(--text-faint)' }} />
            : isLocked
            ? <Lock size={18} style={{ color: 'var(--text-faint)' }} />
            : React.createElement(getIcon(a.icon), { size: 18, style: { color: cat.color } })
          }
        </div>
        <StateBadge
          state={a.state}
          catColor={cat.color}
          catBg={cat.bg}
          catBorder={cat.border}
        />
      </div>

      {/* Fila 2: Categoría + título + descripción */}
      <div className="space-y-1">
        {!isHidden && (
          <span
            className="inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}
          >
            {cat.label}
          </span>
        )}
        <p
          className="text-sm font-extrabold leading-tight"
          style={{ color: isHidden ? 'var(--text-faint)' : 'var(--text-primary)' }}
        >
          {isHidden ? '???' : a.title}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {isHidden ? 'Seguí usando Equal para descubrirlo' : a.description}
        </p>
      </div>

      {/* Fila 3: Barra de progreso (solo en_progreso) */}
      {isProgress && a.progress !== undefined && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {a.progressLabel}
            </span>
            <span className="text-xs font-bold" style={{ color: cat.color }}>
              {a.progress.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${a.progress}%`,
                background: `linear-gradient(90deg, ${cat.color}99, ${cat.color})`,
              }}
            />
          </div>
        </div>
      )}

      {/* Fila 3 alt: label cuando está desbloqueado */}
      {isUnlocked && a.progressLabel && (
        <p className="text-xs font-semibold" style={{ color: cat.color }}>
          {a.progressLabel}
        </p>
      )}

      {/* Fila 4: Fecha de desbloqueo (cuando disponible) */}
      {isUnlocked && a.unlockedAt && (
        <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
          Desbloqueado el{' '}
          {new Date(a.unlockedAt).toLocaleDateString('es-AR', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </p>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AchievementsPage() {
  const { data: transactions } = useTransactions()
  const { data: goals }        = useGoals()
  const { user }               = useAuth()
  const { items: fixedTerms }  = useFixedTerms()
  const now = new Date()
  const { data: budgets }      = useBudgets(now.getMonth() + 1, now.getFullYear())

  const [streak, setStreak]         = useState<StreakData>({ current: 0, best: 0, lastDate: null })
  const [activeFilter, setFilter]   = useState<FilterTab>('all')

  useEffect(() => {
    if (!user?.id) return
    const updated = updateStreak(user.id)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStreak(updated)
  }, [user?.id])

  const importUsed      = user?.id ? getImportUsed(user.id) : false
  const fixedTermsCount = fixedTerms.length
  const hasBudgets      = budgets.length > 0 // TODO: expandir a histórico multi-mes

  // Tasa de ahorro (para insights)
  const savingRate = useMemo(() => {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthTx    = transactions.filter(t => new Date(t.date) >= monthStart)
    const income     = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + safeNumber(t.amount), 0)
    const expenses   = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + safeNumber(t.amount), 0)
    return income > 0 ? ((income - expenses) / income) * 100 : 0
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions])

  const achievements = useMemo(
    () => computeAchievements(transactions, goals, streak, importUsed, fixedTermsCount, hasBudgets),
    [transactions, goals, streak, importUsed, fixedTermsCount, hasBudgets]
  )

  const insights = useMemo(
    () => computeInsights(streak, achievements, savingRate),
    [streak, achievements, savingRate]
  )

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return achievements
    return achievements.filter(a => a.state === activeFilter)
  }, [achievements, activeFilter])

  const unlockedCount   = achievements.filter(a => a.state === 'unlocked').length
  const inProgressCount = achievements.filter(a => a.state === 'in_progress').length

  return (
    <div className="p-5 md:p-7 max-w-5xl mx-auto space-y-5 animate-fade-in">

      {/* 1. Header */}
      <PageHeader
        title="Progreso financiero"
        subtitle="Seguimiento de hábitos y objetivos financieros"
        icon={TrendingUp}
        color="rgba(255,255,255,0.9)"
        layout="split"
      >
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <HelpButton section="achievements" />
          {[
            { value: unlockedCount,   label: 'logros' },
            { value: inProgressCount, label: 'en progreso' },
            { value: streak.current,  label: 'días racha' },
          ].map(stat => (
            <div
              key={stat.label}
              className="flex flex-col items-center px-3 py-1.5 rounded-xl min-w-[52px]"
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.18)',
              }}
            >
              <span
                className="text-lg font-black tabular-nums leading-none"
                style={{ color: 'white' }}
              >
                {stat.value}
              </span>
              <span
                className="text-[10px] font-medium mt-0.5 text-center"
                style={{ color: 'rgba(255,255,255,0.65)' }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </PageHeader>

      {/* 2. Racha compacta */}
      <div
        className="glass-card rounded-2xl px-5 py-3.5 flex items-center gap-4 enter-1"
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--brand-50)' }}
        >
          <Flame size={18} style={{ color: 'var(--brand-500)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Racha de registro
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Abrí Equal todos los días para mantener el hábito activo
          </p>
        </div>
        <div className="flex items-center gap-5 shrink-0">
          {[
            { label: 'Actual', value: `${streak.current}d` },
            { label: 'Mejor',  value: `${streak.best}d` },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p
                className="text-lg font-black tabular-nums leading-none"
                style={{ color: 'var(--text-primary)' }}
              >
                {s.value}
              </p>
              <p
                className="text-[10px] font-semibold uppercase tracking-wide mt-0.5"
                style={{ color: 'var(--text-faint)' }}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Insights motivacionales */}
      {insights.length > 0 && (
        <div className="space-y-2 enter-2">
          {insights.map((text, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-2xl px-4 py-3"
              style={{
                background: 'var(--bg-accent-soft)',
                border: '1px solid var(--brand-100)',
              }}
            >
              <Lightbulb size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--brand-500)' }} />
              <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {text}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 4. Filtros */}
      <div
        className="flex items-center gap-1 flex-wrap rounded-2xl px-3 py-2 enter-3"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {FILTER_TABS.map(tab => {
          const count = tab.value === 'all'
            ? achievements.length
            : achievements.filter(a => a.state === tab.value).length
          const isActive = activeFilter === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-150 flex items-center gap-1.5"
              style={isActive
                ? {
                    background: 'linear-gradient(135deg,#6d3bd7,#0566d9)',
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(109,59,215,0.35)',
                  }
                : { color: 'var(--text-muted)' }
              }
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)'
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              {tab.label}
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={isActive
                  ? { background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)' }
                  : { background: 'var(--bg-subtle)', color: 'var(--text-faint)' }
                }
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* 5. Grid de logros */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Sin logros en esta categoría"
          description="Cambiá el filtro para ver todos tus progresos."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 enter-4">
          {filtered.map(a => <AchievementCard key={a.id} a={a} />)}
        </div>
      )}

    </div>
  )
}
