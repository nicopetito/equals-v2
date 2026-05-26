'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Copy,
  Wallet, AlertTriangle, TrendingUp, Calendar,
} from 'lucide-react'
import { PageHeader }          from '@/components/ui/PageHeader'
import { HelpButton }          from '@/components/help/HelpButton'
import { useBudgets }          from '@/hooks/useBudgets'
import { useCategories }       from '@/hooks/useCategories'
import { useTransactions }     from '@/hooks/useTransactions'
import { useRefunds }          from '@/hooks/useRefunds'
import { budgetsService }      from '@/services/budgets.service'
import { useToast }            from '@/components/providers/ToastProvider'
import { Modal }               from '@/components/ui/Modal'
import { Button }              from '@/components/ui/Button'
import { Input }               from '@/components/ui/Input'
import { Select }              from '@/components/ui/Select'
import { BudgetVsActualChart } from '@/components/ui/BudgetVsActualChart'
import { formatCurrency, safeNumber } from '@/utils/format'
import { buildCreditedRefundMap }    from '@/utils/finance'
import type { Budget, BudgetCreate } from '@/types'

// ─── constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const MONTH_OPTS = MONTH_NAMES.map((label, i) => ({ value: String(i + 1), label }))

const CURRENCY_OPTS = [
  { value: 'ARS',    label: 'ARS – Peso argentino' },
  { value: 'USD',    label: 'USD – Dólar' },
  { value: 'EUR',    label: 'EUR – Euro' },
  { value: 'CRYPTO', label: 'CRYPTO – Cripto' },
]

const YEAR_OPTS = (() => {
  const y = new Date().getFullYear()
  return [y - 1, y, y + 1].map(v => ({ value: String(v), label: String(v) }))
})()

// ─── helpers ──────────────────────────────────────────────────────────────────

function getBudgetStatus(limitAmount: number, spent: number) {
  const limit = safeNumber(limitAmount)
  const s     = safeNumber(spent)
  const pct   = limit > 0 ? (s / limit) * 100 : 0
  const status: 'ok' | 'warning' | 'danger' =
    pct >= 100 ? 'danger' : pct >= 70 ? 'warning' : 'ok'
  return {
    pct:       Math.min(pct, 100),
    rawPct:    pct,
    remaining: limit - s,
    overBy:    Math.max(0, s - limit),
    status,
  }
}

function statusStyles(status: 'ok' | 'warning' | 'danger') {
  if (status === 'danger')  return { bar: 'var(--grad-expense)', text: 'var(--expense-600)', bg: 'var(--expense-50)',  badge: '¡Superado!' }
  if (status === 'warning') return { bar: 'linear-gradient(90deg,#F59E0B,#D97706)', text: '#D97706', bg: '#FFFBEB', badge: 'Cerca del límite' }
  return { bar: 'var(--grad-income)', text: 'var(--income-600)', bg: 'var(--income-50)', badge: 'Bajo control' }
}

// ─── page ──────────────────────────────────────────────────────────────────────

interface FormState {
  category_id:      string
  limit_amount:     number
  currency:         string
  alert_percentage: string
  note:             string
  month:            number
  year:             number
}

export default function BudgetsPage() {
  const now   = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())

  const { data: budgets,  loading: budgetsLoading, refetch } = useBudgets(month, year)
  const { data: categories }  = useCategories()
  const { data: allTx }       = useTransactions()
  const { items: allRefunds } = useRefunds()
  const { addToast }          = useToast()

  const creditedRefundMap = useMemo(
    () => buildCreditedRefundMap(allRefunds),
    [allRefunds]
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState<Budget | null>(null)
  const [form, setForm]           = useState<FormState>({
    category_id: '', limit_amount: 0, currency: 'ARS',
    alert_percentage: '', note: '', month, year,
  })
  const [saving, setSaving] = useState(false)

  // ── month navigation ────────────────────────────────────────────────────────

  const prevMonth = useCallback(() => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }, [month])

  const nextMonth = useCallback(() => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }, [month])

  const goToday = useCallback(() => {
    setMonth(now.getMonth() + 1)
    setYear(now.getFullYear())
  }, [now])

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()

  // ── spending per category ───────────────────────────────────────────────────

  const spentByCategory = useMemo(() => {
    const pad  = (n: number) => String(n).padStart(2, '0')
    const from = `${year}-${pad(month)}-01`
    const to   = `${year}-${pad(month)}-31`
    const map: Record<string, number> = {}
    allTx.forEach(t => {
      if (t.type !== 'expense' || !t.category_id) return
      if (t.date < from || t.date > to) return
      const credited  = creditedRefundMap.get(t.id ?? '') ?? 0
      const netAmount = Math.max(0, safeNumber(t.amount) - credited)
      map[t.category_id] = safeNumber(map[t.category_id]) + netAmount
    })
    return map
  }, [allTx, month, year, creditedRefundMap])

  // ── summary totals ──────────────────────────────────────────────────────────

  const summary = useMemo(() => {
    const totalLimit = budgets.reduce((s, b) => s + safeNumber(b.limit_amount), 0)
    const totalSpent = budgets.reduce((s, b) => s + safeNumber(spentByCategory[b.category_id]), 0)
    const overallPct = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0
    const overBudget = budgets.filter(b => {
      const spent = safeNumber(spentByCategory[b.category_id])
      return spent > safeNumber(b.limit_amount)
    }).length
    return { totalLimit, totalSpent, overallPct, overBudget }
  }, [budgets, spentByCategory])

  // ── category options for modal ──────────────────────────────────────────────

  const categoryOpts = useMemo(() => {
    const budgetedIds = editing
      ? new Set(budgets.filter(b => b.id !== editing.id).map(b => b.category_id))
      : new Set(budgets.map(b => b.category_id))

    return [
      { value: '', label: '— elegí una categoría —' },
      ...categories
        .filter(c => c.type === 'expense' && !budgetedIds.has(c.id!))
        .map(c => ({ value: c.id!, label: c.name })),
    ]
  }, [categories, budgets, editing])

  // ── modal helpers ───────────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null)
    setForm({ category_id: '', limit_amount: 0, currency: 'ARS', alert_percentage: '', note: '', month, year })
    setModalOpen(true)
  }

  function openEdit(b: Budget) {
    setEditing(b)
    setForm({
      category_id:      b.category_id,
      limit_amount:     b.limit_amount,
      currency:         b.currency,
      alert_percentage: b.alert_percentage != null ? String(b.alert_percentage) : '',
      note:             b.note ?? '',
      month:            b.month,
      year:             b.year,
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.category_id)    { addToast('Seleccioná una categoría', 'error'); return }
    if (form.limit_amount <= 0) { addToast('Ingresá un límite mayor a 0', 'error'); return }

    const alertPct = form.alert_percentage !== '' ? Number(form.alert_percentage) : null
    if (alertPct !== null && (alertPct < 1 || alertPct > 100)) {
      addToast('La alerta debe estar entre 1 y 100', 'error'); return
    }

    const payload: BudgetCreate = {
      category_id:      form.category_id,
      month:            form.month,
      year:             form.year,
      limit_amount:     safeNumber(form.limit_amount),
      currency:         form.currency,
      alert_percentage: alertPct,
      note:             form.note.trim() || null,
    }

    setSaving(true)
    try {
      if (editing) {
        await budgetsService.update(editing.id, payload)
        addToast('Presupuesto actualizado', 'success')
      } else {
        await budgetsService.create(payload)
        addToast('Presupuesto creado', 'success')
      }
      setModalOpen(false)
      refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      addToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(b: Budget) {
    try {
      await budgetsService.delete(b.id)
      addToast(`Presupuesto de "${b.category_name}" eliminado`, 'info')
      refetch()
    } catch {
      addToast('Error al eliminar', 'error')
    }
  }

  async function handleCopyPrev() {
    const [sm, sy] = month === 1 ? [12, year - 1] : [month - 1, year]
    try {
      const { copied } = await budgetsService.copyFromMonth(sm, sy, month, year)
      if (copied === 0) {
        addToast('No hay presupuestos en el mes anterior para copiar.', 'info')
      } else {
        addToast(`Se copiaron ${copied} presupuesto${copied > 1 ? 's' : ''} de ${MONTH_NAMES[sm - 1]} ${sy}.`, 'success')
        refetch()
      }
    } catch {
      addToast('Error al copiar presupuestos', 'error')
    }
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 md:p-7 max-w-4xl mx-auto space-y-5 animate-fade-in">

      {/* HEADER */}
      <PageHeader
        layout="split"
        title="Presupuestos"
        subtitle="Controlá tus límites mensuales por categoría"
        icon={Wallet}
        color="#d0bcff"
      >
        <HelpButton section="budgets" />
        <button
          onClick={handleCopyPrev}
          className="hero-btn hero-btn-secondary hero-btn-sm"
        >
          <Copy size={13} /> Copiar mes anterior
        </button>
        <Button onClick={openCreate} variant="hero-primary">
          <Plus size={14} /> Nuevo presupuesto
        </Button>
      </PageHeader>

      {/* MONTH NAVIGATOR */}
      <div
        className="flex items-center justify-between rounded-2xl px-4 py-2.5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <button
          onClick={prevMonth}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-3">
          <span className="font-extrabold text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
            {MONTH_NAMES[month - 1]} {year}
          </span>
          {!isCurrentMonth && (
            <button
              onClick={goToday}
              className="text-xs px-2 py-0.5 rounded-lg font-semibold transition-colors"
              style={{ background: 'var(--brand-50)', color: 'var(--brand-500)' }}
            >
              Hoy
            </button>
          )}
        </div>

        <button
          onClick={nextMonth}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* SUMMARY STRIP */}
      {budgets.length > 0 && (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-0 rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          {[
            { label: 'Presupuestado', value: formatCurrency(summary.totalLimit, 'ARS'), icon: <Wallet size={14} />, color: 'var(--brand-500)' },
            { label: 'Gastado',       value: formatCurrency(summary.totalSpent, 'ARS'), icon: <TrendingUp size={14} />, color: summary.overallPct >= 100 ? 'var(--expense-600)' : summary.overallPct >= 70 ? '#D97706' : 'var(--income-600)' },
            { label: 'Restante',      value: formatCurrency(Math.max(0, summary.totalLimit - summary.totalSpent), 'ARS'), icon: <Calendar size={14} />, color: 'var(--text-secondary)' },
            { label: 'Usado',         value: `${Math.min(summary.overallPct, 999).toFixed(0)}%`, icon: null, color: summary.overallPct >= 100 ? 'var(--expense-600)' : summary.overallPct >= 70 ? '#D97706' : 'var(--income-600)' },
            { label: 'Categorías',    value: String(budgets.length), icon: null, color: 'var(--text-secondary)' },
            { label: 'Superadas',     value: String(summary.overBudget), icon: summary.overBudget > 0 ? <AlertTriangle size={13} /> : null, color: summary.overBudget > 0 ? 'var(--expense-600)' : 'var(--income-600)' },
          ].map((s, i) => (
            <div
              key={i}
              className="flex flex-col gap-0.5 px-4 py-3 bg-card"
              style={{ borderRight: i < 5 ? '1px solid var(--border)' : undefined }}
            >
              <span className="text-xs uppercase tracking-wide font-semibold" style={{ color: 'var(--text-muted)' }}>
                {s.label}
              </span>
              <div className="flex items-center gap-1">
                {s.icon && <span style={{ color: s.color }}>{s.icon}</span>}
                <span className="font-extrabold text-sm truncate" style={{ color: s.color, fontFamily: 'var(--font-sora)' }}>
                  {s.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CHART */}
      {budgets.length > 0 && (
        <BudgetVsActualChart
          budgets={budgets}
          transactions={allTx}
          month={month}
          year={year}
          refunds={allRefunds}
        />
      )}

      {/* BUDGET LIST */}
      {budgetsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl animate-shimmer" style={{ height: 96 }} />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-2xl gap-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--brand-50)' }}
          >
            <Wallet size={24} style={{ color: 'var(--brand-500)' }} />
          </div>
          <div className="text-center">
            <p className="font-extrabold text-base" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
              No tenés presupuestos para {MONTH_NAMES[month - 1]} {year}
            </p>
            <p className="text-sm mt-1 max-w-xs mx-auto" style={{ color: 'var(--text-muted)' }}>
              Establecé un límite mensual por categoría. Equal te avisará cuando estés cerca de superarlo o lo hayas excedido.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            <Button onClick={openCreate}>
              <Plus size={14} /> Nuevo presupuesto
            </Button>
            <Button variant="secondary" onClick={handleCopyPrev}>
              <Copy size={13} /> Copiar mes anterior
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {budgets.map(budget => {
            const spent  = safeNumber(spentByCategory[budget.category_id])
            const { pct, rawPct, remaining, overBy, status } = getBudgetStatus(budget.limit_amount, spent)
            const styles = statusStyles(status)

            return (
              <div
                key={budget.id}
                className="rounded-2xl p-4 group transition-all duration-200 hover:-translate-y-px"
                style={{
                  background:   'var(--bg-card)',
                  border:       '1px solid var(--border)',
                  boxShadow:    'var(--shadow-xs)',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-xs)' }}
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: budget.category_color ?? 'var(--brand-500)' }}
                    />
                    <span className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
                      {budget.category_name ?? '—'}
                    </span>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: styles.bg, color: styles.text }}
                    >
                      {styles.badge}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                    <button
                      onClick={() => openEdit(budget)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-50)'; e.currentTarget.style.color = 'var(--brand-500)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                      title="Editar"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(budget)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--expense-50)'; e.currentTarget.style.color = 'var(--expense-500)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                      title="Eliminar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 rounded-full overflow-hidden mb-2.5" style={{ background: 'var(--bg-subtle)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: styles.bar }}
                  />
                </div>

                {/* Amounts */}
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>
                      Gastado{' '}
                      <strong style={{ color: styles.text }}>
                        {formatCurrency(spent, budget.currency)}
                      </strong>
                      {' '}de{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(budget.limit_amount, budget.currency)}
                      </strong>
                    </span>
                    <span className="font-bold tabular-nums" style={{ color: styles.text }}>
                      {rawPct.toFixed(0)}%
                    </span>
                  </div>

                  {status === 'danger' ? (
                    <span className="font-semibold" style={{ color: 'var(--expense-600)' }}>
                      Superado por {formatCurrency(overBy, budget.currency)}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>
                      Restan{' '}
                      <strong style={{ color: 'var(--text-secondary)' }}>
                        {formatCurrency(remaining, budget.currency)}
                      </strong>
                    </span>
                  )}

                  {budget.alert_percentage != null && (
                    <span style={{ color: 'var(--text-faint)', fontSize: '10px' }}>
                      Alerta al {budget.alert_percentage}%
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL CREAR / EDITAR */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar presupuesto' : 'Nuevo presupuesto'}
      >
        <div className="space-y-4">

          {/* Category */}
          {editing ? (
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: 'var(--bg-subtle)' }}
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: editing.category_color ?? 'var(--brand-500)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{editing.category_name}</span>
            </div>
          ) : (
            <Select
              label="Categoría de gasto"
              value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              options={categoryOpts}
            />
          )}

          {/* Month + Year */}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Mes"
              value={String(form.month)}
              onChange={e => setForm(f => ({ ...f, month: Number(e.target.value) }))}
              options={MONTH_OPTS}
            />
            <Select
              label="Año"
              value={String(form.year)}
              onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}
              options={YEAR_OPTS}
            />
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Límite mensual"
              type="number"
              min="0"
              step="0.01"
              value={form.limit_amount}
              onChange={e => setForm(f => ({ ...f, limit_amount: parseFloat(e.target.value) || 0 }))}
            />
            <Select
              label="Moneda"
              value={form.currency}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              options={CURRENCY_OPTS}
            />
          </div>

          {/* Alert */}
          <Input
            label="Alerta al llegar a % del límite (opcional)"
            type="number"
            min="1"
            max="100"
            placeholder="Ej: 80"
            value={form.alert_percentage}
            onChange={e => setForm(f => ({ ...f, alert_percentage: e.target.value }))}
          />

          {/* Note */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Nota (opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ej: Solo para supermercado"
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              className="w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
              style={{
                background:  'var(--bg-subtle)',
                border:      '1.5px solid var(--border)',
                color:       'var(--text-primary)',
                fontFamily:  'var(--font-inter)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand-500)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editing ? 'Guardar cambios' : 'Crear presupuesto'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
