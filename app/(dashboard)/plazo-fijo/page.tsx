'use client'

import { useState, useMemo } from 'react'
import { Plus, PiggyBank, TrendingUp, Trash2, Calendar, Percent, Building2, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/format'

interface FixedTerm {
  id: string; name: string; principal: number; currency: string
  annual_rate: number; start_date: string; end_date: string; bank: string
}

const CURRENCY_OPTS = [{ value: 'ARS', label: 'ARS' }, { value: 'USD', label: 'USD' }]
const BANK_OPTS = [
  { value: '', label: 'Seleccioná un banco' },
  ...['Banco Nación', 'Santander', 'Galicia', 'BBVA', 'Macro', 'Brubank', 'Uala', 'Otro']
    .map(b => ({ value: b, label: b })),
]

function calcInterest(principal: number, rate: number, startDate: string, endDate: string) {
  const days = Math.max(0, (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)
  const interest = principal * (rate / 100) * (days / 365)
  return { days: Math.round(days), interest, total: principal + interest }
}

export default function FixedTermPage() {
  const [items, setItems]     = useState<FixedTerm[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm]       = useState({
    name: '', principal: 0, currency: 'ARS',
    annual_rate: 0, start_date: new Date().toISOString().split('T')[0], end_date: '', bank: '',
  })
  const [error, setError]     = useState<string | null>(null)

  function openCreate() {
    setForm({ name: '', principal: 0, currency: 'ARS', annual_rate: 0, start_date: new Date().toISOString().split('T')[0], end_date: '', bank: '' })
    setError(null)
    setModalOpen(true)
  }

  function handleSave() {
    if (!form.name || !form.principal || !form.start_date || !form.end_date) {
      setError('Completá todos los campos obligatorios.')
      return
    }
    setItems(prev => [...prev, { ...form, id: crypto.randomUUID() }])
    setModalOpen(false)
  }

  const totalByCurrency = useMemo(() =>
    items.reduce<Record<string, { principal: number; interest: number; total: number }>>((acc, item) => {
      const { interest, total } = calcInterest(item.principal, item.annual_rate, item.start_date, item.end_date)
      if (!acc[item.currency]) acc[item.currency] = { principal: 0, interest: 0, total: 0 }
      acc[item.currency].principal += item.principal
      acc[item.currency].interest  += interest
      acc[item.currency].total     += total
      return acc
    }, {}),
  [items])

  return (
    <div className="p-5 md:p-7 max-w-4xl mx-auto space-y-6 animate-fade-in">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Plazo Fijo
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Calculá y seguí el rendimiento de tus plazos fijos
          </p>
        </div>
        <Button onClick={openCreate} size="md">
          <Plus size={16} /> Agregar plazo fijo
        </Button>
      </div>

      {/* Resumen total */}
      {Object.keys(totalByCurrency).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(totalByCurrency).map(([curr, data]) => (
            <div
              key={curr}
              className="rounded-2xl p-5"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--goal-50)' }}>
                  <PiggyBank size={16} style={{ color: 'var(--goal-600)' }} />
                </div>
                <span className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  Resumen {curr}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Capital</p>
                  <p className="text-lg font-extrabold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(data.principal, curr)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Interés</p>
                  <p className="text-lg font-extrabold tabular-nums" style={{ color: 'var(--income-600)' }}>
                    +{formatCurrency(data.interest, curr)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Total</p>
                  <p className="text-lg font-extrabold tabular-nums" style={{ color: 'var(--brand-600)' }}>
                    {formatCurrency(data.total, curr)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista de plazos fijos */}
      {items.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Sin plazos fijos"
          description="Agregá tus plazos fijos para visualizar el rendimiento proyectado y el total acumulado."
          action={{ label: '+ Agregar plazo fijo', onClick: openCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map(item => {
            const { days, interest, total } = calcInterest(item.principal, item.annual_rate, item.start_date, item.end_date)
            const isExpired = new Date(item.end_date) < new Date()
            const yieldPct  = item.principal > 0 ? (interest / item.principal) * 100 : 0
            return (
              <div
                key={item.id}
                className="rounded-2xl p-5 group transition-all hover:-translate-y-0.5"
                style={{
                  background: 'var(--bg-card)',
                  border: isExpired ? '1px solid var(--expense-100)' : '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center"
                      style={{ background: isExpired ? 'var(--expense-50)' : 'var(--goal-50)' }}
                    >
                      <PiggyBank size={20} style={{ color: isExpired ? 'var(--expense-500)' : 'var(--goal-500)' }} />
                    </div>
                    <div>
                      <p className="font-extrabold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {item.name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {item.bank || 'Sin banco'} ·{' '}
                        <span className="font-semibold" style={{ color: 'var(--brand-500)' }}>
                          {item.currency}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setItems(p => p.filter(i => i.id !== item.id))}
                    className="w-8 h-8 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--expense-50)'; e.currentTarget.style.color = 'var(--expense-500)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Datos principales */}
                <div className="grid grid-cols-2 gap-2.5 mb-4">
                  <div className="rounded-xl p-3" style={{ background: 'var(--bg-subtle)' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Capital invertido</p>
                    <p className="text-base font-extrabold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(item.principal, item.currency)}
                    </p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'var(--bg-subtle)' }}>
                    <p className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <Percent size={10} /> TNA anual
                    </p>
                    <p className="text-base font-extrabold" style={{ color: 'var(--brand-500)' }}>
                      {item.annual_rate}%
                    </p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'var(--bg-subtle)' }}>
                    <p className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <Calendar size={10} /> Duración
                    </p>
                    <p className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                      {days} días
                    </p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: isExpired ? 'var(--expense-50)' : 'var(--bg-subtle)', border: isExpired ? '1px solid var(--expense-100)' : 'none' }}>
                    <p className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: isExpired ? 'var(--expense-600)' : 'var(--text-muted)' }}>
                      {isExpired && <AlertCircle size={10} />}
                      <Calendar size={10} /> Vencimiento
                    </p>
                    <p className="text-base font-extrabold" style={{ color: isExpired ? 'var(--expense-600)' : 'var(--text-primary)' }}>
                      {new Date(item.end_date).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                </div>

                {/* Resultado */}
                <div
                  className="rounded-xl p-3 flex items-center justify-between"
                  style={{ background: 'var(--income-50)', border: '1px solid var(--income-100)' }}
                >
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={14} style={{ color: 'var(--income-600)' }} />
                    <span className="text-sm font-bold" style={{ color: 'var(--income-600)' }}>
                      +{formatCurrency(interest, item.currency)}
                    </span>
                    <span className="text-xs font-medium" style={{ color: 'var(--income-600)' }}>
                      ({yieldPct.toFixed(1)}%)
                    </span>
                  </div>
                  <span className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--brand-600)' }}>
                    = {formatCurrency(total, item.currency)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo plazo fijo">
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
            label="Nombre / Descripción"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ej: PF Banco Nación Junio, Ahorro USD…"
            required
          />
          <Select
            label="Banco o entidad"
            value={form.bank}
            onChange={e => setForm(f => ({ ...f, bank: e.target.value }))}
            options={BANK_OPTS}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Capital"
              type="number" min="0" step="0.01"
              value={form.principal || ''}
              onChange={e => setForm(f => ({ ...f, principal: parseFloat(e.target.value) || 0 }))}
            />
            <Select
              label="Moneda"
              value={form.currency}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              options={CURRENCY_OPTS}
            />
          </div>
          <Input
            label="TNA (%)"
            type="number" min="0" max="1000" step="0.1"
            value={form.annual_rate || ''}
            onChange={e => setForm(f => ({ ...f, annual_rate: parseFloat(e.target.value) || 0 }))}
            hint="Tasa nominal anual en porcentaje"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fecha de inicio"
              type="date"
              value={form.start_date}
              onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
            />
            <Input
              label="Fecha de vencimiento"
              type="date"
              value={form.end_date}
              onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
            />
          </div>

          {/* Preview del resultado */}
          {form.principal > 0 && form.annual_rate > 0 && form.start_date && form.end_date && (() => {
            const { days, interest, total } = calcInterest(form.principal, form.annual_rate, form.start_date, form.end_date)
            return days > 0 ? (
              <div
                className="rounded-xl p-4"
                style={{ background: 'var(--income-50)', border: '1px solid var(--income-100)' }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: 'var(--income-600)' }}>
                  Vista previa del rendimiento
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Días</p>
                    <p className="font-extrabold" style={{ color: 'var(--text-primary)' }}>{days}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Interés</p>
                    <p className="font-extrabold" style={{ color: 'var(--income-600)' }}>
                      +{formatCurrency(interest, form.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total</p>
                    <p className="font-extrabold" style={{ color: 'var(--brand-600)' }}>
                      {formatCurrency(total, form.currency)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null
          })()}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Agregar plazo fijo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
