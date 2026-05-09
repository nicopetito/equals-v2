'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, TrendingUp, TrendingDown, Pencil, Trash2 } from 'lucide-react'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useWallets } from '@/hooks/useWallets'
import { transactionsService } from '@/services/transactions.service'
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

const CARD_STYLE = { background: '#fff', boxShadow: '0 2px 4px rgba(70,51,151,0.08)', border: '1px solid #f3f0ff' }

export default function TransactionsPage() {
  const { data: transactions, loading, refetch } = useTransactions()
  const { data: categories } = useCategories()
  const { data: wallets } = useWallets()

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
    if (!form.description || !form.amount || !form.date) { setFormError('Completá los campos obligatorios.'); return }
    setSaving(true); setFormError(null)
    try {
      if (editing?.id) await transactionsService.update(editing.id, form as Partial<Transaction>)
      else await transactionsService.create(form as Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
      setModalOpen(false); refetch()
    } catch { setFormError('Error al guardar. Intentá de nuevo.') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try { await transactionsService.delete(id); refetch() }
    finally { setDeleting(null) }
  }

  const categoryOptions = [{ value: '', label: 'Sin categoría' }, ...categories.map(c => ({ value: c.id!, label: c.name }))]
  const walletOptions   = [{ value: '', label: 'Sin billetera'  }, ...wallets.map(w =>    ({ value: w.id!, label: w.name }))]

  const pillStyle = (active: boolean) => active
    ? { background: 'linear-gradient(135deg,#463397,#9850eb)', color: 'white' }
    : { color: '#6b7280' }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#463397' }}>Transacciones</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} movimientos</p>
        </div>
        <Button onClick={openCreate} size="sm"><Plus size={16} />Nueva transacción</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar transacciones…"
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 text-gray-800 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
          {(['all', 'income', 'expense'] as FilterType[]).map(t => (
            <button key={t} onClick={() => setFilterType(t)} className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all" style={pillStyle(filterType === t)}>
              {t === 'all' ? 'Todos' : t === 'income' ? 'Ingresos' : 'Gastos'}
            </button>
          ))}
        </div>
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
          {PERIOD_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setPeriod(opt.value)} className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all" style={pillStyle(period === opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando…</div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Sin transacciones" description="No hay movimientos para el período seleccionado." action={{ label: 'Nueva transacción', onClick: openCreate }} />
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(tx => (
              <div key={tx.id} className="flex items-center gap-4 px-5 py-4 hover:bg-violet-50/40 transition-colors group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: tx.type === 'income' ? '#d1fae5' : '#fee2e2' }}>
                  {tx.type === 'income' ? <TrendingUp size={18} className="text-emerald-600" /> : <TrendingDown size={18} className="text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{tx.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{formatDate(tx.date)}</span>
                    {tx.category_name && <CategoryBadge name={tx.category_name} color={tx.category_color} />}
                    {tx.wallet_name && <span className="text-xs text-gray-400">{tx.wallet_name}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums" style={{ color: tx.type === 'income' ? '#059669' : '#dc2626' }}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                  </p>
                  <p className="text-xs text-gray-400">{tx.currency}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(tx)} className="p-1.5 rounded-lg hover:bg-violet-100 text-gray-400 hover:text-violet-700"><Pencil size={14} /></button>
                  <button onClick={() => tx.id && handleDelete(tx.id)} disabled={deleting === tx.id} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar transacción' : 'Nueva transacción'}>
        <div className="space-y-4">
          {formError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{formError}</div>}
          <Select label="Tipo" value={form.type ?? 'expense'} onChange={e => setForm(f => ({ ...f, type: e.target.value as TransactionType }))} options={[{ value: 'expense', label: 'Gasto' }, { value: 'income', label: 'Ingreso' }]} />
          <Input label="Descripción" value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ej: Supermercado" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Monto" type="number" min="0" step="0.01" value={form.amount ?? ''} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} required />
            <Select label="Moneda" value={form.currency ?? 'ARS'} onChange={e => setForm(f => ({ ...f, currency: e.target.value as Currency }))} options={CURRENCY_OPTS} />
          </div>
          <Input label="Fecha" type="date" value={form.date ?? ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
          <Select label="Categoría" value={form.category_id ?? ''} onChange={e => setForm(f => ({ ...f, category_id: e.target.value || null }))} options={categoryOptions} />
          <Select label="Billetera" value={form.wallet_id ?? ''} onChange={e => setForm(f => ({ ...f, wallet_id: e.target.value || null }))} options={walletOptions} />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{editing ? 'Guardar cambios' : 'Crear transacción'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
