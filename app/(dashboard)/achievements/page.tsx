'use client'

import { useMemo, useEffect, useState } from 'react'
import { Flame, Star } from 'lucide-react'
import { useTransactions } from '@/hooks/useTransactions'
import { useGoals } from '@/hooks/useGoals'
import { useAuth } from '@/hooks/useAuth'
import {
  computeAchievements, getStreak, updateStreak, getImportUsed,
  type Achievement,
} from '@/utils/achievements'

function AchievementCard({ a }: { a: Achievement }) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3 transition-all hover:-translate-y-0.5"
      style={{
        background: a.unlocked ? a.bg : 'var(--bg-subtle)',
        border: `1px solid ${a.unlocked ? a.color + '30' : 'var(--border)'}`,
        boxShadow: a.unlocked ? `0 4px 16px ${a.color}18` : 'none',
        opacity: a.unlocked ? 1 : 0.65,
        filter: a.unlocked ? 'none' : 'grayscale(0.4)',
      }}
    >
      {/* Ícono + estado */}
      <div className="flex items-start justify-between">
        <span className="text-3xl" style={{ filter: a.unlocked ? 'none' : 'grayscale(1)' }}>
          {a.icon}
        </span>
        {a.unlocked ? (
          <span
            className="text-xs font-extrabold px-2 py-0.5 rounded-full"
            style={{ background: a.color + '20', color: a.color }}
          >
            ✓ Desbloqueado
          </span>
        ) : (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--bg-card)', color: 'var(--text-faint)', border: '1px solid var(--border)' }}
          >
            Bloqueado
          </span>
        )}
      </div>

      {/* Título y descripción */}
      <div>
        <p className="font-extrabold text-sm" style={{ color: a.unlocked ? a.color : 'var(--text-secondary)' }}>
          {a.title}
        </p>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {a.description}
        </p>
      </div>

      {/* Barra de progreso */}
      {a.progress !== undefined && !a.unlocked && (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: 'var(--text-faint)' }}>{a.progressLabel}</span>
            <span style={{ color: 'var(--text-faint)' }}>{a.progress.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${a.progress}%`, background: `linear-gradient(90deg, ${a.color}88, ${a.color})` }}
            />
          </div>
        </div>
      )}
      {a.progress !== undefined && a.unlocked && (
        <p className="text-xs font-bold" style={{ color: a.color }}>{a.progressLabel}</p>
      )}
    </div>
  )
}

export default function AchievementsPage() {
  const { data: transactions } = useTransactions()
  const { data: goals }        = useGoals()
  const { user }               = useAuth()
  const [streak, setStreak]    = useState({ current: 0, best: 0, lastDate: null as string | null })

  useEffect(() => {
    if (!user?.id) return
    const updated = updateStreak(user.id)
    setStreak(updated)
  }, [user?.id])

  const importUsed = user?.id ? getImportUsed(user.id) : false

  const achievements = useMemo(
    () => computeAchievements(transactions, goals, streak, importUsed),
    [transactions, goals, streak, importUsed]
  )

  const unlocked = achievements.filter(a => a.unlocked)
  const locked   = achievements.filter(a => !a.unlocked)

  return (
    <div className="p-5 md:p-7 max-w-5xl mx-auto space-y-7 animate-fade-in">

      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Logros
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {unlocked.length} de {achievements.length} desbloqueados
        </p>
      </div>

      {/* Racha actual */}
      <div
        className="rounded-2xl p-5 flex items-center gap-5"
        style={{
          background: streak.current >= 3
            ? 'linear-gradient(135deg, #F97316 0%, #D97706 100%)'
            : 'var(--bg-card)',
          border: streak.current >= 3 ? 'none' : '1px solid var(--border)',
          boxShadow: streak.current >= 3 ? '0 8px 32px rgba(249,115,22,0.3)' : 'var(--shadow-sm)',
        }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: streak.current >= 3 ? 'rgba(255,255,255,0.2)' : 'var(--goal-50)' }}
        >
          <Flame
            size={28}
            style={{ color: streak.current >= 3 ? 'white' : 'var(--goal-600)' }}
            fill={streak.current >= 3 ? 'white' : 'none'}
          />
        </div>
        <div className="flex-1">
          <p
            className="text-4xl font-extrabold tabular-nums leading-none"
            style={{ color: streak.current >= 3 ? 'white' : 'var(--text-primary)' }}
          >
            {streak.current}
          </p>
          <p
            className="font-bold text-sm mt-0.5"
            style={{ color: streak.current >= 3 ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)' }}
          >
            {streak.current === 1 ? 'día de racha' : 'días de racha consecutivos'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold" style={{ color: streak.current >= 3 ? 'rgba(255,255,255,0.7)' : 'var(--text-faint)' }}>
            Mejor racha
          </p>
          <p
            className="text-2xl font-extrabold tabular-nums"
            style={{ color: streak.current >= 3 ? 'white' : 'var(--text-secondary)' }}
          >
            {streak.best}
          </p>
        </div>
      </div>

      {/* Desbloqueados */}
      {unlocked.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Star size={16} style={{ color: 'var(--goal-500)' }} fill="var(--goal-500)" />
            <h2 className="font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>
              Desbloqueados ({unlocked.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unlocked.map(a => <AchievementCard key={a.id} a={a} />)}
          </div>
        </section>
      )}

      {/* Bloqueados */}
      {locked.length > 0 && (
        <section>
          <h2 className="font-extrabold text-base mb-4" style={{ color: 'var(--text-secondary)' }}>
            Por desbloquear ({locked.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {locked.map(a => <AchievementCard key={a.id} a={a} />)}
          </div>
        </section>
      )}
    </div>
  )
}
