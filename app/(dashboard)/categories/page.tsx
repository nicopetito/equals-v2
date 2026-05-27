'use client'

import { useState, useMemo } from 'react'
import {
  Plus, Pencil, Trash2, Tag, Search, X, type LucideIcon,
  Utensils, Car, HeartPulse, Clapperboard, Shirt, Home,
  BookOpen, Zap, MoreHorizontal, Briefcase, Laptop, TrendingUp,
  PlusCircle, ShoppingBag, Plane, Coffee, Music, Dumbbell,
  Gift, CreditCard, PiggyBank, Building2, Baby,
} from 'lucide-react'
import { useCategories } from '@/hooks/useCategories'
import { categoriesService } from '@/services/categories.service'
import { useToast } from '@/components/providers/ToastProvider'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { HelpButton } from '@/components/help/HelpButton'
import { Input } from '@/components/ui/Input'
import type { Category } from '@/types'

// ── Icon registry ──────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
  'utensils':        Utensils,
  'car':             Car,
  'heart-pulse':     HeartPulse,
  'clapperboard':    Clapperboard,
  'shirt':           Shirt,
  'home':            Home,
  'book-open':       BookOpen,
  'zap':             Zap,
  'more-horizontal': MoreHorizontal,
  'briefcase':       Briefcase,
  'laptop':          Laptop,
  'trending-up':     TrendingUp,
  'plus-circle':     PlusCircle,
  'shopping-bag':    ShoppingBag,
  'plane':           Plane,
  'coffee':          Coffee,
  'music':           Music,
  'dumbbell':        Dumbbell,
  'gift':            Gift,
  'credit-card':     CreditCard,
  'piggy-bank':      PiggyBank,
  'building-2':      Building2,
  'baby':            Baby,
  'tag':             Tag,
}
const ICON_LIST = Object.entries(ICON_MAP)

function CategoryIcon({ icon, color, size = 16 }: { icon?: string; color?: string; size?: number }) {
  const Icon: LucideIcon = icon ? (ICON_MAP[icon] ?? Tag) : Tag
  return <Icon size={size} style={{ color: color ?? 'var(--text-muted)' }} />
}

// ── Color presets ──────────────────────────────────────────────────────────────
const COLOR_PRESETS = [
  '#6d3bd7','#8b5cf6','#ec4899','#f43f5e','#ef4444',
  '#f97316','#f59e0b','#10b981','#14b8a6','#22c55e',
  '#0ea5e9','#3b82f6','#64748b','#334155',
]

type FilterType = 'all' | 'income' | 'expense'

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const { data: categories, loading, refetch } = useCategories()
  const { addToast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Category | null>(null)
  const [form, setForm]           = useState<Partial<Category>>({ type: 'expense', color: '#6d3bd7', icon: 'tag' })
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState<FilterType>('all')

  // ── Derived data ──────────────────────────────────────────────────────────────
  const totalIncome  = useMemo(() => categories.filter(c => c.type === 'income').length,  [categories])
  const totalExpense = useMemo(() => categories.filter(c => c.type === 'expense').length, [categories])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return categories.filter(c => {
      const matchType   = filter === 'all' || c.type === filter
      const matchSearch = !q || c.name.toLowerCase().includes(q)
      return matchType && matchSearch
    })
  }, [categories, filter, search])

  const incomeList  = filtered.filter(c => c.type === 'income')
  const expenseList = filtered.filter(c => c.type === 'expense')

  // Which sections to render — never show a section the user filtered away
  const showIncome  = filter === 'all' || filter === 'income'
  const showExpense = filter === 'all' || filter === 'expense'

  // ── CRUD ──────────────────────────────────────────────────────────────────────
  function openCreate(defaultType?: Category['type']) {
    setEditing(null)
    setForm({ type: defaultType ?? 'expense', color: '#6d3bd7', icon: 'tag' })
    setError(null)
    setModalOpen(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setForm({ ...cat })
    setError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name?.trim()) { setError('El nombre es obligatorio.'); return }
    setSaving(true); setError(null)
    try {
      if (editing?.id) {
        await categoriesService.update(editing.id, form as Partial<Category>)
        addToast('Categoría actualizada', 'success')
      } else {
        await categoriesService.create(form as Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
        addToast('Categoría creada', 'success')
      }
      setModalOpen(false)
      refetch()
    } catch {
      setError('Error al guardar.')
      addToast('Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const budgetCount = await categoriesService.getBudgetCount(id)
      if (budgetCount > 0) {
        const ok = window.confirm(
          `Esta categoría tiene ${budgetCount} presupuesto${budgetCount > 1 ? 's' : ''} asociado${budgetCount > 1 ? 's' : ''} que también se eliminarán. ¿Continuar?`
        )
        if (!ok) { setDeleting(null); return }
      }
      await categoriesService.delete(id)
      refetch()
      addToast('Categoría eliminada', 'info')
    } finally {
      setDeleting(null)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function emptyMessage(type: 'income' | 'expense') {
    if (search) return { title: 'Sin resultados', desc: `No se encontraron categorías con "${search}".` }
    return type === 'income'
      ? { title: 'No hay categorías de ingresos', desc: 'Creá una para registrar tus fuentes de ingreso.' }
      : { title: 'No hay categorías de gastos',   desc: 'Creá una para organizar en qué gastás tu dinero.' }
  }

  function renderGrid(items: Category[]) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
        {items.map(cat => {
          const c        = cat.color ?? '#6d3bd7'
          const isIncome = cat.type === 'income'
          return (
            <div
              key={cat.id}
              className="group rounded-xl flex items-center gap-2.5 px-3 py-2.5 transition-all duration-200"
              style={{
                background:  'var(--bg-card)',
                border:      '1px solid var(--border)',
                boxShadow:   'var(--shadow-xs)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform    = 'translateY(-1px)'
                e.currentTarget.style.boxShadow   = 'var(--shadow-sm)'
                e.currentTarget.style.borderColor = `${c}38`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform    = 'translateY(0)'
                e.currentTarget.style.boxShadow   = 'var(--shadow-xs)'
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
            >
              {/* Icon */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${c}15`, border: `1px solid ${c}22` }}
              >
                <CategoryIcon icon={cat.icon} color={c} size={15} />
              </div>

              {/* Name + type */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {cat.name}
                </p>
                <p
                  className="text-[10px] font-semibold mt-0.5 leading-none"
                  style={{ color: isIncome ? 'var(--income-500)' : 'var(--expense-500)' }}
                >
                  {isIncome ? '↑ Ingreso' : '↓ Gasto'}
                </p>
              </div>

              {/* Actions — appear on hover */}
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => openEdit(cat)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: 'var(--text-faint)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-50)'; e.currentTarget.style.color = 'var(--brand-500)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)' }}
                  title="Editar"
                >
                  <Pencil size={11} />
                </button>
                <button
                  onClick={() => cat.id && handleDelete(cat.id)}
                  disabled={deleting === cat.id}
                  className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: 'var(--text-faint)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--expense-50)'; e.currentTarget.style.color = 'var(--expense-500)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)' }}
                  title="Eliminar"
                >
                  {deleting === cat.id
                    ? <span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                    : <Trash2 size={11} />
                  }
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  function renderSection(type: 'income' | 'expense', items: Category[]) {
    const isIncome   = type === 'income'
    const accent     = isIncome ? 'var(--income-600)' : 'var(--expense-600)'
    const accentBg   = isIncome ? 'var(--income-50)'  : 'var(--expense-50)'
    const accentBord = isIncome ? 'var(--income-100)' : 'var(--expense-100)'
    const title      = isIncome ? 'Ingresos' : 'Gastos'
    const { title: emptyTitle, desc: emptyDesc } = emptyMessage(type)

    return (
      <section key={type}>
        {/* Section label */}
        <div className="flex items-center gap-3 mb-3">
          <span
            className="text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full"
            style={{ background: accentBg, color: accent, border: `1px solid ${accentBord}` }}
          >
            {title}
          </span>
          <span className="text-xs font-medium" style={{ color: 'var(--text-faint)' }}>
            {items.length} {items.length === 1 ? 'categoría' : 'categorías'}
          </span>
          <div className="flex-1 h-px" style={{ background: 'var(--border-light)' }} />
        </div>

        {items.length === 0 ? (
          <div
            className="rounded-xl py-8 px-4 text-center"
            style={{ background: 'var(--bg-subtle)', border: '1px dashed var(--border)' }}
          >
            <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
              {emptyTitle}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{emptyDesc}</p>
          </div>
        ) : (
          renderGrid(items)
        )}
      </section>
    )
  }

  // ── JSX ───────────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 md:p-7 max-w-5xl mx-auto space-y-4 animate-fade-in">

      {/* ── Hero compact ──────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)',
          boxShadow:  '0 8px 24px -6px rgba(109,59,215,0.35)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 85% 50%, rgba(255,255,255,0.10) 0%, transparent 60%)' }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none opacity-10">
          <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1000 56">
            <path d="M0,36 Q250,8 500,30 T1000,18 L1000,56 L0,56 Z" fill="white" />
          </svg>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.22)' }}
          >
            <Tag size={16} style={{ color: 'rgba(255,255,255,0.92)' }} />
          </div>
          <div>
            <h1
              className="text-xl font-black tracking-tight leading-none"
              style={{ color: 'rgba(255,255,255,0.96)', fontFamily: 'var(--font-sora)' }}
            >
              Categorías
            </h1>
            <p className="text-[11px] font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.56)' }}>
              {loading ? 'Cargando…' : `${categories.length} categorías · organizá tus finanzas`}
            </p>
          </div>
        </div>

        <div className="relative z-10 shrink-0 flex gap-2">
          <HelpButton section="categories" />
          <button
            onClick={() => openCreate()}
            className="hero-btn hero-btn-primary"
          >
            <Plus size={14} /> Nueva categoría
          </button>
        </div>
      </div>

      {/* ── Stats inline strip ────────────────────────────────────────────────────── */}
      {!loading && (
        <div
          className="flex items-center gap-4 px-4 py-2.5 rounded-xl flex-wrap"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
        >
          <span className="flex items-center gap-1.5 text-sm">
            <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>{categories.length}</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>categorías</span>
          </span>
          <span className="w-px h-3.5 shrink-0" style={{ background: 'var(--border)' }} />
          <span className="flex items-center gap-1.5 text-sm">
            <strong style={{ color: 'var(--income-600)', fontFamily: 'var(--font-sora)' }}>{totalIncome}</strong>
            <span style={{ color: 'var(--income-500)', fontSize: 12 }}>ingresos</span>
          </span>
          <span className="w-px h-3.5 shrink-0" style={{ background: 'var(--border)' }} />
          <span className="flex items-center gap-1.5 text-sm">
            <strong style={{ color: 'var(--expense-600)', fontFamily: 'var(--font-sora)' }}>{totalExpense}</strong>
            <span style={{ color: 'var(--expense-500)', fontSize: 12 }}>gastos</span>
          </span>
        </div>
      )}

      {/* ── Filter + search ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Pill filters */}
        <div
          className="flex gap-1 p-1 rounded-xl shrink-0"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {(['all', 'income', 'expense'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={filter === f
                ? { background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)', color: 'white', boxShadow: '0 2px 8px rgba(109,59,215,0.28)' }
                : { color: 'var(--text-muted)' }
              }
            >
              {f === 'all' ? 'Todas' : f === 'income' ? 'Ingresos' : 'Gastos'}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative flex-1 min-w-[180px]">
          <Search
            size={13}
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: 12, color: 'var(--text-faint)' }}
          />
          <input
            type="text"
            placeholder="Buscar categoría…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full py-2 text-sm rounded-xl transition-all outline-none"
            style={{
              paddingLeft:  36,
              paddingRight: search ? 32 : 12,
              background:   'var(--bg-card)',
              border:       '1px solid var(--border)',
              color:        'var(--text-primary)',
              fontFamily:   'inherit',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--brand-500)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-colors"
              style={{ right: 8, color: 'var(--text-faint)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-14 text-center" style={{ color: 'var(--text-muted)' }}>
          <div className="w-7 h-7 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium">Cargando categorías…</p>
        </div>
      ) : categories.length === 0 ? (
        <div
          className="rounded-2xl py-14 px-4 text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div
            className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'var(--brand-50)' }}
          >
            <Tag size={20} style={{ color: 'var(--brand-500)' }} />
          </div>
          <p className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
            Sin categorías
          </p>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
            Las categorías organizan tus movimientos y mejoran la precisión de tus presupuestos, reportes y estadísticas.
          </p>
          <Button onClick={() => openCreate()} size="sm">
            <Plus size={14} /> Nueva categoría
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {showIncome  && renderSection('income',  incomeList)}
          {showExpense && renderSection('expense', expenseList)}
        </div>
      )}

      {/* ── Modal ────────────────────────────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
        size="md"
      >
        <div className="space-y-4">
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm font-medium"
              style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}
            >
              {error}
            </div>
          )}

          <Input
            label="Nombre de la categoría"
            value={form.name ?? ''}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Alimentación, Transporte, Sueldo…"
            required
          />

          {/* Tipo */}
          <div>
            <label className="text-sm font-semibold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Tipo
            </label>
            <div className="flex gap-2">
              {(['expense', 'income'] as Category['type'][]).map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, type: t }))}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all"
                  style={form.type === t
                    ? t === 'income'
                      ? { background: 'var(--income-50)',  color: 'var(--income-600)',  border: '2px solid var(--income-500)' }
                      : { background: 'var(--expense-50)', color: 'var(--expense-600)', border: '2px solid var(--expense-500)' }
                    : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '2px solid transparent' }
                  }
                >
                  {t === 'income' ? '↑ Ingreso' : '↓ Gasto'}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-sm font-semibold block mb-2" style={{ color: 'var(--text-primary)' }}>
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map(color => (
                <button
                  key={color}
                  onClick={() => setForm(f => ({ ...f, color }))}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    backgroundColor: color,
                    transform:  form.color === color ? 'scale(1.25)' : 'scale(1)',
                    boxShadow:  form.color === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <div>
            <label className="text-sm font-semibold block mb-2" style={{ color: 'var(--text-primary)' }}>
              Ícono
            </label>
            <div
              className="grid p-2.5 rounded-xl gap-1"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(38px, 1fr))',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-light)',
              }}
            >
              {ICON_LIST.map(([key, IconComp]) => {
                const selected  = form.icon === key
                const selColor  = form.color ?? '#6d3bd7'
                return (
                  <button
                    key={key}
                    onClick={() => setForm(f => ({ ...f, icon: key }))}
                    title={key}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                    style={selected
                      ? { background: `${selColor}20`, border: `2px solid ${selColor}`, color: selColor, transform: 'scale(1.08)' }
                      : { background: 'var(--bg-card)', border: '2px solid transparent', color: 'var(--text-muted)' }
                    }
                    onMouseEnter={e => { if (!selected) e.currentTarget.style.color = 'var(--text-secondary)' }}
                    onMouseLeave={e => { if (!selected) e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    <IconComp size={16} />
                  </button>
                )
              })}
            </div>

            {/* Preview */}
            {form.icon && (
              <div
                className="mt-2.5 flex items-center gap-2.5 px-3 py-2 rounded-xl"
                style={{ background: 'var(--bg-subtle)' }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${form.color ?? '#6d3bd7'}20`, border: `1.5px solid ${form.color ?? '#6d3bd7'}30` }}
                >
                  <CategoryIcon icon={form.icon} color={form.color} size={15} />
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {form.name?.trim() || 'Sin nombre'}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>Vista previa</p>
                </div>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editing ? 'Guardar cambios' : 'Crear categoría'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
