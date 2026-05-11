'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Copy, Target } from 'lucide-react'
import { format, addMonths, subMonths, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { useBudgets } from '@/hooks/useBudgets'
import { useCategories } from '@/hooks/useCategories'
import { useTransactions } from '@/hooks/useTransactions'
import { budgetsService, type Budget } from '@/services/budgets.service'
import { useToast } from '@/components/providers/ToastProvider'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { BudgetVsActualChart } from '@/components/ui/BudgetVsActualChart'
import { formatCurrency } from '@/utils/format'

const CURRENCY_OPTS = [
  { value: 'ARS', label: 'ARS' }, { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' }, { value: 'CRYPTO', label: 'CRYPTO' },
]

function statusColor(pct: number): { bar: string; text: string; bg: string } {
  if (pct >= 100) return { bar: 'var(--grad-expense)', text: 'var(--expense-600)', bg: 'var(--expense-50)' }
  if (pct >= 80)  return { bar: 'linear-gradient(90deg,#F59E0B,#D97706)', text: '#D97706', bg: '#FFFBEB' }
  if (pct >= 60)  return { bar: 'linear-gradient(90deg,#F59E0B,#FBBF24)', text: '#D97706', bg: '#FFFBEB' }
  return { bar: 'var(--grad-income)', text: 'var(--income-600)', bg: 'var(--income-50)' }
}

export default function BudgetsPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const monthStr = format(currentMonth, 'yyyy-MM')
  const prevMonthStr = format(subMonths(currentMonth, 1), 'yyyy-MM')

  const { data: budgets, loading: budgetsLoading, refetch } = useBudgets(monthStr)
  const { data: categories } = useCategories()
  const { data: allTransactions } = useTransactions()
  const { addToast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Budget | null>(null)
  const [form, setForm]           = useState<Partial<Budget>>({ currency: 'ARS', amount: 0 })
  const [saving, setSaving]       = useState(false)

  // Gastos del mes por categoría
  const spending = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end   = endOfMonth(currentMonth)
    const map = new Map<string, number>()
    allTransactions
      .filter(t => {
        const d = new Date(t.date)
        return t.type === 'expense' && d >= start && d <= end
      })
      .forEach(t => {
        if (!t.category_id) return
        map.set(t.category_id, (map.get(t.category_id) ?? 0) + t.amount)
      })
    return map
  }, [allTransactions, monthStr])

  const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent    = budgets.reduce((s, b) => s + (spending.get(b.category_id) ?? 0), 0)
  const totalPct      = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0

  const categoryOpts = [
    { value: '', label: '— elegí una categoría —' },
    ...categories
      .filter(c => c.type === 'expense' && !budgets.find(b => b.category_id === c.id && !editing))
      .map(c => ({ value: c.id!, label: c.name })),
  ]

  function openCreate() {
    setEditing(null)
    setForm({ currency: 'ARS', amount: 0 })
    setModalOpen(true)
  }
  function openEdit(b: Budget) {
    setEditing(b)
    setForm({ ...b })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.category_id) { addToast('Seleccioná una categoría', 'warning'); return }
    if (!form.amount || form.amount <= 0) { addToast('Ingresá un monto válido', 'warning'); return }
    setSaving(true)
    try {
      const cat = categories.find(c => c.id === form.category_id)
      await budgetsService.upsert(monthStr, {
        id:             editing?.id,
        category_id:    form.category_id!,
        category_name:  cat?.name ?? '',
        category_color: cat?.color ?? '#6366F1',
        amount:         form.amount!,
        currency:       form.currency ?? 'ARS',
        month:          monthStr,
      })
      addToast(editing ? 'Presupuesto actualizado' : 'Presupuesto creado', 'success')
      setModalOpen(false)
      refetch()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(b: Budget) {
    await budgetsService.delete(monthStr, b.category_id)
    addToast(`Presupuesto de "${b.category_name}" eliminado`, 'info')
    refetch()
  }

  async function handleCopyPrev() {
    await budgetsService.copyFromMonth(prevMonthStr, monthStr)
    addToast('Presupuestos copiados del mes anterior', 'success')
    refetch()
  }

  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: es })
    .replace(/^\w/, c => c.toUpperCase())

  return (
    <div className="p-5 md:p-7 max-w-4xl mx-auto space-y-6 animate-fade-in">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Presupuestos
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Controlá cuánto querés gastar por categoría
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleCopyPrev} size="md">
            <Copy size={14} /> Copiar mes anterior
          </Button>
          <Button onClick={openCreate} size="md">
            <Plus size={16} /> Nuevo presupuesto
          </Button>
        </div>
      </div>

      {/* Navegador de mes */}
      <div
        className="flex items-center justify-between rounded-2xl px-4 py-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <button
          onClick={() => setCurrentMonth(m => subMonths(m, 1))}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-slate-100"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronLeft size={17} />
        </button>
        <span className="font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>
          {monthLabel}
        </span>
        <button
          onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-slate-100"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronRight size={17} />
        </button>
      </div>

      {/* Resumen total */}
      {budgets.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              Resumen del mes
            </span>
            <span
              className="text-xs font-extrabold px-2.5 py-1 rounded-full"
              style={
                totalPct >= 100 ? { background: 'var(--expense-50)', color: 'var(--expense-600)' }
                : totalPct >= 80 ? { background: '#FFFBEB', color: '#D97706' }
                : { background: 'var(--income-50)', color: 'var(--income-600)' }
              }
            >
              {totalPct.toFixed(0)}% usado
            </span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span style={{ color: 'var(--text-muted)' }}>
              Gastado: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalSpent, 'ARS')}</strong>
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              de <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalBudgeted, 'ARS')}</strong>
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(totalPct, 100)}%`,
                background: statusColor(totalPct).bar,
              }}
            />
          </div>
        </div>
      )}

      {/* Gráfico presupuesto vs real */}
      {budgets.length > 0 && (
        <BudgetVsActualChart
          budgets={budgets}
          transactions={allTransactions}
          month={monthStr}
        />
      )}

      {/* Lista de presupuestos */}
      {budgetsLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-2xl animate-shimmer" style={{ height: 88 }} />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-2xl gap-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--brand-50)' }}
          >
            <Target size={28} style={{ color: 'var(--brand-500)' }} />
          </div>
          <div className="text-center">
            <p className="font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>
              Sin presupuestos para este mes
            </p>
            <p className="text-sm mt-1 max-w-xs" style={{ color: 'var(--text-muted)' }}>
              Definí cuánto querés gastar por categoría y la app te avisará cuando te acercás al límite.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus size={15} /> Crear primer presupuesto
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map(budget => {
            const spent = spending.get(budget.category_id) ?? 0
            const pct   = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
            const sc    = statusColor(pct)
            return (
              <div
                key={budget.id}
                className="rounded-2xl p-4 group transition-all hover:-translate-y-0.5"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: budget.category_color }} />
                    <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {budget.category_name}
                    </span>
                    {pct >= 100 && (
                      <span
                        className="text-xs font-extrabold px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--expense-50)', color: 'var(--expense-600)' }}
                      >
                        ¡Superado!
                      </span>
                    )}
                    {pct >= 80 && pct < 100 && (
                      <span
                        className="text-xs font-extrabold px-2 py-0.5 rounded-full"
                        style={{ background: '#FFFBEB', color: '#D97706' }}
                      >
                        Cerca del límite
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(budget)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-100"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(budget)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--expense-50)'; e.currentTarget.style.color = 'var(--expense-500)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: 'var(--text-muted)' }}>
                    Gastado: <span className="font-bold" style={{ color: sc.text }}>
                      {formatCurrency(spent, budget.currency)}
                    </span>
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Límite: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(budget.amount, budget.currency)}
                    </span>
                    {' '}· <span className="font-bold" style={{ color: sc.text }}>{pct.toFixed(0)}%</span>
                  </span>
                </div>

                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(pct, 100)}%`, background: sc.bar }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar presupuesto' : 'Nuevo presupuesto'}>
        <div className="space-y-4">
          {!editing && (
            <Select
              label="Categoría"
              value={form.category_id ?? ''}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              options={categoryOpts}
            />
          )}
          {editing && (
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: 'var(--bg-subtle)' }}
            >
              <span className="w-3 h-3 rounded-full" style={{ background: editing.category_color }} />
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{editing.category_name}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monto límite"
              type="number" min="0" step="0.01"
              value={form.amount ?? 0}
              onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
            />
            <Select
              label="Moneda"
              value={form.currency ?? 'ARS'}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              options={CURRENCY_OPTS}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editing ? 'Guardar cambios' : 'Crear presupuesto'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
