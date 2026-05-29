'use client'

import { useState, useMemo, useRef, useEffect, Fragment, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Plus, Search, TrendingUp, TrendingDown, Pencil, Trash2, Filter,
  ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, ChevronDown,
  RotateCcw, CheckCircle, XCircle, CheckSquare, Square, MinusSquare, AlertTriangle, Tag,
} from 'lucide-react'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useWallets } from '@/hooks/useWallets'
import { useRefunds } from '@/hooks/useRefunds'
import { transactionsService } from '@/services/transactions.service'
import { refundService } from '@/services/refund.service'
import { useToast } from '@/components/providers/ToastProvider'
import { NewTransactionModal } from '@/components/transactions/NewTransactionModal'
import { HelpButton } from '@/components/help/HelpButton'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { formatCurrency } from '@/utils/format'
import { formatDate, getDateRangeForPeriod, PERIOD_OPTIONS, type Period } from '@/utils/date'
import type { TransactionWithDetails, TransactionType, Refund } from '@/types'

type FilterType = 'all' | TransactionType
type GroupBy = 'none' | 'date' | 'month' | 'category' | 'wallet' | 'type' | 'label'

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'none',     label: 'Sin agrupar' },
  { value: 'date',     label: 'Fecha' },
  { value: 'month',    label: 'Mes' },
  { value: 'category', label: 'Categoría' },
  { value: 'wallet',   label: 'Billetera' },
  { value: 'type',     label: 'Tipo' },
  { value: 'label',    label: 'Etiqueta' },
]

function getGroupKey(tx: TransactionWithDetails, g: GroupBy): string {
  switch (g) {
    case 'date':     return tx.date
    case 'month':    return tx.date.slice(0, 7)
    case 'category': return tx.category_name ?? 'Sin categoría'
    case 'wallet':   return tx.wallet_name ?? 'Sin billetera'
    case 'type':     return tx.type
    case 'label':    return tx.label ?? 'Sin etiqueta'
    default:         return '__all__'
  }
}

function getGroupLabel(key: string, g: GroupBy): string {
  switch (g) {
    case 'date':  return formatDate(key)
    case 'month': {
      const [y, m] = key.split('-')
      return new Date(+y, +m - 1, 1)
        .toLocaleString('es-AR', { month: 'long', year: 'numeric' })
        .replace(/^\w/, c => c.toUpperCase())
    }
    case 'type':  return key === 'income' ? 'Ingresos' : 'Gastos'
    default:      return key
  }
}

const TYPE_FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all',     label: 'Todos' },
  { value: 'income',  label: 'Ingresos' },
  { value: 'expense', label: 'Gastos' },
]

function Chip({ selected, onClick, children }: {
  selected: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all duration-150"
      style={selected
        ? { background: 'var(--grad-brand)', color: 'white', boxShadow: '0 2px 8px rgba(109,59,215,0.25)' }
        : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
      }
    >
      {children}
    </button>
  )
}

function RefundRow({
  refund,
  walletName,
  originalDescription,
  onCredit,
  onCancel,
  crediting,
}: {
  refund: Refund
  walletName: string
  originalDescription: string
  onCredit: () => void
  onCancel: () => void
  crediting: boolean
}) {
  const today = new Date().toISOString().split('T')[0]
  const isReady = !refund.expected_date || refund.expected_date <= today

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-colors"
      style={{ borderBottom: '1px solid var(--border-light)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'var(--income-50)', border: '1px solid var(--income-100)' }}
      >
        <RotateCcw size={13} style={{ color: 'var(--income-500)' }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {originalDescription}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          {refund.expected_date && (
            <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
              {isReady ? 'Listo para acreditar' : `Esperado: ${refund.expected_date}`}
            </span>
          )}
          {walletName && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}
            >
              → {walletName}
            </span>
          )}
          {refund.note && (
            <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
              {refund.note}
            </span>
          )}
        </div>
      </div>

      <div className="text-right mr-1 shrink-0">
        <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--income-600)' }}>
          +{formatCurrency(refund.amount, refund.currency)}
        </p>
      </div>

      <div className="flex gap-1 shrink-0">
        <button
          onClick={onCredit}
          disabled={crediting}
          title="Acreditar reintegro"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: 'var(--income-500)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--income-50)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          {crediting
            ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            : <CheckCircle size={14} />
          }
        </button>
        <button
          onClick={onCancel}
          title="Cancelar reintegro"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--expense-50)'; e.currentTarget.style.color = 'var(--expense-500)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <XCircle size={14} />
        </button>
      </div>
    </div>
  )
}

function TransactionsPageInner() {
  const { data: transactions, loading, refetch } = useTransactions()
  const { data: categories } = useCategories()
  const { data: wallets, refetch: refetchWallets } = useWallets()
  const { items: allRefunds, refetch: refetchRefunds } = useRefunds()
  const { addToast } = useToast()

  const searchParams = useSearchParams()

  const [period, setPeriod]               = useState<Period>('30_days')
  const [filterType, setFilterType]       = useState<FilterType>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterWallet, setFilterWallet]   = useState<string>('all')

  // Pre-select wallet filter from URL param (set by DiagnosticModal "Ver transacciones")
  useEffect(() => {
    const walletId = searchParams.get('wallet_id')
    // const type       = searchParams.get('type')        // futuro
    // const categoryId = searchParams.get('category_id') // futuro
    // const currency   = searchParams.get('currency')    // futuro
    // const from       = searchParams.get('from')        // futuro
    // const to         = searchParams.get('to')          // futuro
    // const search     = searchParams.get('search')      // futuro
    if (walletId) setFilterWallet(walletId)
  }, [searchParams])
  const [search, setSearch]               = useState('')
  const [modalOpen, setModalOpen]         = useState(false)
  const [editing, setEditing]             = useState<TransactionWithDetails | null>(null)
  const [deleting, setDeleting]           = useState<string | null>(null)
  const [chipScrolled, setChipScrolled]   = useState(false)
  const [chipHasMore, setChipHasMore]     = useState(false)
  const [creditingId, setCreditingId]     = useState<string | null>(null)
  const [selectMode, setSelectMode]       = useState(false)
  const [selected, setSelected]           = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting]   = useState(false)
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const [groupBy, setGroupBy]             = useState<GroupBy>('none')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [showLabelDropdown, setShowLabelDropdown] = useState(false)
  const [labelInput, setLabelInput]       = useState('')
  const chipRowRef                        = useRef<HTMLDivElement>(null)
  const chipDrag                          = useRef({ active: false, startX: 0, scrollX: 0 })

  function syncChipScroll(el: HTMLDivElement) {
    setChipScrolled(el.scrollLeft > 4)
    setChipHasMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    const el = chipRowRef.current
    if (el) syncChipScroll(el)
  }, [categories, wallets])

  const { start, end } = getDateRangeForPeriod(period)
  const filtered = useMemo(() =>
    transactions.filter(t => {
      const date = new Date(t.date)
      if (date < start || date > end) return false
      if (filterType !== 'all' && t.type !== filterType) return false
      if (filterCategory !== 'all' && t.category_id !== filterCategory) return false
      if (filterWallet !== 'all' && t.wallet_id !== filterWallet) return false
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }),
  [transactions, start.toISOString(), end.toISOString(), filterType, filterCategory, filterWallet, search])

  const totals = useMemo(() => {
    const income   = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expenses }
  }, [filtered])

  // Mapa txId → cantidad de reintegros pendientes (para badge en lista)
  const refundsByTx = useMemo(() => {
    const map = new Map<string, number>()
    allRefunds
      .filter(r => r.status === 'pending')
      .forEach(r => {
        if (r.original_transaction_id) {
          map.set(r.original_transaction_id, (map.get(r.original_transaction_id) ?? 0) + 1)
        }
      })
    return map
  }, [allRefunds])

  const pendingRefunds = useMemo(
    () => allRefunds.filter(r => r.status === 'pending'),
    [allRefunds]
  )

  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: '__all__', label: '', transactions: filtered }]
    const map = new Map<string, TransactionWithDetails[]>()
    for (const tx of filtered) {
      const key = getGroupKey(tx, groupBy)
      const arr = map.get(key) ?? []
      arr.push(tx)
      map.set(key, arr)
    }
    let entries = Array.from(map.entries())
    if (groupBy === 'type') entries.sort(([a]) => (a === 'income' ? -1 : 1))
    return entries.map(([key, txs]) => ({
      key,
      label: getGroupLabel(key, groupBy),
      transactions: txs,
    }))
  }, [filtered, groupBy])

  const existingLabels = useMemo(() => {
    const set = new Set<string>()
    transactions.forEach(tx => { if (tx.label) set.add(tx.label) })
    return Array.from(set).sort()
  }, [transactions])

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(tx: TransactionWithDetails) {
    setEditing(tx)
    setModalOpen(true)
  }

  async function deleteTransactionCore(id: string): Promise<void> {
    await refundService.cancelByTransaction(id)
    await transactionsService.delete(id)
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    const ids = transactions.map(t => t.id).filter((id): id is string => Boolean(id))
    if (selected.size === ids.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(ids))
    }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    const ids = Array.from(selected)
    let errors = 0
    for (const id of ids) {
      try {
        await deleteTransactionCore(id)
      } catch {
        errors++
      }
    }
    refetch()
    refetchWallets()
    refetchRefunds()
    setSelected(new Set())
    setSelectMode(false)
    setShowBulkConfirm(false)
    setBulkDeleting(false)
    if (errors > 0) {
      addToast(`${ids.length - errors} eliminadas, ${errors} con error`, 'error')
    } else {
      addToast(`${ids.length} transacción${ids.length !== 1 ? 'es' : ''} eliminada${ids.length !== 1 ? 's' : ''}`, 'info')
    }
  }

  function changeGroupBy(g: GroupBy) {
    setGroupBy(g)
    setExpandedGroups(new Set())
  }

  function toggleGroupExpand(key: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function getGroupSelectState(txs: TransactionWithDetails[]): 'all' | 'some' | 'none' {
    const ids = txs.map(t => t.id).filter(Boolean) as string[]
    const n = ids.filter(id => selected.has(id)).length
    if (n === 0) return 'none'
    if (n === ids.length) return 'all'
    return 'some'
  }

  function toggleGroupSelect(txs: TransactionWithDetails[]) {
    const ids = txs.map(t => t.id).filter((id): id is string => Boolean(id))
    setSelected(prev => {
      const next = new Set(prev)
      const allSelected = ids.every(id => next.has(id))
      if (allSelected) ids.forEach(id => next.delete(id))
      else             ids.forEach(id => next.add(id))
      return next
    })
  }

  async function handleAssignLabel(label: string | null) {
    const ids = Array.from(selected).filter(Boolean)
    if (!ids.length) return
    try {
      await transactionsService.assignLabel(ids, label)
      refetch()
      addToast(label ? `Etiqueta "${label}" asignada` : 'Etiqueta quitada', 'success')
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Error al asignar etiqueta', 'error')
    } finally {
      setShowLabelDropdown(false)
      setLabelInput('')
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      // Cancelar reintegros pendientes antes de borrar
      const { cancelled } = await refundService.cancelByTransaction(id)
      if (cancelled > 0) {
        addToast(`Se cancelaron ${cancelled} reintegro(s) pendiente(s)`, 'info')
      }

      // El RPC elimina la transacción + transacciones de reintegros acreditados atómicamente
      await transactionsService.delete(id)
      refetch()
      refetchWallets()
      refetchRefunds()
      addToast('Transacción eliminada', 'info')
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Error al eliminar', 'error')
    } finally {
      setDeleting(null)
    }
  }

  async function handleCreditRefund(refund: Refund) {
    if (!refund.destination_wallet_id) {
      addToast('Este reintegro no tiene billetera de destino configurada', 'error')
      return
    }
    setCreditingId(refund.id)
    try {
      await refundService.creditAtomic({ refundId: refund.id })

      addToast(`Reintegro de ${formatCurrency(refund.amount, refund.currency)} acreditado`, 'success')
      refetch()
      refetchWallets()
      refetchRefunds()
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Error al acreditar', 'error')
    } finally {
      setCreditingId(null)
    }
  }

  async function handleCancelRefund(refund: Refund) {
    try {
      await refundService.cancel(refund.id)
      refetchRefunds()
      addToast('Reintegro cancelado', 'info')
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Error al cancelar', 'error')
    }
  }

  const walletMap       = useMemo(() => new Map(wallets.map(w => [w.id!, w.name])), [wallets])
  const txDescMap       = useMemo(() => new Map(transactions.map(t => [t.id!, t.description])), [transactions])
  const periodLabel     = PERIOD_OPTIONS.find(p => p.value === period)?.label ?? ''

  return (
    <div className="p-5 md:p-7 max-w-5xl mx-auto space-y-5 animate-fade-in">

      {/* ── Compact header ── */}
      <div
        className="rounded-2xl px-5 py-4 flex items-center gap-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)',
          boxShadow: '0 8px 24px -6px rgba(109,59,215,0.30)',
        }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 400 72">
            <circle cx="370" cy="-10" r="70" fill="white" />
            <circle cx="10"  cy="80"  r="45" fill="white" />
          </svg>
        </div>

        <div className="relative z-10 flex-1 min-w-0">
          <h1
            className="text-xl font-black tracking-tight leading-none"
            style={{ color: 'rgba(255,255,255,0.96)', fontFamily: 'var(--font-sora)' }}
          >
            Transacciones
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {filtered.length} movimientos · {periodLabel}
          </p>
        </div>

        <div className="relative z-10 shrink-0 flex gap-2">
          <HelpButton section="transactions" />
          <button
            onClick={() => { setSelectMode(m => !m); setSelected(new Set()) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all duration-150"
            style={{
              background: selectMode ? 'rgba(255,255,255,0.25)' : 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              color: 'rgba(255,255,255,0.90)',
            }}
          >
            {selectMode ? 'Cancelar' : 'Seleccionar'}
          </button>
          <button
            onClick={openCreate}
            className="hero-btn hero-btn-primary"
          >
            <Plus size={14} />
            Nueva transacción
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-2xl p-4 flex items-center gap-3 transition-all duration-150"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = '' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--income-50)', border: '1px solid var(--income-100)' }}
            >
              <ArrowUpRight size={16} style={{ color: 'var(--income-500)' }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Ingresos</p>
              <p className="text-base font-extrabold tabular-nums leading-tight" style={{ color: 'var(--income-600)' }}>
                +{formatCurrency(totals.income, 'ARS')}
              </p>
            </div>
          </div>

          <div
            className="rounded-2xl p-4 flex items-center gap-3 transition-all duration-150"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = '' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--expense-50)', border: '1px solid var(--expense-100)' }}
            >
              <ArrowDownRight size={16} style={{ color: 'var(--expense-500)' }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Gastos</p>
              <p className="text-base font-extrabold tabular-nums leading-tight" style={{ color: 'var(--expense-600)' }}>
                −{formatCurrency(totals.expenses, 'ARS')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-faint)' }}
            />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar transacciones…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 focus:outline-none placeholder:text-[var(--text-faint)]"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-xs)',
              }}
              onMouseEnter={e => {
                if (document.activeElement !== e.currentTarget)
                  e.currentTarget.style.borderColor = 'var(--text-faint)'
              }}
              onMouseLeave={e => {
                if (document.activeElement !== e.currentTarget)
                  e.currentTarget.style.borderColor = 'var(--border)'
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--brand-400)'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(109,59,215,0.10), var(--shadow-xs)'
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.boxShadow = 'var(--shadow-xs)'
              }}
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {PERIOD_OPTIONS.map(opt => (
              <Chip key={opt.value} selected={period === opt.value} onClick={() => setPeriod(opt.value)}>
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-1">
          <button
            onClick={() => chipRowRef.current?.scrollBy({ left: -140, behavior: 'smooth' })}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-all duration-150"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
              color: 'var(--text-muted)',
              opacity: chipScrolled ? 1 : 0,
              pointerEvents: chipScrolled ? 'auto' : 'none',
            }}
          >
            <ChevronLeft size={13} />
          </button>

          <div
            ref={chipRowRef}
            className="flex gap-1.5 overflow-x-auto pb-0.5 flex-1"
            style={{ scrollbarWidth: 'none', cursor: chipDrag.current.active ? 'grabbing' : 'grab' }}
            onScroll={e => syncChipScroll(e.currentTarget)}
            onWheel={e => { if (chipRowRef.current) chipRowRef.current.scrollLeft += e.deltaY }}
            onMouseDown={e => {
              chipDrag.current = { active: true, startX: e.pageX, scrollX: chipRowRef.current!.scrollLeft }
              e.currentTarget.style.cursor = 'grabbing'
            }}
            onMouseMove={e => {
              if (!chipDrag.current.active) return
              e.currentTarget.scrollLeft = chipDrag.current.scrollX - (e.pageX - chipDrag.current.startX)
            }}
            onMouseUp={e => { chipDrag.current.active = false; e.currentTarget.style.cursor = 'grab' }}
            onMouseLeave={e => { chipDrag.current.active = false; e.currentTarget.style.cursor = 'grab' }}
          >
            {TYPE_FILTERS.map(opt => (
              <Chip key={opt.value} selected={filterType === opt.value} onClick={() => setFilterType(opt.value)}>
                {opt.label}
              </Chip>
            ))}

            {categories.length > 0 && (
              <div className="w-px self-stretch mx-0.5 shrink-0" style={{ background: 'var(--border)' }} />
            )}

            {categories.map(c => (
              <Chip
                key={c.id}
                selected={filterCategory === c.id}
                onClick={() => setFilterCategory(filterCategory === c.id ? 'all' : c.id!)}
              >
                {c.name}
              </Chip>
            ))}

            {wallets.length > 1 && (
              <>
                <div className="w-px self-stretch mx-0.5 shrink-0" style={{ background: 'var(--border)' }} />
                {wallets.map(w => (
                  <Chip
                    key={w.id}
                    selected={filterWallet === w.id}
                    onClick={() => setFilterWallet(filterWallet === w.id ? 'all' : w.id!)}
                  >
                    {w.name}
                  </Chip>
                ))}
              </>
            )}
          </div>

          <button
            onClick={() => chipRowRef.current?.scrollBy({ left: 140, behavior: 'smooth' })}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-all duration-150"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
              color: 'var(--text-muted)',
              opacity: chipHasMore ? 1 : 0,
              pointerEvents: chipHasMore ? 'auto' : 'none',
            }}
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* ── Agrupar por (siempre visible) ── */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs font-medium" style={{ color: 'var(--text-faint)' }}>Agrupar por</span>
        <select
          value={groupBy}
          onChange={e => changeGroupBy(e.target.value as GroupBy)}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer focus:outline-none"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          {GROUP_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* ── Bulk action bar ── */}
      {selectMode && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl flex-wrap"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
        >
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {selected.size} seleccionada{selected.size !== 1 ? 's' : ''}
          </span>
          <button
            onClick={selectAll}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-faint)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            {selected.size === transactions.length && transactions.length > 0
              ? 'Deseleccionar todas'
              : `Seleccionar todas (${transactions.length})`
            }
          </button>
          {selected.size > 0 && (
            <div className="ml-auto flex items-center gap-2">
              {/* Asignar etiqueta */}
              <div className="relative">
                <button
                  onClick={() => setShowLabelDropdown(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-400)'; e.currentTarget.style.color = 'var(--brand-500)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  <Tag size={12} />
                  Asignar etiqueta
                </button>
                {showLabelDropdown && (
                  <div
                    className="absolute bottom-full mb-1.5 left-0 z-20 rounded-xl p-2 min-w-52"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
                  >
                    <form
                      onSubmit={e => {
                        e.preventDefault()
                        const v = labelInput.trim()
                        if (v) handleAssignLabel(v)
                      }}
                    >
                      <input
                        value={labelInput}
                        onChange={e => setLabelInput(e.target.value)}
                        placeholder="Nueva etiqueta…"
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg mb-1 outline-none"
                        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        autoFocus
                      />
                    </form>
                    <button
                      onClick={() => handleAssignLabel(null)}
                      className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <Tag size={10} style={{ color: 'var(--text-faint)' }} />
                      Sin etiqueta
                    </button>
                    {existingLabels.length > 0 && (
                      <div style={{ borderTop: '1px solid var(--border-light)', margin: '4px 0' }} />
                    )}
                    {existingLabels.map(lbl => (
                      <button
                        key={lbl}
                        onClick={() => handleAssignLabel(lbl)}
                        className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                        style={{ color: 'var(--text-primary)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <Tag size={10} style={{ color: 'var(--brand-400)' }} />
                        {lbl}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Eliminar */}
              <button
                onClick={() => setShowBulkConfirm(true)}
                disabled={bulkDeleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                style={{ background: 'var(--expense-500)', color: 'white', opacity: bulkDeleting ? 0.6 : 1 }}
              >
                <Trash2 size={12} />
                Eliminar {selected.size} seleccionada{selected.size !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Transaction list ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        {loading ? (
          <div className="p-12 text-center" style={{ color: 'var(--text-muted)' }}>
            <div className="w-7 h-7 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
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
            {groups.map(group => {
              const isGrouped       = groupBy !== 'none'
              const isExpanded      = !isGrouped || expandedGroups.has(group.key)
              const groupIncome     = group.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
              const groupExpense    = group.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
              const groupBalance    = groupIncome - groupExpense
              const selectState     = isGrouped && selectMode ? getGroupSelectState(group.transactions) : 'none'
              const selectedInGroup = isGrouped && selectMode ? group.transactions.filter(t => t.id && selected.has(t.id)).length : 0
              return (
                <Fragment key={group.key}>
                  {/* ── Cabecera de grupo (acordeón) ── */}
                  {isGrouped && (
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                      style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}
                      onClick={() => toggleGroupExpand(group.key)}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-base)')}
                    >
                      {/* Checkbox de grupo — solo en selectMode */}
                      {selectMode && (
                        <button
                          onClick={e => { e.stopPropagation(); toggleGroupSelect(group.transactions) }}
                          className="w-6 h-6 flex items-center justify-center shrink-0 rounded-md transition-colors"
                          style={{ color: selectState === 'all' ? 'var(--brand-500)' : selectState === 'some' ? 'var(--brand-400)' : 'var(--text-muted)' }}
                        >
                          {selectState === 'all'
                          ? <CheckSquare size={20} />
                          : selectState === 'some'
                            ? <MinusSquare size={20} />
                            : <Square size={20} />
                        }
                        </button>
                      )}

                      {/* Nombre + contador */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                            {group.label}
                          </span>
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}
                          >
                            {group.transactions.length} mov.
                            {selectState === 'some' && ` · ${selectedInGroup} sel.`}
                          </span>
                        </div>
                      </div>

                      {/* Balance neto */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className="text-sm font-bold tabular-nums"
                          style={{ color: groupBalance >= 0 ? 'var(--income-600)' : 'var(--expense-600)' }}
                        >
                          {groupBalance >= 0 ? '+' : '−'}{formatCurrency(Math.abs(groupBalance), 'ARS')}
                        </span>
                        <ChevronDown
                          size={15}
                          className="transition-transform duration-200 shrink-0"
                          style={{
                            color: 'var(--text-muted)',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* ── Filas del grupo ── */}
                  {isExpanded && group.transactions.map((tx, i) => {
                    const isSelected = Boolean(tx.id && selected.has(tx.id))
                    const isLast = i === group.transactions.length - 1
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center gap-3 px-4 py-3 group transition-colors"
                        style={{
                          borderBottom: isLast ? (isGrouped ? '1px solid var(--border)' : 'none') : '1px solid var(--border-light)',
                          background: isSelected ? 'rgba(109,59,215,0.05)' : 'transparent',
                          cursor: selectMode ? 'pointer' : 'default',
                        }}
                        onClick={selectMode && tx.id ? () => { toggleSelect(tx.id!); setShowLabelDropdown(false) } : undefined}
                        onMouseEnter={e => (e.currentTarget.style.background = isSelected ? 'rgba(109,59,215,0.08)' : 'var(--bg-subtle)')}
                        onMouseLeave={e => (e.currentTarget.style.background = isSelected ? 'rgba(109,59,215,0.05)' : 'transparent')}
                      >
                        {selectMode && (
                          <button
                            onClick={e => { e.stopPropagation(); tx.id && toggleSelect(tx.id); setShowLabelDropdown(false) }}
                            className="w-6 h-6 flex items-center justify-center shrink-0 transition-colors rounded-md"
                            style={{ color: isSelected ? 'var(--brand-500)' : 'var(--text-muted)' }}
                          >
                            {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                          </button>
                        )}
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: tx.type === 'income' ? 'var(--income-50)' : 'var(--expense-50)' }}
                        >
                          {tx.type === 'income'
                            ? <TrendingUp size={15} style={{ color: 'var(--income-500)' }} />
                            : <TrendingDown size={15} style={{ color: 'var(--expense-500)' }} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {tx.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{formatDate(tx.date)}</span>
                            {tx.category_name && <CategoryBadge name={tx.category_name} color={tx.category_color} />}
                            {tx.wallet_name && (
                              <span
                                className="text-xs font-medium px-1.5 py-0.5 rounded-md"
                                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}
                              >
                                {tx.wallet_name}
                              </span>
                            )}
                            {tx.label && (
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                                style={{ background: 'rgba(109,59,215,0.10)', color: 'var(--brand-500)', border: '1px solid rgba(109,59,215,0.20)' }}
                              >
                                <Tag size={8} />
                                {tx.label}
                              </span>
                            )}
                            {tx.id && refundsByTx.has(tx.id) && (
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                                style={{ background: 'var(--income-50)', color: 'var(--income-600)', border: '1px solid var(--income-100)' }}
                              >
                                <RotateCcw size={8} />
                                Reintegro pendiente
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right mr-1 shrink-0">
                          <p
                            className="text-sm font-bold tabular-nums"
                            style={{ color: tx.type === 'income' ? 'var(--income-600)' : 'var(--expense-600)' }}
                          >
                            {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount, tx.currency)}
                          </p>
                          <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-faint)' }}>
                            {tx.currency}
                          </p>
                        </div>
                        {!selectMode && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => openEdit(tx)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                              style={{ color: 'var(--text-muted)' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-50)'; e.currentTarget.style.color = 'var(--brand-500)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => tx.id && handleDelete(tx.id)}
                              disabled={deleting === tx.id}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                              style={{ color: 'var(--text-muted)' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--expense-50)'; e.currentTarget.style.color = 'var(--expense-500)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                            >
                              {deleting === tx.id
                                ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                : <Trash2 size={13} />
                              }
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </Fragment>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Panel de reintegros pendientes ── */}
      {pendingRefunds.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: '1px solid var(--border-light)' }}
          >
            <div className="flex items-center gap-2">
              <RotateCcw size={14} style={{ color: 'var(--income-500)' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Reintegros pendientes
              </span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--income-50)', color: 'var(--income-600)', border: '1px solid var(--income-100)' }}
              >
                {pendingRefunds.length}
              </span>
            </div>
            <p className="text-xs font-semibold tabular-nums" style={{ color: 'var(--income-600)' }}>
              Total esperado: +{formatCurrency(
                pendingRefunds.reduce((s, r) => s + r.amount, 0),
                pendingRefunds[0]?.currency ?? 'ARS'
              )}
            </p>
          </div>

          {pendingRefunds.map(refund => (
            <RefundRow
              key={refund.id}
              refund={refund}
              walletName={walletMap.get(refund.destination_wallet_id ?? '') ?? ''}
              originalDescription={txDescMap.get(refund.original_transaction_id ?? '') ?? 'Gasto original'}
              onCredit={() => handleCreditRefund(refund)}
              onCancel={() => handleCancelRefund(refund)}
              crediting={creditingId === refund.id}
            />
          ))}
        </div>
      )}

      {/* ── Bulk delete confirmation ── */}
      <Modal
        open={showBulkConfirm}
        onClose={() => { if (!bulkDeleting) setShowBulkConfirm(false) }}
        title={`Eliminar ${selected.size} transacción${selected.size !== 1 ? 'es' : ''}`}
      >
        <div className="space-y-4">
          <div
            className="flex items-start gap-3 p-3 rounded-xl"
            style={{ background: 'var(--expense-50)', border: '1px solid var(--expense-100)' }}
          >
            <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--expense-500)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--expense-700)' }}>
              Esta acción eliminará {selected.size} transacción{selected.size !== 1 ? 'es' : ''} de forma permanente y no se puede deshacer.
            </p>
          </div>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {[
              'Los balances de billeteras serán actualizados',
              'Los objetivos vinculados serán recalculados',
              'Los presupuestos y estadísticas cambiarán',
              'Los reintegros pendientes serán cancelados',
              'Los reintegros ya acreditados permanecerán en el historial',
            ].map(item => (
              <li key={item} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--text-muted)' }} />
                {item}
              </li>
            ))}
          </ul>
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setShowBulkConfirm(false)}
              disabled={bulkDeleting}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center gap-2"
              style={{ background: 'var(--expense-500)', color: 'white', opacity: bulkDeleting ? 0.7 : 1 }}
            >
              {bulkDeleting
                ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Eliminando…</>
                : `Eliminar ${selected.size} transacción${selected.size !== 1 ? 'es' : ''}`
              }
            </button>
          </div>
        </div>
      </Modal>

      <NewTransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { refetch(); refetchWallets(); refetchRefunds() }}
        wallets={wallets}
        categories={categories}
        editing={editing}
      />
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={null}>
      <TransactionsPageInner />
    </Suspense>
  )
}
