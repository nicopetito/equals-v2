'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { useCategories } from '@/hooks/useCategories'
import { categoriesService } from '@/services/categories.service'
import { useToast } from '@/components/providers/ToastProvider'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Category } from '@/types'

const COLOR_PRESETS = [
  '#6366F1','#8B5CF6','#EC4899','#F43F5E','#F97316',
  '#F59E0B','#10B981','#14B8A6','#0EA5E9','#3B82F6',
  '#6B7280','#334155',
]

export default function CategoriesPage() {
  const { data: categories, loading, refetch } = useCategories()
  const { addToast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Category | null>(null)
  const [form, setForm]           = useState<Partial<Category>>({ type: 'expense', color: '#6366F1' })
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)

  const income  = categories.filter(c => c.type === 'income')
  const expense = categories.filter(c => c.type === 'expense')

  function openCreate(defaultType?: Category['type']) {
    setEditing(null)
    setForm({ type: defaultType ?? 'expense', color: '#6366F1' })
    setError(null)
    setModalOpen(true)
  }
  function openEdit(cat: Category) { setEditing(cat); setForm({ ...cat }); setError(null); setModalOpen(true) }

  async function handleSave() {
    if (!form.name) { setError('El nombre es obligatorio.'); return }
    setSaving(true); setError(null)
    try {
      if (editing?.id) {
        await categoriesService.update(editing.id, form as Partial<Category>)
        addToast('Categoría actualizada', 'success')
      } else {
        await categoriesService.create(form as Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
        addToast('Categoría creada', 'success')
      }
      setModalOpen(false); refetch()
    } catch {
      setError('Error al guardar.')
      addToast('Error al guardar', 'error')
    }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try { await categoriesService.delete(id); refetch(); addToast('Categoría eliminada', 'info') }
    finally { setDeleting(null) }
  }

  function CategoryGroup({
    title, items, type,
  }: { title: string; items: Category[]; type: 'income' | 'expense' }) {
    const isIncome = type === 'income'
    const color    = isIncome ? 'var(--income-600)' : 'var(--expense-600)'
    const bg       = isIncome ? 'var(--income-50)'  : 'var(--expense-50)'
    const border   = isIncome ? 'var(--income-100)' : 'var(--expense-100)'

    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        {/* Header de grupo */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-light)' }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="px-3 py-1 text-xs font-extrabold rounded-full"
              style={{ background: bg, color, border: `1px solid ${border}` }}
            >
              {title}
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {items.length} {items.length === 1 ? 'categoría' : 'categorías'}
            </span>
          </div>
          <button
            onClick={() => openCreate(type)}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors font-bold"
            style={{ color }}
            onMouseEnter={e => (e.currentTarget.style.background = bg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Plus size={16} />
          </button>
        </div>

        {items.length === 0 ? (
          <EmptyState
            title={`Sin categorías de ${title.toLowerCase()}`}
            description="Creá una para empezar a organizar tus movimientos."
          />
        ) : (
          <div>
            {items.map((cat, i) => (
              <div
                key={cat.id}
                className="flex items-center gap-3.5 px-5 py-3.5 group transition-colors"
                style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${cat.color}15` }}
                >
                  <div className="w-3.5 h-3.5 rounded-full" style={{ background: cat.color }} />
                </div>
                <p className="flex-1 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {cat.name}
                </p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(cat)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-50)'; e.currentTarget.style.color = 'var(--brand-500)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => cat.id && handleDelete(cat.id)}
                    disabled={deleting === cat.id}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--expense-50)'; e.currentTarget.style.color = 'var(--expense-500)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-5 md:p-7 max-w-4xl mx-auto space-y-6 animate-fade-in">

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Categorías
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {categories.length} categorías en total · organizá tus finanzas
          </p>
        </div>
        <Button onClick={() => openCreate()} size="md">
          <Plus size={16} /> Nueva categoría
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
          <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          Cargando categorías…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <CategoryGroup title="Ingresos" items={income}  type="income" />
          <CategoryGroup title="Gastos"   items={expense} type="expense" />
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar categoría' : 'Nueva categoría'}>
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
          {/* Selector de tipo visual */}
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
                      ? { background: 'var(--income-50)', color: 'var(--income-600)', border: '2px solid var(--income-500)' }
                      : { background: 'var(--expense-50)', color: 'var(--expense-600)', border: '2px solid var(--expense-500)' }
                    : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '2px solid transparent' }
                  }
                >
                  {t === 'income' ? '↑ Ingreso' : '↓ Gasto'}
                </button>
              ))}
            </div>
          </div>
          {/* Paleta de colores */}
          <div>
            <label className="text-sm font-semibold block mb-2" style={{ color: 'var(--text-primary)' }}>
              Color identificador
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_PRESETS.map(color => (
                <button
                  key={color}
                  onClick={() => setForm(f => ({ ...f, color }))}
                  className="w-8 h-8 rounded-full transition-all"
                  style={{
                    backgroundColor: color,
                    border: form.color === color ? `3px solid ${color}` : '3px solid transparent',
                    outline: form.color === color ? `2px solid ${color}40` : 'none',
                    transform: form.color === color ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: form.color === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none',
                  }}
                />
              ))}
            </div>
            {form.color && (
              <div className="mt-2 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full" style={{ background: form.color }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Color seleccionado: <strong>{form.color}</strong>
                </span>
              </div>
            )}
          </div>
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
