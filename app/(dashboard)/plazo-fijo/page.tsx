'use client'

import { useState, useMemo } from 'react'
import { Plus, PiggyBank, TrendingUp, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/format'

interface FixedTerm {
  id: string
  name: string
  principal: number
  currency: string
  annual_rate: number
  start_date: string
  end_date: string
  bank: string
}

const CURRENCY_OPTS = [
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'USD' },
]

function calcInterest(principal: number, rate: number, startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const days = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const interest = principal * (rate / 100) * (days / 365)
  return { days: Math.round(days), interest, total: principal + interest }
}

const SAMPLE_BANKS = [
  { value: 'Banco Nación', label: 'Banco Nación' },
  { value: 'Santander', label: 'Santander' },
  { value: 'Galicia', label: 'Galicia' },
  { value: 'BBVA', label: 'BBVA' },
  { value: 'Macro', label: 'Macro' },
  { value: 'Otro', label: 'Otro' },
]

export default function FixedTermPage() {
  const [items, setItems] = useState<FixedTerm[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    principal: 0,
    currency: 'ARS',
    annual_rate: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    bank: '',
  })
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setForm({
      name: '',
      principal: 0,
      currency: 'ARS',
      annual_rate: 0,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      bank: '',
    })
    setError(null)
    setModalOpen(true)
  }

  function handleSave() {
    if (!form.name || !form.principal || !form.start_date || !form.end_date) {
      setError('Completá todos los campos.')
      return
    }
    setItems((prev) => [
      ...prev,
      { ...form, id: crypto.randomUUID() },
    ])
    setModalOpen(false)
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const totalByCurrency = useMemo(() => {
    return items.reduce<Record<string, { principal: number; interest: number }>>((acc, item) => {
      const { interest } = calcInterest(item.principal, item.annual_rate, item.start_date, item.end_date)
      if (!acc[item.currency]) acc[item.currency] = { principal: 0, interest: 0 }
      acc[item.currency].principal += item.principal
      acc[item.currency].interest += interest
      return acc
    }, {})
  }, [items])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Plazo Fijo</h1>
          <p className="text-gray-500 text-sm mt-1">Calculá tus rendimientos de plazo fijo</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus size={16} />
          Agregar plazo fijo
        </Button>
      </div>

      {Object.keys(totalByCurrency).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(totalByCurrency).map(([curr, data]) => (
            <div key={curr} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">{curr} — Resumen</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-600">Capital</p>
                  <p className="text-lg font-bold text-gray-200 tabular-nums">{formatCurrency(data.principal, curr)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Interés total</p>
                  <p className="text-lg font-bold text-emerald-400 tabular-nums">+{formatCurrency(data.interest, curr)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Sin plazos fijos"
          description="Agregá tus plazos fijos para ver el rendimiento proyectado."
          action={{ label: 'Agregar plazo fijo', onClick: openCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => {
            const { days, interest, total } = calcInterest(item.principal, item.annual_rate, item.start_date, item.end_date)
            const isExpired = new Date(item.end_date) < new Date()
            return (
              <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 group hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-500/10 rounded-xl">
                      <PiggyBank size={18} className="text-amber-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-200 text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.bank} · {item.currency}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <p className="text-xs text-gray-600">Capital</p>
                    <p className="font-semibold text-gray-300 tabular-nums">{formatCurrency(item.principal, item.currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">TNA</p>
                    <p className="font-semibold text-gray-300">{item.annual_rate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Duración</p>
                    <p className="font-semibold text-gray-300">{days} días</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Vencimiento</p>
                    <p className={`font-semibold ${isExpired ? 'text-red-400' : 'text-gray-300'}`}>
                      {new Date(item.end_date).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-emerald-500">
                    <TrendingUp size={12} />
                    +{formatCurrency(interest, item.currency)}
                  </div>
                  <p className="text-sm font-bold text-gray-100 tabular-nums">{formatCurrency(total, item.currency)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo plazo fijo">
        <div className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">{error}</div>
          )}
          <Input
            label="Nombre / Descripción"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ej: PF Banco Nación"
            required
          />
          <Select
            label="Banco"
            value={form.bank}
            onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value }))}
            options={[{ value: '', label: 'Seleccioná un banco' }, ...SAMPLE_BANKS]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Capital"
              type="number"
              min="0"
              step="0.01"
              value={form.principal || ''}
              onChange={(e) => setForm((f) => ({ ...f, principal: parseFloat(e.target.value) || 0 }))}
            />
            <Select
              label="Moneda"
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              options={CURRENCY_OPTS}
            />
          </div>
          <Input
            label="TNA (%)"
            type="number"
            min="0"
            max="1000"
            step="0.1"
            value={form.annual_rate || ''}
            onChange={(e) => setForm((f) => ({ ...f, annual_rate: parseFloat(e.target.value) || 0 }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fecha inicio"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            />
            <Input
              label="Fecha vencimiento"
              type="date"
              value={form.end_date}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} className="flex-1">Agregar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
