'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useCategories } from '@/hooks/useCategories'
import { categoriesService } from '@/services/categories.service'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Category } from '@/types'

const COLOR_PRESETS = ['#463397','#9850eb','#6d38c7','#ef4444','#f97316','#eab308','#22c55e','#10b981','#06b6d4','#3b82f6','#ec4899','#6b7280']
const CARD_STYLE = { background: '#fff', boxShadow: '0 2px 4px rgba(70,51,151,0.08)', border: '1px solid #f3f0ff' }

export default function CategoriesPage() {
  const { data: categories, loading, refetch } = useCategories()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Category | null>(null)
  const [form, setForm]           = useState<Partial<Category>>({ type: 'expense', color: '#463397' })
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)

  const income  = categories.filter(c => c.type === 'income')
  const expense = categories.filter(c => c.type === 'expense')

  function openCreate() { setEditing(null); setForm({ type: 'expense', color: '#463397' }); setError(null); setModalOpen(true) }
  function openEdit(cat: Category) { setEditing(cat); setForm({ ...cat }); setError(null); setModalOpen(true) }

  async function handleSave() {
    if (!form.name) { setError('El nombre es obligatorio.'); return }
    setSaving(true); setError(null)
    try {
      if (editing?.id) await categoriesService.update(editing.id, form as Partial<Category>)
      else await categoriesService.create(form as Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
      setModalOpen(false); refetch()
    } catch { setError('Error al guardar.') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try { await categoriesService.delete(id); refetch() }
    finally { setDeleting(null) }
  }

  function CategoryGroup({ title, items, type }: { title: string; items: Category[]; type: 'income' | 'expense' }) {
    const headerColor = type === 'income' ? '#059669' : '#dc2626'
    const headerBg    = type === 'income' ? '#d1fae5' : '#fee2e2'
    return (
      <div className="rounded-2xl overflow-hidden" style={CARD_STYLE}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: headerBg, color: headerColor }}>{title}</span>
          <span className="text-xs text-gray-400">{items.length} categorías</span>
        </div>
        {items.length === 0
          ? <EmptyState title={`Sin categorías de ${title.toLowerCase()}`} description="Creá una para empezar." />
          : (
            <div className="divide-y divide-gray-50">
              {items.map(cat => (
                <div key={cat.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-violet-50/40 transition-colors group">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${cat.color}20` }}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  </div>
                  <p className="flex-1 text-sm font-semibold text-gray-800">{cat.name}</p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg hover:bg-violet-100 text-gray-400 hover:text-violet-700"><Pencil size={14} /></button>
                    <button onClick={() => cat.id && handleDelete(cat.id)} disabled={deleting === cat.id} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#463397' }}>Categorías</h1>
          <p className="text-gray-500 text-sm mt-1">{categories.length} categorías en total</p>
        </div>
        <Button onClick={openCreate} size="sm"><Plus size={16} />Nueva categoría</Button>
      </div>

      {loading ? <div className="text-center py-16 text-gray-400">Cargando…</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CategoryGroup title="Ingresos" items={income}  type="income" />
          <CategoryGroup title="Gastos"   items={expense} type="expense" />
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar categoría' : 'Nueva categoría'}>
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}
          <Input label="Nombre" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Alimentación" required />
          <Select label="Tipo" value={form.type ?? 'expense'} onChange={e => setForm(f => ({ ...f, type: e.target.value as Category['type'] }))} options={[{ value: 'expense', label: 'Gasto' }, { value: 'income', label: 'Ingreso' }]} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map(color => (
                <button key={color} onClick={() => setForm(f => ({ ...f, color }))} className="w-7 h-7 rounded-full border-2 transition-all" style={{ backgroundColor: color, borderColor: form.color === color ? '#1f1635' : 'transparent', transform: form.color === color ? 'scale(1.15)' : 'scale(1)' }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
