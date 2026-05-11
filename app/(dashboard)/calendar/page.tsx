'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import {
  format, addMonths, subMonths,
  startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, isToday, parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { useTransactions } from '@/hooks/useTransactions'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { formatCurrency } from '@/utils/format'
import { formatDate } from '@/utils/date'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// 0=Sun…6=Sat → índice Lun-based
function weekdayIndex(d: Date): number {
  const raw = getDay(d)
  return raw === 0 ? 6 : raw - 1
}

function amountColor(amount: number, avg: number) {
  if (amount <= 0) return 'var(--text-faint)'
  if (amount <= avg * 0.7) return 'var(--income-600)'
  if (amount <= avg * 1.2) return 'var(--goal-600)'
  return 'var(--expense-600)'
}

function amountDotBg(amount: number, avg: number) {
  if (amount <= 0) return 'transparent'
  if (amount <= avg * 0.7) return 'var(--income-500)'
  if (amount <= avg * 1.2) return 'var(--goal-500)'
  return 'var(--expense-500)'
}

export default function CalendarPage() {
  const [month, setMonth] = useState(new Date())
  const [selected, setSelected] = useState<Date | null>(null)

  const { data: transactions } = useTransactions()

  const monthStart = startOfMonth(month)
  const monthEnd   = endOfMonth(month)

  // Solo transacciones del mes
  const monthTx = useMemo(() =>
    transactions.filter(t => {
      const d = parseISO(t.date)
      return d >= monthStart && d <= monthEnd
    }),
  [transactions, format(month, 'yyyy-MM')])

  // Gasto total por día
  const expenseByDay = useMemo(() => {
    const map = new Map<string, number>()
    monthTx.filter(t => t.type === 'expense').forEach(t => {
      const key = t.date.substring(0, 10)
      map.set(key, (map.get(key) ?? 0) + t.amount)
    })
    return map
  }, [monthTx])

  // Promedio diario (días con al menos un gasto)
  const avgDaily = useMemo(() => {
    const vals = Array.from(expenseByDay.values())
    if (vals.length === 0) return 0
    return vals.reduce((s, v) => s + v, 0) / vals.length
  }, [expenseByDay])

  // Días del mes + padding inicial
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = weekdayIndex(monthStart)

  // Transacciones del día seleccionado
  const selectedTx = useMemo(() => {
    if (!selected) return []
    return monthTx
      .filter(t => isSameDay(parseISO(t.date), selected))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [monthTx, selected])

  const selectedKey    = selected ? format(selected, 'yyyy-MM-dd') : null
  const selectedTotal  = selectedKey ? (expenseByDay.get(selectedKey) ?? 0) : 0
  const selectedIncome = selectedTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)

  const monthLabel = format(month, "MMMM yyyy", { locale: es })
    .replace(/^\w/, c => c.toUpperCase())

  const totalExpenses = Array.from(expenseByDay.values()).reduce((s, v) => s + v, 0)
  const totalIncome   = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="p-5 md:p-7 max-w-5xl mx-auto animate-fade-in">

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Calendario
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Visualizá tus movimientos día a día
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Columna principal: calendario */}
        <div className="lg:col-span-2 space-y-4">
          {/* Navegador de mes */}
          <div
            className="flex items-center justify-between rounded-2xl px-4 py-3"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <button
              onClick={() => { setMonth(m => subMonths(m, 1)); setSelected(null) }}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-slate-100"
              style={{ color: 'var(--text-muted)' }}
            >
              <ChevronLeft size={17} />
            </button>
            <div className="text-center">
              <p className="font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>{monthLabel}</p>
              <div className="flex items-center justify-center gap-4 mt-0.5">
                <span className="text-xs" style={{ color: 'var(--income-600)' }}>
                  +{formatCurrency(totalIncome, 'ARS')}
                </span>
                <span className="text-xs" style={{ color: 'var(--expense-600)' }}>
                  −{formatCurrency(totalExpenses, 'ARS')}
                </span>
              </div>
            </div>
            <button
              onClick={() => { setMonth(m => addMonths(m, 1)); setSelected(null) }}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-slate-100"
              style={{ color: 'var(--text-muted)' }}
            >
              <ChevronRight size={17} />
            </button>
          </div>

          {/* Leyenda de colores */}
          <div className="flex items-center gap-4 px-1">
            {[
              { label: 'Bajo promedio', color: 'var(--income-500)' },
              { label: 'Normal',        color: 'var(--goal-500)' },
              { label: 'Alto',          color: 'var(--expense-500)' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{l.label}</span>
              </div>
            ))}
          </div>

          {/* Grid del calendario */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            {/* Nombres de días */}
            <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--border-light)' }}>
              {WEEKDAYS.map(w => (
                <div key={w} className="py-2 text-center text-xs font-extrabold" style={{ color: 'var(--text-faint)' }}>
                  {w}
                </div>
              ))}
            </div>

            {/* Días */}
            <div className="grid grid-cols-7">
              {/* Padding inicial */}
              {Array.from({ length: startPad }).map((_, i) => (
                <div key={`pad-${i}`} style={{ borderBottom: '1px solid var(--border-light)', borderRight: '1px solid var(--border-light)' }} className="min-h-[72px]" />
              ))}

              {days.map(day => {
                const key    = format(day, 'yyyy-MM-dd')
                const spent  = expenseByDay.get(key) ?? 0
                const isSel  = selected ? isSameDay(day, selected) : false
                const today  = isToday(day)

                return (
                  <div
                    key={key}
                    onClick={() => setSelected(isSel ? null : day)}
                    className="min-h-[72px] p-2 cursor-pointer transition-all flex flex-col"
                    style={{
                      borderBottom: '1px solid var(--border-light)',
                      borderRight:  '1px solid var(--border-light)',
                      background: isSel
                        ? 'var(--brand-50)'
                        : today
                          ? 'var(--bg-subtle)'
                          : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--bg-subtle)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSel ? 'var(--brand-50)' : today ? 'var(--bg-subtle)' : 'transparent' }}
                  >
                    {/* Número del día */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-xs font-extrabold w-6 h-6 flex items-center justify-center rounded-full"
                        style={
                          today
                            ? { background: 'var(--grad-brand)', color: 'white' }
                            : { color: isSel ? 'var(--brand-600)' : 'var(--text-muted)' }
                        }
                      >
                        {format(day, 'd')}
                      </span>
                      {spent > 0 && (
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: amountDotBg(spent, avgDaily) }}
                        />
                      )}
                    </div>
                    {/* Monto */}
                    {spent > 0 && (
                      <span
                        className="text-[10px] font-bold tabular-nums leading-tight"
                        style={{ color: amountColor(spent, avgDaily) }}
                      >
                        {new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(spent)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Panel lateral: detalle del día */}
        <div>
          {selected ? (
            <div
              className="rounded-2xl overflow-hidden sticky top-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
            >
              {/* Header */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--bg-subtle)' }}
              >
                <div>
                  <p className="font-extrabold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {format(selected, "EEEE d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {selectedIncome > 0 && (
                      <span className="text-xs font-bold" style={{ color: 'var(--income-600)' }}>
                        +{formatCurrency(selectedIncome, 'ARS')}
                      </span>
                    )}
                    {selectedTotal > 0 && (
                      <span className="text-xs font-bold" style={{ color: 'var(--expense-600)' }}>
                        −{formatCurrency(selectedTotal, 'ARS')}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-slate-200 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              </div>

              {/* Transacciones */}
              {selectedTx.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-faint)' }}>
                    Sin movimientos este día
                  </p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                  {selectedTx.map(tx => (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: tx.type === 'income' ? 'var(--income-50)' : 'var(--expense-50)' }}
                      >
                        {tx.type === 'income'
                          ? <TrendingUp size={14} style={{ color: 'var(--income-500)' }} />
                          : <TrendingDown size={14} style={{ color: 'var(--expense-500)' }} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                          {tx.description}
                        </p>
                        {tx.category_name && (
                          <CategoryBadge name={tx.category_name} color={tx.category_color} />
                        )}
                      </div>
                      <p
                        className="text-xs font-bold tabular-nums shrink-0"
                        style={{ color: tx.type === 'income' ? 'var(--income-600)' : 'var(--expense-600)' }}
                      >
                        {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount, tx.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div
              className="rounded-2xl flex flex-col items-center justify-center py-12 px-4 text-center gap-3"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="text-3xl">📅</div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Seleccioná un día
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Hacé clic en cualquier día del calendario para ver sus movimientos
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
