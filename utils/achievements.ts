import type { TransactionWithDetails } from '@/types'
import type { Goal } from '@/types'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  color: string
  bg: string
  unlocked: boolean
  progress?: number  // 0-100
  progressLabel?: string
}

export interface StreakData {
  current: number
  best: number
  lastDate: string | null
}

// ── Streak (racha de registro) ────────────────────────────────────────────────

const STREAK_KEY = (userId: string) => `eq_streak_${userId}`

export function getStreak(userId: string): StreakData {
  if (typeof window === 'undefined') return { current: 0, best: 0, lastDate: null }
  const raw = localStorage.getItem(STREAK_KEY(userId))
  if (!raw) return { current: 0, best: 0, lastDate: null }
  return JSON.parse(raw) as StreakData
}

export function updateStreak(userId: string): StreakData {
  if (typeof window === 'undefined') return { current: 0, best: 0, lastDate: null }
  const today = new Date().toISOString().split('T')[0]
  const streak = getStreak(userId)

  if (streak.lastDate === today) return streak  // ya se contó hoy

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yStr = yesterday.toISOString().split('T')[0]

  const newCurrent = streak.lastDate === yStr ? streak.current + 1 : 1
  const updated: StreakData = {
    current: newCurrent,
    best: Math.max(newCurrent, streak.best),
    lastDate: today,
  }
  localStorage.setItem(STREAK_KEY(userId), JSON.stringify(updated))
  return updated
}

// ── Definición de logros ──────────────────────────────────────────────────────

export function computeAchievements(
  transactions: TransactionWithDetails[],
  goals: Goal[],
  streak: StreakData,
  importUsed: boolean,
): Achievement[] {
  const txCount        = transactions.length
  const completedGoals = goals.filter(g => g.is_completed).length
  const categories     = new Set(transactions.map(t => t.category_id).filter(Boolean)).size

  // Tasa de ahorro del último mes
  const now         = new Date()
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthTx     = transactions.filter(t => new Date(t.date) >= monthStart)
  const income      = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses    = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const savingRate  = income > 0 ? ((income - expenses) / income) * 100 : 0

  const list: Achievement[] = [
    // ── Primeros pasos ──
    {
      id: 'first_tx',
      title: 'Primer movimiento',
      description: 'Registraste tu primera transacción',
      icon: '🚀',
      color: '#6366F1', bg: '#EEF2FF',
      unlocked: txCount >= 1,
      progress: Math.min(txCount * 100, 100),
      progressLabel: `${Math.min(txCount, 1)}/1`,
    },
    {
      id: 'ten_tx',
      title: 'En racha',
      description: 'Registraste 10 transacciones',
      icon: '📝',
      color: '#8B5CF6', bg: '#F5F3FF',
      unlocked: txCount >= 10,
      progress: Math.min((txCount / 10) * 100, 100),
      progressLabel: `${Math.min(txCount, 10)}/10`,
    },
    {
      id: 'fifty_tx',
      title: 'Contador habitual',
      description: '50 transacciones registradas',
      icon: '📊',
      color: '#0EA5E9', bg: '#F0F9FF',
      unlocked: txCount >= 50,
      progress: Math.min((txCount / 50) * 100, 100),
      progressLabel: `${Math.min(txCount, 50)}/50`,
    },
    {
      id: 'hundred_tx',
      title: 'Centenario',
      description: '100 transacciones registradas',
      icon: '💯',
      color: '#10B981', bg: '#ECFDF5',
      unlocked: txCount >= 100,
      progress: Math.min((txCount / 100) * 100, 100),
      progressLabel: `${Math.min(txCount, 100)}/100`,
    },
    // ── Rachas ──
    {
      id: 'streak_3',
      title: '3 días seguidos',
      description: 'Registraste gastos 3 días consecutivos',
      icon: '🔥',
      color: '#F97316', bg: '#FFF7ED',
      unlocked: streak.best >= 3,
      progress: Math.min((streak.current / 3) * 100, 100),
      progressLabel: `${Math.min(streak.current, 3)}/3 días`,
    },
    {
      id: 'streak_7',
      title: 'Una semana perfecta',
      description: '7 días consecutivos registrando',
      icon: '⚡',
      color: '#F59E0B', bg: '#FFFBEB',
      unlocked: streak.best >= 7,
      progress: Math.min((streak.current / 7) * 100, 100),
      progressLabel: `${Math.min(streak.current, 7)}/7 días`,
    },
    {
      id: 'streak_30',
      title: 'Mes de oro',
      description: '30 días consecutivos sin fallar',
      icon: '👑',
      color: '#D97706', bg: '#FFFBEB',
      unlocked: streak.best >= 30,
      progress: Math.min((streak.current / 30) * 100, 100),
      progressLabel: `${Math.min(streak.current, 30)}/30 días`,
    },
    // ── Objetivos ──
    {
      id: 'first_goal',
      title: 'Soñador',
      description: 'Creaste tu primer objetivo financiero',
      icon: '🎯',
      color: '#F43F5E', bg: '#FFF1F2',
      unlocked: goals.length >= 1,
      progress: Math.min(goals.length * 100, 100),
      progressLabel: `${Math.min(goals.length, 1)}/1 objetivo`,
    },
    {
      id: 'goal_complete',
      title: '¡Meta cumplida!',
      description: 'Completaste un objetivo financiero',
      icon: '🏆',
      color: '#10B981', bg: '#ECFDF5',
      unlocked: completedGoals >= 1,
      progress: Math.min(completedGoals * 100, 100),
      progressLabel: `${completedGoals} completado${completedGoals !== 1 ? 's' : ''}`,
    },
    {
      id: 'three_goals',
      title: 'Multimeta',
      description: 'Completaste 3 objetivos financieros',
      icon: '🥇',
      color: '#D97706', bg: '#FFFBEB',
      unlocked: completedGoals >= 3,
      progress: Math.min((completedGoals / 3) * 100, 100),
      progressLabel: `${Math.min(completedGoals, 3)}/3`,
    },
    // ── Ahorro ──
    {
      id: 'saver_10',
      title: 'Ahorrador',
      description: 'Ahorraste más del 10% de tus ingresos este mes',
      icon: '💰',
      color: '#10B981', bg: '#ECFDF5',
      unlocked: savingRate >= 10,
      progress: Math.min((savingRate / 10) * 100, 100),
      progressLabel: `${savingRate.toFixed(0)}% tasa de ahorro`,
    },
    {
      id: 'saver_20',
      title: 'Super ahorrador',
      description: 'Ahorraste más del 20% de tus ingresos este mes',
      icon: '🏦',
      color: '#059669', bg: '#ECFDF5',
      unlocked: savingRate >= 20,
      progress: Math.min((savingRate / 20) * 100, 100),
      progressLabel: `${savingRate.toFixed(0)}% / 20%`,
    },
    // ── Categorías ──
    {
      id: 'categories_5',
      title: 'Organizado',
      description: 'Usaste 5 categorías diferentes',
      icon: '🗂️',
      color: '#0EA5E9', bg: '#F0F9FF',
      unlocked: categories >= 5,
      progress: Math.min((categories / 5) * 100, 100),
      progressLabel: `${Math.min(categories, 5)}/5 categorías`,
    },
    // ── Import ──
    {
      id: 'import',
      title: 'Power user',
      description: 'Importaste un resumen bancario CSV',
      icon: '📥',
      color: '#7C3AED', bg: '#F5F3FF',
      unlocked: importUsed,
    },
    // ── Especial ──
    {
      id: 'diversified',
      title: 'Inversión diversificada',
      description: 'Tenés transacciones en 3 monedas distintas',
      icon: '🌐',
      color: '#6366F1', bg: '#EEF2FF',
      unlocked: new Set(transactions.map(t => t.currency)).size >= 3,
      progress: Math.min((new Set(transactions.map(t => t.currency)).size / 3) * 100, 100),
      progressLabel: `${Math.min(new Set(transactions.map(t => t.currency)).size, 3)}/3 monedas`,
    },
  ]

  return list
}

// ── Flags en localStorage ──────────────────────────────────────────────────────

const IMPORT_KEY = (userId: string) => `eq_import_used_${userId}`

export function markImportUsed(userId: string) {
  if (typeof window !== 'undefined') localStorage.setItem(IMPORT_KEY(userId), '1')
}

export function getImportUsed(userId: string): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(IMPORT_KEY(userId)) === '1'
}
