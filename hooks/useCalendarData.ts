'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  format, parseISO, startOfMonth, endOfMonth,
  addDays, addWeeks, addMonths, addYears,
} from 'date-fns'
import { useTransactions } from '@/hooks/useTransactions'
import { useFixedTerms } from '@/hooks/useFixedTerms'
import { useGoals } from '@/hooks/useGoals'
import { recurringService } from '@/services/recurring.service'
import { refundService } from '@/services/refund.service'
import { safeNumber } from '@/utils/format'
import type { RecurringTransactionWithDetails, Refund } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CalendarEventType = 'transaction' | 'recurring' | 'fixed_term' | 'goal_deadline' | 'refund'
export type CalendarFilter = 'all' | 'income' | 'expense' | 'recurring' | 'fixed_term' | 'goal' | 'refund'

export interface CalendarEvent {
  id: string
  type: CalendarEventType
  subtype?: 'income' | 'expense'
  label: string
  amount: number
  currency: string
  color: string
  category_name?: string
  category_color?: string
  cadence?: string
  status?: string
  progress?: number
}

export interface DayData {
  date: string
  transactions: CalendarEvent[]
  recurring: CalendarEvent[]
  fixedTerms: CalendarEvent[]
  goals: CalendarEvent[]
  refunds: CalendarEvent[]
  totalIncome: number
  totalExpense: number
  netBalance: number
  eventCount: number
  hasEvents: boolean
}

export interface MonthStats {
  totalIncome: number
  totalExpense: number
  netBalance: number
  totalEvents: number
  upcomingMaturities: number
}

export interface UseCalendarDataReturn {
  dayMap: Map<string, DayData>
  monthStats: MonthStats
  loading: boolean
  avgDailyExpense: number
  maxDailyExpense: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_COLORS = {
  recurring:     '#6d3bd7',
  fixed_term:    '#F59E0B',
  goal_deadline: '#0566d9',
  income:        '#16a34a',
  expense:       '#e11d48',
  refund:        '#10b981',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nextOccurrence(d: Date, cadence: string): Date {
  switch (cadence) {
    case 'daily':     return addDays(d, 1)
    case 'weekly':    return addWeeks(d, 1)
    case 'biweekly':  return addWeeks(d, 2)
    case 'monthly':   return addMonths(d, 1)
    case 'quarterly': return addMonths(d, 3)
    case 'yearly':    return addYears(d, 1)
    default:          return addDays(d, 30)
  }
}

function prevOccurrence(d: Date, cadence: string): Date {
  switch (cadence) {
    case 'daily':     return addDays(d, -1)
    case 'weekly':    return addWeeks(d, -1)
    case 'biweekly':  return addWeeks(d, -2)
    case 'monthly':   return addMonths(d, -1)
    case 'quarterly': return addMonths(d, -3)
    case 'yearly':    return addYears(d, -1)
    default:          return addDays(d, -30)
  }
}

function projectIntoMonth(
  item: RecurringTransactionWithDetails,
  monthStart: Date,
  monthEnd: Date,
): string[] {
  if (!item.active) return []
  try {
    const anchor = parseISO(item.next_date)
    if (isNaN(anchor.getTime())) return []

    // Walk backward from anchor until we're before monthStart
    let d = anchor
    while (d >= monthStart) {
      d = prevOccurrence(d, item.cadence)
    }
    // Walk forward collecting all occurrences within [monthStart, monthEnd]
    const results: string[] = []
    d = nextOccurrence(d, item.cadence)
    while (d <= monthEnd) {
      if (d >= monthStart) results.push(format(d, 'yyyy-MM-dd'))
      d = nextOccurrence(d, item.cadence)
    }
    return results
  } catch {
    return []
  }
}

function emptyDay(date: string): DayData {
  return {
    date,
    transactions: [],
    recurring: [],
    fixedTerms: [],
    goals: [],
    refunds: [],
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    eventCount: 0,
    hasEvents: false,
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCalendarData(
  month: Date,
  filter: CalendarFilter,
): UseCalendarDataReturn {
  const monthStart = startOfMonth(month)
  const monthEnd   = endOfMonth(month)
  const from       = format(monthStart, 'yyyy-MM-dd')
  const to         = format(monthEnd,   'yyyy-MM-dd')
  const monthKey   = format(month, 'yyyy-MM')

  const { data: transactions, loading: txLoading }      = useTransactions({ from, to })
  const { items: fixedTerms,  loading: ftLoading  }     = useFixedTerms()
  const { data: goals,        loading: goalsLoading }   = useGoals()

  const [recurring, setRecurring] = useState<RecurringTransactionWithDetails[]>([])
  const [recurringLoading, setRecurringLoading] = useState(true)
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [refundsLoading, setRefundsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setRecurringLoading(true)
    recurringService.list()
      .then(data => { if (!cancelled) setRecurring(data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setRecurringLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    setRefundsLoading(true)
    refundService.list()
      .then(data => { if (!cancelled) setRefunds(data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setRefundsLoading(false) })
    return () => { cancelled = true }
  }, [])

  const loading = txLoading || ftLoading || goalsLoading || recurringLoading || refundsLoading

  // ── Day map construction ──────────────────────────────────────────────────

  const dayMap = useMemo(() => {
    const map = new Map<string, DayData>()

    const getOrCreate = (key: string): DayData => {
      if (!map.has(key)) map.set(key, emptyDay(key))
      return map.get(key)!
    }

    // Always process all transactions for aggregates (heatmap/stats unaffected by filter)
    for (const tx of transactions) {
      const key  = tx.date.substring(0, 10)
      const day  = getOrCreate(key)
      const amt  = safeNumber(tx.amount)

      if (tx.type === 'income') day.totalIncome += amt
      else                      day.totalExpense += amt
      day.netBalance = day.totalIncome - day.totalExpense

      // Add to events array only when filter matches
      if (filter === 'all' || filter === tx.type) {
        day.transactions.push({
          id:             tx.id ?? `${key}-${Math.random()}`,
          type:           'transaction',
          subtype:        tx.type,
          label:          tx.description,
          amount:         amt,
          currency:       tx.currency,
          color:          tx.type === 'income' ? EVENT_COLORS.income : EVENT_COLORS.expense,
          category_name:  tx.category_name,
          category_color: tx.category_color,
        })
      }
    }

    // Fixed terms — maturity within this month, only active
    if (filter === 'all' || filter === 'fixed_term') {
      for (const ft of fixedTerms) {
        if (ft.status !== 'active' || !ft.maturity_date) continue
        const key = ft.maturity_date.substring(0, 10)
        if (key < from || key > to) continue

        const day = getOrCreate(key)
        day.fixedTerms.push({
          id:       ft.id,
          type:     'fixed_term',
          label:    ft.name,
          amount:   safeNumber(ft.estimated_total),
          currency: ft.currency,
          color:    EVENT_COLORS.fixed_term,
          status:   ft.status,
        })
      }
    }

    // Goals — target date within this month, not completed
    if (filter === 'all' || filter === 'goal') {
      for (const goal of goals) {
        if (goal.is_completed || !goal.target_date) continue
        const key = goal.target_date.substring(0, 10)
        if (key < from || key > to) continue

        const targetAmt  = safeNumber(goal.target_amount)
        const currentAmt = safeNumber(goal.current_amount)
        const pct        = targetAmt > 0
          ? Math.min(100, Math.max(0, Math.round((currentAmt / targetAmt) * 100)))
          : 0

        const day = getOrCreate(key)
        day.goals.push({
          id:       goal.id ?? key,
          type:     'goal_deadline',
          label:    goal.name,
          amount:   targetAmt,
          currency: goal.currency ?? 'ARS',
          color:    EVENT_COLORS.goal_deadline,
          progress: pct,
        })
      }
    }

    // Recurring — project into this month using cadence
    if (filter === 'all' || filter === 'recurring') {
      for (const rec of recurring) {
        const dates = projectIntoMonth(rec, monthStart, monthEnd)
        for (const key of dates) {
          const day = getOrCreate(key)
          day.recurring.push({
            id:            `rec-${rec.id}-${key}`,
            type:          'recurring',
            subtype:       rec.type as 'income' | 'expense',
            label:         rec.description,
            amount:        safeNumber(rec.amount),
            currency:      rec.currency ?? 'ARS',
            color:         rec.type === 'income' ? EVENT_COLORS.income : EVENT_COLORS.expense,
            category_name: rec.category_name,
            cadence:       rec.cadence,
          })
        }
      }
    }

    // Refunds — solo pending, por su expected_date
    if (filter === 'all' || filter === 'refund') {
      for (const refund of refunds) {
        if (refund.status !== 'pending' || !refund.expected_date) continue
        const key = refund.expected_date.substring(0, 10)
        if (key < from || key > to) continue

        const day = getOrCreate(key)
        day.refunds.push({
          id:       refund.id,
          type:     'refund',
          subtype:  'income',
          label:    refund.note ? `Reintegro: ${refund.note}` : 'Reintegro esperado',
          amount:   safeNumber(refund.amount),
          currency: refund.currency,
          color:    EVENT_COLORS.refund,
          status:   refund.status,
        })
      }
    }

    // Finalize event counts
    for (const [, day] of map) {
      day.eventCount = day.transactions.length + day.recurring.length + day.fixedTerms.length + day.goals.length + day.refunds.length
      day.hasEvents  = day.totalIncome > 0 || day.totalExpense > 0
        || day.recurring.length > 0 || day.fixedTerms.length > 0 || day.goals.length > 0 || day.refunds.length > 0
    }

    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, fixedTerms, goals, recurring, refunds, monthKey, filter])

  // ── Month-level stats ─────────────────────────────────────────────────────

  const monthStats = useMemo((): MonthStats => {
    let totalIncome  = 0
    let totalExpense = 0
    let totalEvents  = 0

    for (const [, day] of dayMap) {
      totalIncome  += day.totalIncome
      totalExpense += day.totalExpense
      totalEvents  += day.eventCount
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd')
    let upcomingMaturities = 0
    for (const [key, day] of dayMap) {
      if (key >= todayStr) upcomingMaturities += day.fixedTerms.length
    }

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      totalEvents,
      upcomingMaturities,
    }
  }, [dayMap])

  // ── Heatmap normalization ─────────────────────────────────────────────────

  const { avgDailyExpense, maxDailyExpense } = useMemo(() => {
    let sum = 0, count = 0, max = 0
    for (const [, day] of dayMap) {
      if (day.totalExpense > 0) {
        sum += day.totalExpense
        count++
        if (day.totalExpense > max) max = day.totalExpense
      }
    }
    return { avgDailyExpense: count > 0 ? sum / count : 0, maxDailyExpense: max }
  }, [dayMap])

  return { dayMap, monthStats, loading, avgDailyExpense, maxDailyExpense }
}
