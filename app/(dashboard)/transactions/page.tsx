'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, TrendingUp, TrendingDown, Pencil, Trash2, Filter } from 'lucide-react'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useWallets } from '@/hooks/useWallets'
import { transactionsService } from '@/services/transactions.service'
import { useToast } from '@/components/providers/ToastProvider'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { formatCurrency } from '@/utils/format'
import { formatDate, getDateRangeForPeriod, PERIOD_OPTIONS, type Period } from '@/utils/date'
import type { Transaction, TransactionWithDetails, Currency, TransactionType } from '@/types'

const CURRENCY_OPTS = [
  { value: 'ARS', label: 'ARS' }, { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' }, { value: 'CRYPTO', label: 'CRYPTO' },
]
type FilterType = 'all' | TransactionType

const TYPE_FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all',     label: 'Todos' },
  { value: 'income',  label: 'Ingresos' },
  { value: 'expense', label: 'Gastos' },
]

function PillGroup<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div
      className="flex gap-1 rounded-xl p-1"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
          style={value === opt.value
            ? { background: 'var(--grad-brand)', color: 'white' }
            : { color: 'var(--text-muted)' }
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function TransactionsPage() {
  const { data: transactions, loading, refetch } = useTransactions()
  const { data: categories } = useCategories()
  const { data: wallets } = useWallets()
  const { addToast } = useToast()

  const [period, setPeriod]       = useState<Period>('30_days')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [search, setSearch]       = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<TransactionWithDetails | null>(null)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [form, setForm]           = useState<Partial<Transaction>>({ type: 'expense', currency: 'ARS', date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const { start, end } = getDateRangeForPeriod(period)
  const filtered = useMemo(() =>
    transactions.filter(t => {
      const date = new Date(t.date)
      if (date < start || date > end) return false
      if (filterType !== 'all' && t.type !== filterType) return false
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }),
  [transactions, start.toISOString(), end.toISOString(), filterType, search])

  const totals = useMemo(() => {
    const income   = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expenses }
  }, [filtered])

  function openCreate() {
    setEditing(null)
    setForm({ type: 'expense', currency: 'ARS', date: new Date().toISOString().split('T')[0] })
    setFormError(null)
    setModalOpen(true)
  }
  function openEdit(tx: TransactionWithDetails) {
    setEditing(tx)
    setForm({ ...tx })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.description || !form.amount || !form.date) { setFormError('Completá todos los campos obligatorios.'); return }
    setSaving(true); setFormError(null)
    const payload = { ...form, category_id: form.category_id || null, wallet_id: form.wallet_id || null }
    try {
      if (editing?.id) {
        await transactionsService.update(editing.id, payload as Partial<Transaction>)
        addToast('Transacción actualizada', 'success')
      } else {
        await transactionsService.create(payload as Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
        addToast('Transacción creada', 'success')
      }
      setModalOpen(false); refetch()
    } catch {
      setFormError('Error al guardar. Intentá de nuevo.')
      addToast('Error al guardar', 'error')
    }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try { await transactionsService.delete(id); refetch(); addToast('Transacción eliminada', 'info') }
    finally { setDeleting(null) }
  }

  const categoryOptions = [{ value: '', label: 'Sin categoría' }, ...categories.map(c => ({ value: c.id!, label: c.name }))]
  const walletOptions   = [{ value: '', label: 'Sin billetera'  }, ...wallets.map(w =>    ({ value: w.id!, label: w.name }))]

  return (
    <div className="p-5 md:p-7 max-w-5xl mx-auto space-y-6 animate-fade-in">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Transacciones
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} movimientos encontrados
          </p>
        </div>
        <Button onClick={openCreate} size="md">
          <Plus size={16} /> Nueva transacción
        </Button>
      </div>

      {/* Resumen rápido */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-2xl p-4"
            style={{ background: 'var(--income-50)', border: '1px solid var(--income-100)' }}
          >
            <p className="text-xs font-bold mb-1" style={{ color: 'var(--income-600)' }}>Total ingresos</p>
            <p className="text-xl font-extrabold tabular-nums" style={{ color: 'var(--income-600)' }}>
              +{formatCurrency(totals.income, 'ARS')}
            </p>
          </div>
          <div
            className="rounded-2xl p-4"
            style={{ background: 'var(--expense-50)', border: '1px solid var(--expense-100)' }}
          >
            <p className="text-xs font-bold mb-1" style={{ color: 'var(--expense-600)' }}>Total gastos</p>
            <p className="text-xl font-extrabold tabular-nums" style={{ color: 'var(--expense-600)' }}>
              −{formatCurrency(totals.expenses, 'ARS')}
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar transacciones…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              boxShadow: 'var(--shadow-xs)',
            }}
          />
        </div>
        <PillGroup options={TYPE_FILTERS} value={filterType} onChange={setFilterType} />
        <PillGroup options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
      </div>

      {/* Lista */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {loading ? (
          <div className="p-12 text-center" style={{ color: 'var(--text-muted)' }}>
            <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
            Cargando transacciones…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="Sin transacciones"
            description="No hay movimientos para el período y filtros seleccionados."
            action={{ label: '+ Nueva transacción', onClick: openCreate }}
          />
        ) : (
          <div>
            {filtered.map((tx, i) => (
              <div
                key={tx.id}
                className="flex items-center gap-4 px-5 py-4 group transition-colors"
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: tx.type === 'income' ? 'var(--income-50)' : 'var(--expense-50)' }}
                >
                  {tx.type === 'income'
                    ? <TrendingUp size={18} style={{ color: 'var(--income-500)' }} />
                    : <TrendingDown size={18} style={{ color: 'var(--expense-500)' }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {tx.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{formatDate(tx.date)}</span>
                    {tx.category_name && <CategoryBadge name={tx.category_name} color={tx.category_color} />}
                    {tx.wallet_name && (
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                      >
                        {tx.wallet_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right mr-2">
                  <p
                    className="text-base font-extrabold tabular-nums"
                    style={{ color: tx.type === 'income' ? 'var(--income-600)' : 'var(--expense-600)' }}
                  >
                    {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount, tx.currency)}
                  </p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-faint)' }}>
                    {tx.currency}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => openEdit(tx)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-50)'; e.currentTarget.style.color = 'var(--brand-500)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => tx.id && handleDelete(tx.id)}
                    disabled={deleting === tx.id}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--expense-50)'; e.currentTarget.style.color = 'var(--expense-500)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    {deleting === tx.id
                      ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      : <Trash2 size={14} />
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar transacción' : 'Nueva transacción'}>
        <div className="space-y-4">
          {formError && (
            <div
              className="rounded-xl px-4 py-3 text-sm font-medium"
              style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}
            >
              {formError}
            </div>
          )}

          {/* Selector de tipo visual */}
          <div className="flex gap-2">
            {(['expense', 'income'] as TransactionType[]).map(t => (
              <button
                key={t}
                onClick={() => setForm(f => ({ ...f, type: t }))}
                className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
                style={form.type === t
                  ? t === 'income'
                    ? { background: 'var(--income-50)', color: 'var(--income-600)', border: '2px solid var(--income-500)' }
                    : { background: 'var(--expense-50)', color: 'var(--expense-600)', border: '2px solid var(--expense-500)' }
                  : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '2px solid transparent' }
                }
              >
                {t === 'income' ? '↑ Ingreso' : '↓ Gasto'}
              </button>
            ))}
          </div>

          <Input
            label="Descripción"
            value={form.description ?? ''}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Ej: Supermercado, salario, alquiler…"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monto"
              type="number"
              min="0"
              step="0.01"
              value={form.amount ?? ''}
              onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
              required
            />
            <Select
              label="Moneda"
              value={form.currency ?? 'ARS'}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value as Currency }))}
              options={CURRENCY_OPTS}
            />
          </div>
          <Input
            label="Fecha"
            type="date"
            value={form.date ?? ''}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            required
          />
          <Select
            label="Categoría"
            value={form.category_id ?? ''}
            onChange={e => setForm(f => ({ ...f, category_id: e.target.value || null }))}
            options={categoryOptions}
          />
          <Select
            label="Billetera"
            value={form.wallet_id ?? ''}
            onChange={e => setForm(f => ({ ...f, wallet_id: e.target.value || null }))}
            options={walletOptions}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editing ? 'Guardar cambios' : 'Crear transacción'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
