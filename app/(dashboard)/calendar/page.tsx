'use client'

import { useState, useRef, useMemo } from 'react'
import {
  ChevronLeft, ChevronRight, CalendarDays,
  TrendingUp, TrendingDown, Repeat, PiggyBank,
  Target, Activity, X, Plus, NotebookPen, RotateCcw,
} from 'lucide-react'
import {
  format, addMonths, subMonths, addDays,
  startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, isToday, parseISO, differenceInDays,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { PageHeader } from '@/components/ui/PageHeader'
import { HelpButton } from '@/components/help/HelpButton'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { formatCurrency, safeNumber } from '@/utils/format'
import { formatDate } from '@/utils/date'
import { useCalendarData } from '@/hooks/useCalendarData'
import { useCalendarTasks } from '@/hooks/useCalendarTasks'
import type { CalendarFilter, CalendarEvent, DayData, MonthStats } from '@/hooks/useCalendarData'
import type { CalendarTask } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const FILTER_OPTIONS: { value: CalendarFilter; label: string }[] = [
  { value: 'all',        label: 'Todos' },
  { value: 'income',     label: 'Ingresos' },
  { value: 'expense',    label: 'Gastos' },
  { value: 'recurring',  label: 'Programadas' },
  { value: 'fixed_term', label: 'Plazo Fijo' },
  { value: 'goal',       label: 'Objetivos' },
  { value: 'refund',     label: 'Reintegros' },
]

const CADENCE_LABELS: Record<string, string> = {
  daily: 'Diario', weekly: 'Semanal', biweekly: 'Quincenal',
  monthly: 'Mensual', quarterly: 'Trimestral', yearly: 'Anual',
}

// Task dot color — slate, neutral, distinct from financial colors
const TASK_COLOR = '#94A3B8'

// 0=Sun…6=Sat → índice Lun-based
function weekdayIndex(d: Date): number {
  const raw = getDay(d)
  return raw === 0 ? 6 : raw - 1
}

// ─── Heatmap helpers ──────────────────────────────────────────────────────────

function computeCellBg(
  dayData: DayData | undefined,
  avg: number,
  isSelected: boolean,
  isTodayCell: boolean,
): string {
  if (isSelected) return 'var(--brand-50)'
  if (!dayData?.hasEvents) return isTodayCell ? 'var(--bg-subtle)' : 'transparent'

  const expense = dayData.totalExpense
  const income  = dayData.totalIncome

  if (income > 0 && expense === 0) return 'rgba(22,163,74,0.06)'
  if (avg === 0) return 'rgba(225,29,72,0.04)'
  const ratio = expense / avg
  if (ratio < 0.7)  return 'rgba(22,163,74,0.07)'
  if (ratio < 1.2)  return 'rgba(245,158,11,0.07)'
  return 'rgba(225,29,72,0.08)'
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MonthStatsRow({ stats, loading }: { stats: MonthStats; loading: boolean }) {
  const chips = [
    { label: 'Ingresos',           value: formatCurrency(stats.totalIncome, 'ARS'),                                          color: '#16a34a', Icon: TrendingUp   },
    { label: 'Gastos',             value: formatCurrency(stats.totalExpense, 'ARS'),                                         color: '#e11d48', Icon: TrendingDown },
    { label: 'Balance neto',       value: (stats.netBalance >= 0 ? '+' : '−') + formatCurrency(Math.abs(stats.netBalance), 'ARS'), color: stats.netBalance >= 0 ? '#16a34a' : '#e11d48', Icon: Activity },
    { label: 'Eventos',            value: String(stats.totalEvents),                                                         color: '#6d3bd7', Icon: CalendarDays },
    { label: 'Próx. vencimientos', value: String(stats.upcomingMaturities),                                                  color: '#F59E0B', Icon: PiggyBank    },
  ]

  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {chips.map((_, i) => (
          <div key={i} className="shrink-0 rounded-xl animate-pulse"
            style={{ width: 120, height: 56, background: 'var(--bg-card)', border: '1px solid var(--border)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {chips.map(chip => (
        <div key={chip.label} className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <chip.Icon size={14} style={{ color: chip.color, flexShrink: 0 }} />
          <div>
            <p className="text-xs font-bold tabular-nums leading-none" style={{ color: chip.color }}>
              {chip.value}
            </p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {chip.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function FilterBar({ filter, setFilter }: { filter: CalendarFilter; setFilter: (f: CalendarFilter) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {FILTER_OPTIONS.map(opt => (
        <button key={opt.value} onClick={() => setFilter(opt.value)}
          className="px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all"
          style={filter === opt.value
            ? { background: 'var(--brand-500)', color: 'white' }
            : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function MonthNavigator({
  monthLabel, onPrev, onNext, stats,
}: {
  month: Date; monthLabel: string; onPrev: () => void; onNext: () => void; stats: MonthStats
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3"
      style={{ borderBottom: '1px solid var(--border-light)' }}>
      <button onClick={onPrev}
        className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
        <ChevronLeft size={16} />
      </button>

      <div className="text-center">
        <p className="font-extrabold text-sm" style={{ color: 'var(--text-primary)' }}>{monthLabel}</p>
        <div className="flex items-center justify-center gap-3 mt-0.5">
          <span className="text-[11px] font-semibold" style={{ color: '#16a34a' }}>
            +{formatCurrency(stats.totalIncome, 'ARS')}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>·</span>
          <span className="text-[11px] font-semibold" style={{ color: '#e11d48' }}>
            −{formatCurrency(stats.totalExpense, 'ARS')}
          </span>
        </div>
      </div>

      <button onClick={onNext}
        className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

function EventDots({
  dayData, filter, taskCount,
}: {
  dayData: DayData | undefined; filter: CalendarFilter; taskCount: number
}) {
  const dots: { color: string; key: string }[] = []
  const tx = dayData?.transactions ?? []

  if (filter === 'all' || filter === 'income' || filter === 'expense') {
    if (tx.some(e => e.subtype === 'income'))  dots.push({ color: '#16a34a', key: 'in' })
    if (tx.some(e => e.subtype === 'expense')) dots.push({ color: '#e11d48', key: 'ex' })
  }
  if ((dayData?.recurring.length  ?? 0) > 0) dots.push({ color: '#6d3bd7', key: 'rec' })
  if ((dayData?.fixedTerms.length ?? 0) > 0) dots.push({ color: '#F59E0B', key: 'ft'  })
  if ((dayData?.goals.length      ?? 0) > 0) dots.push({ color: '#0566d9', key: 'gl'  })
  if ((dayData?.refunds.length    ?? 0) > 0) dots.push({ color: '#10b981', key: 'rf'  })
  if (taskCount > 0)                          dots.push({ color: TASK_COLOR, key: 'tk' })

  const visible = dots.slice(0, 4)
  if (visible.length === 0) return null

  return (
    <div className="flex items-center gap-[3px] mt-1">
      {visible.map(dot => (
        <span key={dot.key}
          style={{ width: 4, height: 4, borderRadius: '50%', background: dot.color, flexShrink: 0 }} />
      ))}
    </div>
  )
}

function DayCell({
  day, dayData, isSelected, isTodayCell, avg, filter, taskCount, onClick,
}: {
  day: Date; dayData: DayData | undefined; isSelected: boolean; isTodayCell: boolean
  avg: number; filter: CalendarFilter; taskCount: number; onClick: () => void
}) {
  const bg = computeCellBg(dayData, avg, isSelected, isTodayCell)

  const showAmount = (filter === 'all' || filter === 'expense') && (dayData?.totalExpense ?? 0) > 0
  const showIncome = filter === 'income' && (dayData?.totalIncome ?? 0) > 0
  const showCount  = (filter === 'recurring' || filter === 'fixed_term' || filter === 'goal')
    && (dayData?.eventCount ?? 0) > 0
  const amountVal  = filter === 'income' ? (dayData?.totalIncome ?? 0) : (dayData?.totalExpense ?? 0)

  return (
    <div onClick={onClick}
      className="min-h-[52px] md:min-h-[68px] p-1.5 cursor-pointer transition-colors flex flex-col"
      style={{ borderBottom: '1px solid var(--border-light)', borderRight: '1px solid var(--border-light)', background: bg }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = bg }}>

      <div className="flex items-start justify-between">
        <span
          className="text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0"
          style={isTodayCell
            ? { background: 'var(--grad-brand)', color: 'white', fontSize: '10px' }
            : isSelected
              ? { color: 'var(--brand-600)', fontWeight: 800 }
              : { color: 'var(--text-muted)' }}>
          {format(day, 'd')}
        </span>
      </div>

      {(showAmount || showIncome) && (
        <span className="text-[9px] font-bold tabular-nums leading-tight hidden md:block mt-0.5"
          style={{ color: filter === 'income' ? '#16a34a' : '#e11d48' }}>
          {new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(amountVal)}
        </span>
      )}
      {showCount && (
        <span className="text-[9px] font-semibold hidden md:block mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {dayData!.eventCount} ev.
        </span>
      )}

      <EventDots dayData={dayData} filter={filter} taskCount={taskCount} />
    </div>
  )
}

function CalendarGrid({
  days, startPad, dayMap, tasksByDate, selected, setSelected, avgDailyExpense, filter,
}: {
  days: Date[]; startPad: number; dayMap: Map<string, DayData>
  tasksByDate: Map<string, CalendarTask[]>; selected: Date | null
  setSelected: (d: Date | null) => void; avgDailyExpense: number; filter: CalendarFilter
}) {
  return (
    <>
      <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--border-light)' }}>
        {WEEKDAYS.map(w => (
          <div key={w} className="py-2 text-center text-[11px] font-extrabold" style={{ color: 'var(--text-faint)' }}>
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className="min-h-[52px] md:min-h-[68px]"
            style={{ borderBottom: '1px solid var(--border-light)', borderRight: '1px solid var(--border-light)' }} />
        ))}

        {days.map(day => {
          const key       = format(day, 'yyyy-MM-dd')
          const dayData   = dayMap.get(key)
          const taskCount = tasksByDate.get(key)?.length ?? 0
          const isSel     = selected ? isSameDay(day, selected) : false
          const isTodayC  = isToday(day)

          return (
            <DayCell
              key={key}
              day={day}
              dayData={dayData}
              isSelected={isSel}
              isTodayCell={isTodayC}
              avg={avgDailyExpense}
              filter={filter}
              taskCount={taskCount}
              onClick={() => setSelected(isSel ? null : day)}
            />
          )
        })}
      </div>
    </>
  )
}

function SectionHeader({ icon: Icon, label, color, count }: {
  icon: React.ElementType; label: string; color: string; count?: number
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2"
      style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--bg-subtle)' }}>
      <div className="flex items-center gap-2">
        <Icon size={13} style={{ color }} />
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
      </div>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}>
          {count}
        </span>
      )}
    </div>
  )
}

function EventRow({ event }: { event: CalendarEvent }) {
  const isIncome = event.subtype === 'income'

  const iconBg = event.type === 'fixed_term' ? '#FFFBEB'
    : event.type === 'goal_deadline' ? 'var(--goal-50)'
    : event.type === 'recurring'     ? 'var(--brand-50)'
    : isIncome ? 'var(--income-50)' : 'var(--expense-50)'

  const Icon = event.type === 'fixed_term'    ? PiggyBank
    : event.type === 'goal_deadline' ? Target
    : event.type === 'recurring'     ? Repeat
    : isIncome ? TrendingUp : TrendingDown

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: iconBg }}>
        <Icon size={13} style={{ color: event.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {event.label}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {event.category_name && <CategoryBadge name={event.category_name} color={event.category_color} />}
          {event.cadence && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--brand-50)', color: 'var(--brand-600)' }}>
              {CADENCE_LABELS[event.cadence] ?? event.cadence}
            </span>
          )}
          {event.progress !== undefined && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--goal-50)', color: 'var(--goal-600)' }}>
              {event.progress}%
            </span>
          )}
          {event.type === 'fixed_term' && event.status === 'active' && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: '#FFFBEB', color: '#F59E0B' }}>
              Vence hoy
            </span>
          )}
        </div>
      </div>
      <p className="text-xs font-bold tabular-nums shrink-0" style={{ color: event.color }}>
        {event.type === 'transaction' || event.type === 'recurring'
          ? `${isIncome ? '+' : '−'}${formatCurrency(safeNumber(event.amount), event.currency)}`
          : formatCurrency(safeNumber(event.amount), event.currency)}
      </p>
    </div>
  )
}

function TaskItem({
  task, onToggle, onDelete,
}: {
  task: CalendarTask; onToggle: (id: string, done: boolean) => void; onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 group">
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id, !task.done)}
        className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all border"
        style={task.done
          ? { background: TASK_COLOR, borderColor: TASK_COLOR }
          : { background: 'transparent', borderColor: 'var(--border)' }}
        title={task.done ? 'Marcar como pendiente' : 'Marcar como hecho'}
      >
        {task.done && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Text */}
      <p className="flex-1 text-xs min-w-0"
        style={{
          color: task.done ? 'var(--text-faint)' : 'var(--text-primary)',
          textDecoration: task.done ? 'line-through' : 'none',
          fontWeight: task.done ? 400 : 500,
        }}>
        {task.text}
      </p>

      {/* Delete */}
      <button
        onClick={() => onDelete(task.id)}
        className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        style={{ color: 'var(--text-faint)' }}
        title="Eliminar"
      >
        <X size={11} />
      </button>
    </div>
  )
}

function TaskInput({
  onAdd,
}: {
  onAdd: (text: string) => void
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && value.trim()) {
      onAdd(value.trim())
      setValue('')
    }
    if (e.key === 'Escape') {
      setValue('')
      inputRef.current?.blur()
    }
  }

  function handleAdd() {
    if (value.trim()) {
      onAdd(value.trim())
      setValue('')
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5"
      style={{ borderTop: '1px solid var(--border-light)' }}>
      <NotebookPen size={13} style={{ color: TASK_COLOR, flexShrink: 0 }} />
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Agregar recordatorio..."
        className="flex-1 text-xs bg-transparent outline-none"
        style={{ color: 'var(--text-primary)', caretColor: 'var(--brand-500)' }}
      />
      {value.trim() && (
        <button
          onClick={handleAdd}
          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors"
          style={{ background: 'var(--brand-500)', color: 'white' }}
        >
          <Plus size={11} />
        </button>
      )}
    </div>
  )
}

function DayPanel({
  selected, dayData, tasks, filter, onClose, onAddTask, onToggleTask, onDeleteTask,
}: {
  selected: Date | null; dayData: DayData | null; tasks: CalendarTask[]
  filter: CalendarFilter; onClose: () => void
  onAddTask: (date: string, text: string) => void
  onToggleTask: (id: string, done: boolean) => void
  onDeleteTask: (id: string) => void
}) {
  if (!selected) {
    return (
      <div className="rounded-2xl flex flex-col items-center justify-center py-10 px-4 text-center gap-2"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <CalendarDays size={30} style={{ color: 'var(--text-faint)' }} />
        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Seleccioná un día</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Hacé clic en cualquier día del calendario para ver sus movimientos
        </p>
      </div>
    )
  }

  const dateLabel = format(selected, "EEEE d 'de' MMMM", { locale: es })
    .replace(/^\w/, c => c.toUpperCase())
  const selectedKey = format(selected, 'yyyy-MM-dd')

  const income  = dayData?.totalIncome  ?? 0
  const expense = dayData?.totalExpense ?? 0

  const hasTx       = (dayData?.transactions.length ?? 0) > 0
  const hasRec      = (dayData?.recurring.length     ?? 0) > 0
  const hasFT       = (dayData?.fixedTerms.length    ?? 0) > 0
  const hasGoals    = (dayData?.goals.length         ?? 0) > 0
  const hasRefunds  = (dayData?.refunds.length       ?? 0) > 0
  const hasTasks    = tasks.length > 0
  const hasFinancial = hasTx || hasRec || hasFT || hasGoals || hasRefunds

  return (
    <div className="rounded-2xl overflow-hidden lg:sticky lg:top-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>

      {/* Header */}
      <div className="px-4 py-3 flex items-start justify-between gap-2"
        style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--bg-subtle)' }}>
        <div>
          <p className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>{dateLabel}</p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {income > 0 && (
              <span className="text-xs font-bold" style={{ color: '#16a34a' }}>
                +{formatCurrency(income, 'ARS')}
              </span>
            )}
            {expense > 0 && (
              <span className="text-xs font-bold" style={{ color: '#e11d48' }}>
                −{formatCurrency(expense, 'ARS')}
              </span>
            )}
            {income === 0 && expense === 0 && !hasFinancial && !hasTasks && (
              <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Día sin movimientos</span>
            )}
          </div>
        </div>
        <button onClick={onClose}
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors mt-0.5"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--border-light)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
          <X size={13} />
        </button>
      </div>

      {/* Scrollable sections */}
      <div style={{ maxHeight: 440, overflowY: 'auto' }}>

        {/* Financial events */}
        {hasTx && (
          <div style={{ borderBottom: '1px solid var(--border-light)' }}>
            <SectionHeader icon={Activity} label="Transacciones" color="var(--text-muted)" count={dayData!.transactions.length} />
            {dayData!.transactions.map(ev => <EventRow key={ev.id} event={ev} />)}
          </div>
        )}

        {hasRec && (
          <div style={{ borderBottom: '1px solid var(--border-light)' }}>
            <SectionHeader icon={Repeat} label="Programadas" color="#6d3bd7" count={dayData!.recurring.length} />
            {dayData!.recurring.map(ev => <EventRow key={ev.id} event={ev} />)}
          </div>
        )}

        {hasFT && (
          <div style={{ borderBottom: '1px solid var(--border-light)' }}>
            <SectionHeader icon={PiggyBank} label="Plazos Fijos" color="#F59E0B" count={dayData!.fixedTerms.length} />
            {dayData!.fixedTerms.map(ev => <EventRow key={ev.id} event={ev} />)}
          </div>
        )}

        {hasGoals && (
          <div style={{ borderBottom: '1px solid var(--border-light)' }}>
            <SectionHeader icon={Target} label="Objetivos" color="var(--goal-500)" count={dayData!.goals.length} />
            {dayData!.goals.map(ev => <EventRow key={ev.id} event={ev} />)}
          </div>
        )}

        {hasRefunds && (
          <div style={{ borderBottom: '1px solid var(--border-light)' }}>
            <SectionHeader icon={RotateCcw} label="Reintegros esperados" color="#10b981" count={dayData!.refunds.length} />
            {dayData!.refunds.map(ev => <EventRow key={ev.id} event={ev} />)}
          </div>
        )}

        {/* No financial events message (when a day has only tasks or nothing financial) */}
        {!hasFinancial && (
          <div className="py-5 text-center px-4">
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Sin movimientos financieros este día</p>
          </div>
        )}

        {/* Tasks / Reminders */}
        <div>
          <SectionHeader icon={NotebookPen} label="Recordatorios" color={TASK_COLOR} count={tasks.length} />
          {hasTasks
            ? tasks.map(task => (
                <TaskItem key={task.id} task={task} onToggle={onToggleTask} onDelete={onDeleteTask} />
              ))
            : (
              <div className="py-3 px-4">
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                  No hay recordatorios para este día
                </p>
              </div>
            )
          }
          <TaskInput onAdd={(text) => onAddTask(selectedKey, text)} />
        </div>
      </div>
    </div>
  )
}

interface Insight {
  id: string; text: string; color: string; Icon: React.ElementType; priority: number
}

function InsightsRow({ dayMap, monthStats, loading }: {
  dayMap: Map<string, DayData>; monthStats: MonthStats; loading: boolean
}) {
  const insights = useMemo((): Insight[] => {
    if (loading || dayMap.size === 0) return []

    const today         = new Date()
    const todayStr      = format(today, 'yyyy-MM-dd')
    const sevenDaysStr  = format(addDays(today, 7),  'yyyy-MM-dd')
    const threeDaysStr  = format(addDays(today, 3),  'yyyy-MM-dd')
    const thirtyDaysStr = format(addDays(today, 30), 'yyyy-MM-dd')
    const candidates: Insight[] = []

    // 1. Upcoming fixed term maturity (within 7 days)
    for (const [key, day] of dayMap) {
      if (key >= todayStr && key <= sevenDaysStr && day.fixedTerms.length > 0) {
        const ft = day.fixedTerms[0]
        const d  = differenceInDays(parseISO(key), today)
        const t  = d === 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d} días`
        candidates.push({ id: `ft-${ft.id}`, text: `"${ft.label}" vence ${t} — ${formatCurrency(ft.amount, ft.currency)}`, color: '#F59E0B', Icon: PiggyBank, priority: 1 })
        break
      }
    }

    // 2. Upcoming recurring due in 3 days
    for (const [key, day] of dayMap) {
      if (key >= todayStr && key <= threeDaysStr && day.recurring.length > 0) {
        const rec = day.recurring[0]
        const d   = differenceInDays(parseISO(key), today)
        const t   = d === 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d} días`
        candidates.push({ id: `rec-${rec.id}`, text: `"${rec.label}" vence ${t} (${formatCurrency(rec.amount, rec.currency)})`, color: '#6d3bd7', Icon: Repeat, priority: 2 })
        break
      }
    }

    // 3. Goal approaching deadline (within 30 days)
    for (const [key, day] of dayMap) {
      if (key >= todayStr && key <= thirtyDaysStr && day.goals.length > 0) {
        const g = day.goals[0]
        candidates.push({ id: `goal-${g.id}`, text: `Meta "${g.label}" vence el ${formatDate(key)} — ${g.progress ?? 0}% completada`, color: '#0566d9', Icon: Target, priority: 3 })
        break
      }
    }

    // 4. Best income day
    let bestIncome: [string, DayData] | null = null
    for (const [key, day] of dayMap) {
      if (day.totalIncome > 0 && (!bestIncome || day.totalIncome > bestIncome[1].totalIncome)) bestIncome = [key, day]
    }
    if (bestIncome) {
      const [key, day] = bestIncome
      candidates.push({ id: 'best-income', text: `El día ${parseInt(key.slice(8))} fue tu mejor día del mes con ${formatCurrency(day.totalIncome, 'ARS')} en ingresos`, color: '#16a34a', Icon: TrendingUp, priority: 4 })
    }

    // 5. Highest expense day
    let worstExpense: [string, DayData] | null = null
    for (const [key, day] of dayMap) {
      if (day.totalExpense > 0 && (!worstExpense || day.totalExpense > worstExpense[1].totalExpense)) worstExpense = [key, day]
    }
    if (worstExpense) {
      const [key, day] = worstExpense
      candidates.push({ id: 'worst-expense', text: `El día ${parseInt(key.slice(8))} fue tu día con más gastos: ${formatCurrency(day.totalExpense, 'ARS')}`, color: '#e11d48', Icon: TrendingDown, priority: 5 })
    }

    // 6. Positive net balance
    if (monthStats.netBalance > 0) {
      candidates.push({ id: 'positive-balance', text: `Este mes cerrás con balance positivo de ${formatCurrency(monthStats.netBalance, 'ARS')}`, color: '#16a34a', Icon: TrendingUp, priority: 6 })
    }

    return candidates.sort((a, b) => a.priority - b.priority).slice(0, 3)
  }, [dayMap, monthStats, loading])

  if (loading || insights.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {insights.map(insight => (
        <div key={insight.id} className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: `3px solid ${insight.color}` }}>
          <insight.Icon size={14} style={{ color: insight.color, flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{insight.text}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [month, setMonth]       = useState(new Date())
  const [selected, setSelected] = useState<Date | null>(null)
  const [filter, setFilter]     = useState<CalendarFilter>('all')

  const { dayMap, monthStats, loading, avgDailyExpense } = useCalendarData(month, filter)
  const { tasksByDate, addTask, toggleTask, deleteTask }  = useCalendarTasks(month)

  const monthStart = startOfMonth(month)
  const monthEnd   = endOfMonth(month)
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad   = weekdayIndex(monthStart)

  const selectedKey  = selected ? format(selected, 'yyyy-MM-dd') : null
  const selectedData = selectedKey ? (dayMap.get(selectedKey) ?? null) : null
  const selectedTasks = selectedKey ? (tasksByDate.get(selectedKey) ?? []) : []

  const monthLabel = format(month, 'MMMM yyyy', { locale: es })
    .replace(/^\w/, c => c.toUpperCase())

  function handleMonthChange(dir: 1 | -1) {
    setMonth(m => dir === 1 ? addMonths(m, 1) : subMonths(m, 1))
    setSelected(null)
  }

  function handleToday() {
    setMonth(new Date())
    setSelected(new Date())
  }

  return (
    <div className="p-4 md:p-7 max-w-5xl mx-auto animate-fade-in space-y-4">

      {/* Header */}
      <PageHeader
        title="Calendario"
        subtitle="Visualizá tus movimientos día a día"
        icon={CalendarDays}
        color="#0EA5E9"
        layout="split"
      >
        <HelpButton section="calendar" />
        <button
          onClick={handleToday}
          className="hero-btn hero-btn-secondary hero-btn-sm"
        >
          Hoy
        </button>
      </PageHeader>

      {/* Month stats */}
      <MonthStatsRow stats={monthStats} loading={loading} />

      {/* Filters */}
      <FilterBar filter={filter} setFilter={(f) => { setFilter(f); setSelected(null) }} />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <MonthNavigator
              month={month}
              monthLabel={monthLabel}
              onPrev={() => handleMonthChange(-1)}
              onNext={() => handleMonthChange(1)}
              stats={monthStats}
            />
            <CalendarGrid
              days={days}
              startPad={startPad}
              dayMap={dayMap}
              tasksByDate={tasksByDate}
              selected={selected}
              setSelected={setSelected}
              avgDailyExpense={avgDailyExpense}
              filter={filter}
            />
          </div>
        </div>

        {/* Day panel */}
        <div className={selected === null ? 'hidden lg:block' : 'block'}>
          <DayPanel
            selected={selected}
            dayData={selectedData}
            tasks={selectedTasks}
            filter={filter}
            onClose={() => setSelected(null)}
            onAddTask={addTask}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
          />
        </div>
      </div>

      {/* Insights */}
      <InsightsRow dayMap={dayMap} monthStats={monthStats} loading={loading} />

    </div>
  )
}
