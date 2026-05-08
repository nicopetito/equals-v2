import { format, parseISO, startOfMonth, endOfMonth, subDays, startOfYear, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "d 'de' MMM", { locale: es })
}

export function formatDateFull(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "d 'de' MMMM, yyyy", { locale: es })
}

export function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${months[date.getMonth()]} ${year}`
}

export type Period = '7_days' | '30_days' | '90_days' | 'this_month' | 'last_month' | 'this_year'

export function getDateRangeForPeriod(period: Period): { start: Date; end: Date } {
  const today = new Date()
  const end = new Date(today)
  let start = new Date(today)

  switch (period) {
    case '7_days':
      start = subDays(today, 7)
      break
    case '30_days':
      start = subDays(today, 30)
      break
    case '90_days':
      start = subDays(today, 90)
      break
    case 'this_month':
      start = startOfMonth(today)
      break
    case 'last_month': {
      const lastMonth = subMonths(today, 1)
      start = startOfMonth(lastMonth)
      return { start, end: endOfMonth(lastMonth) }
    }
    case 'this_year':
      start = startOfYear(today)
      break
  }

  return { start, end }
}

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7_days', label: 'Últimos 7 días' },
  { value: '30_days', label: 'Últimos 30 días' },
  { value: '90_days', label: 'Últimos 90 días' },
  { value: 'this_month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes pasado' },
  { value: 'this_year', label: 'Este año' },
]
