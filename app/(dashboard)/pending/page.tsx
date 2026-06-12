'use client'

import { useState, useMemo } from 'react'
import { Clock, Plus, CheckCircle2, XCircle, Pencil, User, CalendarDays, AlertCircle, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { CompletePendingModal } from '@/components/pending/CompletePendingModal'
import { useToast } from '@/components/providers/ToastProvider'
import { usePendingPayments } from '@/hooks/usePendingPayments'
import { useWallets } from '@/hooks/useWallets'
import { pendingPaymentService } from '@/services/pending_payment.service'
import { formatCurrency } from '@/utils/format'
import { formatDate } from '@/utils/date'
import type { PendingPayment, PendingPaymentStatus, Currency } from '@/types'
import { motion } from 'motion/react'
import { staggerContainer, staggerItem } from '@/utils/animations'
import { getErrorMessage } from '@/utils/errors'

type EffectiveStatus = PendingPaymentStatus | 'overdue'

function getEffectiveStatus(payment: PendingPayment): EffectiveStatus {
  if (payment.status === 'pending' && payment.due_date) {
    const today = new Date().toISOString().slice(0, 10)
    if (payment.due_date < today) return 'overdue'
  }
  return payment.status
}

const STATUS_LABELS: Record<EffectiveStatus, string> = {
  pending:   'Pendiente',
  overdue:   'Vencido',
  collected: 'Cobrado',
  paid:      'Pagado',
  cancelled: 'Cancelado',
}

const STATUS_COLORS: Record<EffectiveStatus, { bg: string; color: string; border: string }> = {
  pending:   { bg: 'rgba(251,191,36,0.10)',  color: '#D97706', border: 'rgba(251,191,36,0.25)'  },
  overdue:   { bg: 'rgba(255,180,171,0.12)', color: '#DC2626', border: 'rgba(255,180,171,0.30)' },
  collected: { bg: 'rgba(78,222,163,0.10)',  color: '#059669', border: 'rgba(78,222,163,0.25)'  },
  paid:      { bg: 'rgba(78,222,163,0.10)',  color: '#059669', border: 'rgba(78,222,163,0.25)'  },
  cancelled: { bg: 'rgba(156,163,175,0.10)', color: '#6B7280', border: 'rgba(156,163,175,0.25)' },
}

const CURRENCY_OPTS = [
  { value: 'ARS',    label: 'ARS'    },
  { value: 'USD',    label: 'USD'    },
  { value: 'EUR',    label: 'EUR'    },
  { value: 'CRYPTO', label: 'CRYPTO' },
]

interface FormState {
  type: 'receivable' | 'payable'
  person_name: string
  amount: string
  currency: string
  description: string
  due_date: string
}

const EMPTY_FORM: FormState = {
  type:        'receivable',
  person_name: '',
  amount:      '',
  currency:    'ARS',
  description: '',
  due_date:    '',
}

function StatusBadge({ payment }: { payment: PendingPayment }) {
  const eff    = getEffectiveStatus(payment)
  const colors = STATUS_COLORS[eff]
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
      style={{ background: colors.bg, color: colors.color, border: `1px solid ${colors.border}` }}>
      {STATUS_LABELS[eff]}
    </span>
  )
}

function PendingCard({
  payment,
  onComplete,
  onCancel,
  onEdit,
  onDelete,
}: {
  payment: PendingPayment
  onComplete: (p: PendingPayment) => void
  onCancel:   (p: PendingPayment) => void
  onEdit:     (p: PendingPayment) => void
  onDelete:   (p: PendingPayment) => void
}) {
  const isReceivable = payment.type === 'receivable'
  const eff          = getEffectiveStatus(payment)
  const isActive     = payment.status === 'pending'
  const currency     = payment.currency as Currency

  return (
    <div className="rounded-2xl px-5 py-4 transition-all"
      style={{
        background:  'var(--bg-card)',
        border:      '1px solid var(--border)',
        boxShadow:   'var(--shadow-sm)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              <User size={11} style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {payment.person_name}
              </p>
            </div>
            <StatusBadge payment={payment} />
          </div>

          {payment.description && (
            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {payment.description}
            </p>
          )}

          {payment.due_date && (
            <div className="flex items-center gap-1 mt-1.5">
              <CalendarDays size={10} style={{ color: eff === 'overdue' ? '#DC2626' : 'var(--text-faint)' }} />
              <span className="text-xs" style={{ color: eff === 'overdue' ? '#DC2626' : 'var(--text-faint)' }}>
                Vence: {formatDate(payment.due_date)}
              </span>
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          <p className="text-lg font-extrabold tabular-nums"
            style={{
              color: isReceivable ? 'var(--income-600)' : 'var(--expense-600)',
              fontFamily: 'var(--font-sora)',
            }}>
            {isReceivable ? '+' : '-'}{formatCurrency(payment.amount, currency)}
          </p>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        {isActive ? (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onComplete(payment)}
              className="flex-1"
            >
              <CheckCircle2 size={13} />
              {isReceivable ? 'Marcar cobrado' : 'Marcar pagado'}
            </Button>
            <button
              onClick={() => onEdit(payment)}
              className="p-2 rounded-lg transition-colors"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-base)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)')}
              title="Editar"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => onCancel(payment)}
              className="p-2 rounded-lg transition-colors"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#DC2626')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
              title="Cancelar"
            >
              <XCircle size={13} />
            </button>
          </>
        ) : (
          <button
            onClick={() => onDelete(payment)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ml-auto"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.08)'; (e.currentTarget as HTMLElement).style.color = '#DC2626' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
            title="Eliminar"
          >
            <Trash2 size={12} />
            Eliminar
          </button>
        )}
      </div>
    </div>
  )
}

export default function PendingPage() {
  const { addToast }                        = useToast()
  const { items, loading, refetch }         = usePendingPayments()
  const { data: wallets }                   = useWallets()

  const [tab, setTab]                       = useState<'receivable' | 'payable'>('receivable')
  const [createOpen, setCreateOpen]         = useState(false)
  const [editTarget, setEditTarget]         = useState<PendingPayment | null>(null)
  const [completeTarget, setCompleteTarget] = useState<PendingPayment | null>(null)
  const [cancelTarget, setCancelTarget]     = useState<PendingPayment | null>(null)
  const [deleteTarget, setDeleteTarget]     = useState<PendingPayment | null>(null)
  const [form, setForm]                     = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]                 = useState(false)
  const [cancelling, setCancelling]         = useState(false)
  const [deleting, setDeleting]             = useState(false)

  const receivables = useMemo(() =>
    items.filter(p => p.type === 'receivable').sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1
      return 0
    }), [items])

  const payables = useMemo(() =>
    items.filter(p => p.type === 'payable').sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1
      return 0
    }), [items])

  const visibleItems = tab === 'receivable' ? receivables : payables

  function openCreate() {
    setForm({ ...EMPTY_FORM, type: tab })
    setEditTarget(null)
    setCreateOpen(true)
  }

  function openEdit(p: PendingPayment) {
    setForm({
      type:        p.type,
      person_name: p.person_name,
      amount:      String(p.amount),
      currency:    p.currency,
      description: p.description ?? '',
      due_date:    p.due_date ?? '',
    })
    setEditTarget(p)
    setCreateOpen(true)
  }

  async function handleSave() {
    if (!form.person_name.trim()) { addToast('El nombre es obligatorio', 'error'); return }
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) { addToast('Ingresá un monto válido', 'error'); return }

    setSaving(true)
    try {
      if (editTarget?.id) {
        await pendingPaymentService.update(editTarget.id, {
          person_name: form.person_name.trim(),
          amount:      amt,
          description: form.description.trim() || null,
          due_date:    form.due_date || null,
        })
        addToast('Pago actualizado', 'success')
      } else {
        await pendingPaymentService.create({
          type:        form.type,
          person_name: form.person_name.trim(),
          amount:      amt,
          currency:    form.currency,
          description: form.description.trim() || null,
          due_date:    form.due_date || null,
        })
        addToast('Pago pendiente creado', 'success')
      }
      setCreateOpen(false)
      refetch()
    } catch (e) {
      addToast(getErrorMessage(e, 'Error al guardar'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleCancelConfirm() {
    if (!cancelTarget?.id) return
    setCancelling(true)
    try {
      await pendingPaymentService.cancel(cancelTarget.id)
      addToast('Pago cancelado', 'info')
      setCancelTarget(null)
      refetch()
    } catch (e) {
      addToast(getErrorMessage(e, 'Error al cancelar'), 'error')
    } finally {
      setCancelling(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget?.id) return
    setDeleting(true)
    try {
      await pendingPaymentService.delete(deleteTarget.id)
      addToast('Pago eliminado', 'info')
      setDeleteTarget(null)
      refetch()
    } catch (e) {
      addToast(getErrorMessage(e, 'Error al eliminar'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  const overdueCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return items.filter(p => p.status === 'pending' && p.due_date && p.due_date < today).length
  }, [items])

  return (
    <div className="p-5 md:p-7 max-w-3xl mx-auto space-y-5 animate-fade-in">

      {/* Header */}
      <PageHeader
        layout="split"
        icon={Clock}
        title="Pagos pendientes"
        subtitle="Plata que te deben y que debés pagar"
      >
        <Button variant="primary" onClick={openCreate}>
          <Plus size={14} /> Nuevo pendiente
        </Button>
      </PageHeader>

      {/* Alerta vencidos */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm"
          style={{ background: 'rgba(255,180,171,0.10)', border: '1px solid rgba(255,180,171,0.25)' }}>
          <AlertCircle size={15} style={{ color: '#DC2626', flexShrink: 0 }} />
          <p style={{ color: '#DC2626' }}>
            <strong>{overdueCount}</strong> pago{overdueCount !== 1 ? 's' : ''} vencido{overdueCount !== 1 ? 's' : ''} — revisalos lo antes posible.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--bg-subtle)' }}>
        {([
          { id: 'receivable' as const, label: 'Me deben', count: receivables.filter(p => p.status === 'pending').length },
          { id: 'payable'    as const, label: 'Debo pagar', count: payables.filter(p => p.status === 'pending').length },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
            style={tab === t.id
              ? { background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' }
              : { color: 'var(--text-muted)' }
            }
          >
            {t.label}
            {t.count > 0 && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                style={{ background: 'rgba(109,59,215,0.12)', color: 'var(--brand-500)' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="rounded-2xl animate-shimmer" style={{ height: 96 }} />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <EmptyState
          type="scheduled"
          title={tab === 'receivable' ? 'Sin cobros pendientes' : 'Sin pagos pendientes'}
          description={
            tab === 'receivable'
              ? 'Registrá plata que te deben para hacer seguimiento fácil.'
              : 'Registrá deudas para recordar cuándo y a quién pagarle.'
          }
          action={{ label: '+ Nuevo pendiente', onClick: openCreate }}
        />
      ) : (
        <motion.div
          className="space-y-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {visibleItems.map(payment => (
            <motion.div key={payment.id} variants={staggerItem}>
              <PendingCard
                payment={payment}
                onComplete={p => setCompleteTarget(p)}
                onCancel={p => setCancelTarget(p)}
                onEdit={p => openEdit(p)}
                onDelete={p => setDeleteTarget(p)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Modal crear/editar */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={editTarget ? 'Editar pago pendiente' : 'Nuevo pago pendiente'}
      >
        <div className="space-y-4">
          {!editTarget && (
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'receivable' as const, label: 'Me deben', desc: 'Alguien me debe plata' },
                { id: 'payable'    as const, label: 'Debo pagar', desc: 'Le debo plata a alguien' },
              ]).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setForm(f => ({ ...f, type: opt.id }))}
                  className="text-left rounded-xl p-3 transition-all"
                  style={{
                    background: form.type === opt.id ? 'rgba(109,59,215,0.08)' : 'var(--bg-subtle)',
                    border: form.type === opt.id ? '1.5px solid var(--brand-500)' : '1px solid var(--border)',
                  }}
                >
                  <p className="text-xs font-bold" style={{ color: form.type === opt.id ? 'var(--brand-500)' : 'var(--text-primary)' }}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>{opt.desc}</p>
                </button>
              ))}
            </div>
          )}

          <Input
            label="Nombre de la persona"
            value={form.person_name}
            onChange={e => setForm(f => ({ ...f, person_name: e.target.value }))}
            placeholder="Ej: Juan García"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monto"
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
            />
            <Select
              label="Moneda"
              value={form.currency}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              options={CURRENCY_OPTS}
            />
          </div>

          <Input
            label="Descripción (opcional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Ej: Cena del viernes, préstamo cuota 1..."
          />

          <Input
            label="Fecha de vencimiento (opcional)"
            type="date"
            value={form.due_date}
            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
          />

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" onClick={() => setCreateOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving} className="flex-1">
              {editTarget ? 'Guardar cambios' : 'Crear pendiente'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal completar */}
      <CompletePendingModal
        open={completeTarget !== null}
        onClose={() => setCompleteTarget(null)}
        payment={completeTarget}
        wallets={wallets}
        onSuccess={() => { setCompleteTarget(null); refetch() }}
      />

      {/* Modal eliminar */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar pago"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              ¿Eliminar el pago de{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.person_name}</strong>{' '}
              por{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {formatCurrency(deleteTarget.amount, deleteTarget.currency as Currency)}
              </strong>?{' '}
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} className="flex-1">
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleDeleteConfirm}
                loading={deleting}
                className="flex-1"
                style={{ background: '#DC2626' }}
              >
                Sí, eliminar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal cancelar */}
      <Modal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        title="Cancelar pago pendiente"
      >
        {cancelTarget && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              ¿Cancelar el pago de{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{cancelTarget.person_name}</strong>{' '}
              por{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {formatCurrency(cancelTarget.amount, cancelTarget.currency as Currency)}
              </strong>?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setCancelTarget(null)} className="flex-1">
                No cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleCancelConfirm}
                loading={cancelling}
                className="flex-1"
                style={{ background: '#DC2626' }}
              >
                Sí, cancelar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
