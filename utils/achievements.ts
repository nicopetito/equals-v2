import type { TransactionWithDetails } from '@/types'
import type { Goal } from '@/types'
import { safeNumber } from '@/utils/format'

export type AchievementState = 'unlocked' | 'in_progress' | 'locked' | 'hidden'

export type AchievementCategory =
  | 'ahorro'
  | 'organización'
  | 'disciplina'
  | 'inversión'
  | 'objetivos'
  | 'constancia'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  category: AchievementCategory
  state: AchievementState
  progress?: number
  progressLabel?: string
  unlockedAt?: string
  unlocked: boolean  // derivado: state === 'unlocked'
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

  if (streak.lastDate === today) return streak

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
  fixedTermsCount: number = 0,
  hasBudgets: boolean = false,
): Achievement[] {
  // ─ valores derivados ───────────────────────────────────────────────────────
  const txCount         = transactions.length
  const expenseTx       = transactions.filter(t => t.type === 'expense')
  const categorizedExp  = expenseTx.filter(t => t.category_id != null)
  const categorizedRate = expenseTx.length > 0
    ? (categorizedExp.length / expenseTx.length) * 100
    : 0
  const uniqueCategories = new Set(transactions.map(t => t.category_id).filter(Boolean)).size
  const uniqueCurrencies = new Set(transactions.map(t => t.currency)).size
  const completedGoals   = goals.filter(g => g.is_completed).length

  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthTx    = transactions.filter(t => new Date(t.date) >= monthStart)
  const income     = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + safeNumber(t.amount), 0)
  const expenses   = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + safeNumber(t.amount), 0)
  const savingRate = income > 0 ? ((income - expenses) / income) * 100 : 0

  // ─ helpers internos ────────────────────────────────────────────────────────

  function deriveState(
    isUnlocked: boolean,
    progress: number | undefined,
    isHidden: boolean,
  ): AchievementState {
    if (isHidden) return 'hidden'
    if (isUnlocked) return 'unlocked'
    if (progress !== undefined && progress > 0) return 'in_progress'
    return 'locked'
  }

  function make(
    partial: Omit<Achievement, 'state' | 'unlocked'> & {
      _unlocked: boolean
      _hidden?: boolean
    },
  ): Achievement {
    const { _unlocked, _hidden = false, ...rest } = partial
    const state = deriveState(_unlocked, rest.progress, _hidden)
    return { ...rest, state, unlocked: _unlocked }
  }

  // ─ lista de logros ─────────────────────────────────────────────────────────

  return [
    // ── AHORRO ──────────────────────────────────────────────────────────────
    make({
      id: 'first_saving',
      title: 'Primer ahorro',
      description: 'Tuviste tasa de ahorro positiva en el mes',
      icon: 'PiggyBank',
      category: 'ahorro',
      progress: savingRate > 0 ? 100 : 0,
      progressLabel: `${savingRate.toFixed(0)}% este mes`,
      _unlocked: savingRate > 0,
    }),
    make({
      id: 'saver_10',
      title: 'Ahorrás el 10%',
      description: 'Superás el umbral mínimo recomendado de ahorro mensual',
      icon: 'TrendingUp',
      category: 'ahorro',
      progress: Math.min((savingRate / 10) * 100, 100),
      progressLabel: `${savingRate.toFixed(0)}% / 10%`,
      _unlocked: savingRate >= 10,
    }),
    make({
      id: 'saver_20',
      title: 'Ahorrás el 20%',
      description: 'Alcanzás la regla clásica de ahorro del 20% de tus ingresos',
      icon: 'TrendingUp',
      category: 'ahorro',
      progress: Math.min((savingRate / 20) * 100, 100),
      progressLabel: `${savingRate.toFixed(0)}% / 20%`,
      _unlocked: savingRate >= 20,
    }),
    make({
      id: 'saver_30',
      title: 'Regla del 30%',
      description: 'Ahorrás más del 30% de tus ingresos mensuales',
      icon: 'Banknote',
      category: 'ahorro',
      progress: Math.min((savingRate / 30) * 100, 100),
      progressLabel: `${savingRate.toFixed(0)}% / 30%`,
      _unlocked: savingRate >= 30,
    }),

    // ── ORGANIZACIÓN ────────────────────────────────────────────────────────
    make({
      id: 'first_tx',
      title: 'Primer registro',
      description: 'Registraste tu primera transacción en Equal',
      icon: 'BookOpen',
      category: 'organización',
      progress: Math.min(txCount * 100, 100),
      progressLabel: `${Math.min(txCount, 1)}/1`,
      _unlocked: txCount >= 1,
    }),
    make({
      id: 'categorized_100',
      title: '100 transacciones',
      description: 'Llevas un registro consistente con 100 movimientos',
      icon: 'LayoutGrid',
      category: 'organización',
      progress: Math.min((txCount / 100) * 100, 100),
      progressLabel: `${Math.min(txCount, 100)}/100`,
      _unlocked: txCount >= 100,
    }),
    make({
      id: 'categories_5',
      title: '5 categorías distintas',
      description: 'Organizás tus gastos con al menos 5 categorías diferentes',
      icon: 'Tags',
      category: 'organización',
      progress: Math.min((uniqueCategories / 5) * 100, 100),
      progressLabel: `${Math.min(uniqueCategories, 5)}/5 categorías`,
      _unlocked: uniqueCategories >= 5,
    }),
    make({
      id: 'no_uncategorized',
      title: 'Sin gastos sin categoría',
      description: 'Todos tus gastos tienen categoría asignada',
      icon: 'CheckSquare',
      category: 'organización',
      progress: expenseTx.length >= 10 ? Math.round(categorizedRate) : Math.min((expenseTx.length / 10) * 100, 100),
      progressLabel: expenseTx.length >= 10
        ? `${categorizedExp.length}/${expenseTx.length} categorizados`
        : `${expenseTx.length}/10 gastos registrados`,
      _unlocked: expenseTx.length >= 10 && categorizedRate === 100,
    }),

    // ── DISCIPLINA ──────────────────────────────────────────────────────────
    make({
      id: 'streak_7',
      title: '7 días seguidos',
      description: 'Registraste movimientos 7 días consecutivos',
      icon: 'Flame',
      category: 'disciplina',
      progress: Math.min((streak.current / 7) * 100, 100),
      progressLabel: `${Math.min(streak.current, 7)}/7 días`,
      _unlocked: streak.best >= 7,
    }),
    make({
      id: 'streak_30',
      title: '30 días de hábito',
      description: 'Un mes completo registrando tus finanzas sin interrupciones',
      icon: 'CalendarCheck',
      category: 'disciplina',
      progress: Math.min((streak.current / 30) * 100, 100),
      progressLabel: `${Math.min(streak.current, 30)}/30 días`,
      _unlocked: streak.best >= 30,
    }),
    make({
      id: 'streak_90',
      title: '3 meses de constancia',
      description: '90 días registrando. Esto ya es un hábito financiero sólido.',
      icon: 'Award',
      category: 'disciplina',
      progress: Math.min((streak.current / 90) * 100, 100),
      progressLabel: `${Math.min(streak.current, 90)}/90 días`,
      _unlocked: streak.best >= 90,
      _hidden: streak.best < 30,
    }),
    make({
      id: 'budgets_met',
      title: 'Presupuesto cumplido',
      description: 'Tenés presupuestos activos y los estás siguiendo',
      icon: 'ShieldCheck',
      category: 'disciplina',
      _unlocked: hasBudgets,
    }),

    // ── CONSTANCIA ──────────────────────────────────────────────────────────
    make({
      id: 'ten_tx',
      title: '10 registros',
      description: 'Llevás un seguimiento activo de tus finanzas',
      icon: 'Edit3',
      category: 'constancia',
      progress: Math.min((txCount / 10) * 100, 100),
      progressLabel: `${Math.min(txCount, 10)}/10`,
      _unlocked: txCount >= 10,
    }),
    make({
      id: 'fifty_tx',
      title: '50 registros',
      description: 'Tu historial financiero empieza a tener peso real',
      icon: 'FileText',
      category: 'constancia',
      progress: Math.min((txCount / 50) * 100, 100),
      progressLabel: `${Math.min(txCount, 50)}/50`,
      _unlocked: txCount >= 50,
    }),
    make({
      id: 'import_csv',
      title: 'Importación bancaria',
      description: 'Usaste la importación de resúmenes CSV para cargar datos',
      icon: 'Upload',
      category: 'constancia',
      _unlocked: importUsed,
    }),

    // ── INVERSIÓN ───────────────────────────────────────────────────────────
    make({
      id: 'first_goal',
      title: 'Primer objetivo',
      description: 'Creaste tu primer objetivo financiero en Equal',
      icon: 'Target',
      category: 'inversión',
      progress: Math.min(goals.length * 100, 100),
      progressLabel: `${Math.min(goals.length, 1)}/1 objetivo`,
      _unlocked: goals.length >= 1,
    }),
    make({
      id: 'goal_complete',
      title: 'Objetivo completado',
      description: 'Lograste cumplir uno de tus objetivos financieros',
      icon: 'CheckCircle2',
      category: 'inversión',
      progress: Math.min(completedGoals * 100, 100),
      progressLabel: `${completedGoals} completado${completedGoals !== 1 ? 's' : ''}`,
      _unlocked: completedGoals >= 1,
    }),
    make({
      id: 'three_goals',
      title: '3 objetivos logrados',
      description: 'Completaste 3 objetivos financieros. Disciplina comprobada.',
      icon: 'Trophy',
      category: 'inversión',
      progress: Math.min((completedGoals / 3) * 100, 100),
      progressLabel: `${Math.min(completedGoals, 3)}/3`,
      _unlocked: completedGoals >= 3,
      _hidden: completedGoals < 1,
    }),
    make({
      id: 'first_fixed_term',
      title: 'Primer plazo fijo',
      description: 'Registraste tu primera inversión a plazo fijo',
      icon: 'PiggyBank',
      category: 'inversión',
      _unlocked: fixedTermsCount >= 1,
    }),

    // ── OBJETIVOS ───────────────────────────────────────────────────────────
    make({
      id: 'goals_5',
      title: '5 objetivos creados',
      description: 'Tenés una planificación financiera ambiciosa y estructurada',
      icon: 'ListChecks',
      category: 'objetivos',
      progress: Math.min((goals.length / 5) * 100, 100),
      progressLabel: `${Math.min(goals.length, 5)}/5`,
      _unlocked: goals.length >= 5,
    }),
    make({
      id: 'diversified',
      title: 'Multi-moneda',
      description: 'Operás en 3 o más monedas distintas',
      icon: 'Globe',
      category: 'objetivos',
      progress: Math.min((uniqueCurrencies / 3) * 100, 100),
      progressLabel: `${Math.min(uniqueCurrencies, 3)}/3 monedas`,
      _unlocked: uniqueCurrencies >= 3,
    }),
    make({
      id: 'budget_created',
      title: 'Primer presupuesto',
      description: 'Estableciste límites de gasto por categoría',
      icon: 'DollarSign',
      category: 'objetivos',
      _unlocked: hasBudgets,
    }),
  ]
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
