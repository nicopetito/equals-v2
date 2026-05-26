'use client'

import { useState, useMemo } from 'react'
import { Zap, Plus, Pencil, Trash2, Star, Copy, Power } from 'lucide-react'
import { useTransactionTemplates } from '@/hooks/useTransactionTemplates'
import { useWallets } from '@/hooks/useWallets'
import { useCategories } from '@/hooks/useCategories'
import { transactionsService } from '@/services/transactions.service'
import { refundService } from '@/services/refund.service'
import { calculateRefundAmount } from '@/utils/refund'
import { useToast } from '@/components/providers/ToastProvider'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { TypeBadge } from '@/components/ui/Badge'
import { TemplateFormModal } from '@/components/transactions/TemplateFormModal'
import { TemplateConfirmModal } from '@/components/transactions/TemplateConfirmModal'
import { formatCurrency } from '@/utils/format'
import type { TransactionTemplate, Currency } from '@/types'

type FilterType = 'all' | 'expense' | 'income' | 'favorites' | 'inactive' | 'refund'

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all',       label: 'Todas' },
  { value: 'expense',   label: 'Gastos' },
  { value: 'income',    label: 'Ingresos' },
  { value: 'favorites', label: '★ Favoritas' },
  { value: 'inactive',  label: 'Inactivas' },
  { value: 'refund',    label: '↩ Con reintegro' },
]

export default function QuickTransactionsPage() {
  const {
    items: templates,
    loading,
    refetch,
    createTemplate,
    deleteTemplate,
    toggleActive,
    toggleFavorite,
  } = useTransactionTemplates()
  const { data: wallets }     = useWallets()
  const { data: categories }  = useCategories()
  const { addToast }          = useToast()

  const [filter, setFilter]               = useState<FilterType>('all')
  const [formOpen, setFormOpen]           = useState(false)
  const [formEditing, setFormEditing]     = useState<TransactionTemplate | null>(null)
  const [confirmOpen, setConfirmOpen]     = useState(false)
  const [confirmTemplate, setConfirmTemplate] = useState<TransactionTemplate | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [togglingId, setTogglingId]       = useState<string | null>(null)

  const stats = useMemo(() => ({
    total:      templates.length,
    active:     templates.filter(t => t.is_active).length,
    favorites:  templates.filter(t => t.is_favorite).length,
    withRefund: templates.filter(t => t.has_refund_rule).length,
  }), [templates])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'expense':   return templates.filter(t => t.type === 'expense')
      case 'income':    return templates.filter(t => t.type === 'income')
      case 'favorites': return templates.filter(t => t.is_favorite)
      case 'inactive':  return templates.filter(t => !t.is_active)
      case 'refund':    return templates.filter(t => t.has_refund_rule)
      default:          return templates
    }
  }, [templates, filter])

  async function handleUseTemplate(
    template: TransactionTemplate,
    overrides: { amount: number; wallet_id: string; date: string; category_id: string; note: string }
  ) {
    const newTx = await transactionsService.create({
      description: template.description ?? template.name,
      amount:      overrides.amount,
      type:        template.type,
      currency:    template.currency as Currency,
      category_id: overrides.category_id || null,
      wallet_id:   overrides.wallet_id   || null,
      date:        overrides.date,
      notes:       overrides.note        || null,
    })

    if (template.has_refund_rule && template.refund_rule && template.type === 'expense' && newTx?.id) {
      const rule         = template.refund_rule
      const refundAmount = calculateRefundAmount(overrides.amount, rule.rule_type, rule.percentage, rule.cap_amount)
      if (refundAmount > 0 && rule.destination_wallet_id) {
        const expectedDate = new Date(overrides.date)
        expectedDate.setDate(expectedDate.getDate() + rule.expected_days)
        try {
          await refundService.create({
            original_transaction_id: newTx.id,
            destination_wallet_id:   rule.destination_wallet_id,
            amount:       refundAmount,
            currency:     template.currency,
            rule_type:    rule.rule_type,
            percentage:   rule.percentage,
            cap_amount:   rule.cap_amount,
            expected_date: expectedDate.toISOString().split('T')[0],
            note:          rule.note,
          })
        } catch (e) {
          console.error('[handleUseTemplate] refund creation failed:', e)
        }
      }
    }

    addToast('Transacción registrada', 'success')
    setConfirmOpen(false)
    setConfirmTemplate(null)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteTemplate(id)
      setConfirmDeleteId(null)
      addToast('Plantilla eliminada', 'success')
    } catch {
      addToast('No se pudo eliminar la plantilla', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleToggleActive(t: TransactionTemplate) {
    setTogglingId(t.id)
    try {
      await toggleActive(t.id, !t.is_active)
    } catch {
      addToast('No se pudo actualizar la plantilla', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleToggleFavorite(t: TransactionTemplate) {
    try {
      await toggleFavorite(t.id, !t.is_favorite)
    } catch {
      addToast('No se pudo actualizar la plantilla', 'error')
    }
  }

  async function handleDuplicate(t: TransactionTemplate) {
    try {
      await createTemplate({
        name:             `${t.name} (copia)`,
        type:             t.type,
        suggested_amount: t.suggested_amount,
        currency:         t.currency,
        category_id:      t.category_id,
        wallet_id:        t.wallet_id,
        description:      t.description,
        icon:             t.icon,
        color:            t.color,
        has_refund_rule:  t.has_refund_rule,
        refund_rule:      t.refund_rule,
        sort_order:       t.sort_order,
        is_active:        t.is_active,
        is_favorite:      false,
      })
      addToast('Plantilla duplicada', 'success')
    } catch {
      addToast('No se pudo duplicar la plantilla', 'error')
    }
  }

  return (
    <div className="p-5 md:p-7 max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <PageHeader
        icon={Zap}
        title="Transacciones rápidas"
        subtitle="Plantillas para registrar movimientos frecuentes en un click."
        layout="split"
      >
        <button
          onClick={() => { setFormEditing(null); setFormOpen(true) }}
          className="hero-btn hero-btn-primary"
        >
          <Plus size={14} /> Nueva plantilla
        </button>
      </PageHeader>

      {/* Stats row */}
      {!loading && templates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Total',         value: stats.total      },
            { label: 'Activas',       value: stats.active     },
            { label: 'Favoritas',     value: stats.favorites  },
            { label: 'Con reintegro', value: stats.withRefund },
          ].map(s => (
            <div key={s.label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
              <span className="text-sm font-black tabular-nums"
                style={{ color: 'var(--brand-500)', fontFamily: 'var(--font-sora)' }}>
                {s.value}
              </span>
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl p-2"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-150"
            style={filter === f.value
              ? { background: 'linear-gradient(135deg,#6d3bd7,#0566d9)', color: '#fff', boxShadow: '0 2px 8px rgba(109,59,215,0.35)' }
              : { color: 'var(--text-muted)' }}
            onMouseEnter={e => { if (filter !== f.value) e.currentTarget.style.color = 'var(--text-secondary)' }}
            onMouseLeave={e => { if (filter !== f.value) e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="rounded-2xl animate-shimmer"
              style={{ height: 148, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Sin plantillas"
          description={filter === 'all'
            ? 'Creá tu primera plantilla para registrar movimientos frecuentes en un click.'
            : 'No hay plantillas que coincidan con este filtro.'}
          action={filter === 'all'
            ? { label: 'Nueva plantilla', onClick: () => { setFormEditing(null); setFormOpen(true) } }
            : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              isConfirmingDelete={confirmDeleteId === t.id}
              isDeleting={deletingId === t.id}
              isToggling={togglingId === t.id}
              onUse={() => { setConfirmTemplate(t); setConfirmOpen(true) }}
              onEdit={() => { setFormEditing(t); setFormOpen(true) }}
              onDuplicate={() => handleDuplicate(t)}
              onToggleActive={() => handleToggleActive(t)}
              onToggleFavorite={() => handleToggleFavorite(t)}
              onRequestDelete={() => setConfirmDeleteId(t.id)}
              onConfirmDelete={() => handleDelete(t.id)}
              onCancelDelete={() => setConfirmDeleteId(null)}
            />
          ))}
        </div>
      )}

      <TemplateFormModal
        open={formOpen}
        editing={formEditing}
        wallets={wallets}
        categories={categories}
        onClose={() => { setFormOpen(false); setFormEditing(null) }}
        onSaved={() => {
          setFormOpen(false)
          setFormEditing(null)
          refetch()
          addToast(formEditing ? 'Plantilla actualizada' : 'Plantilla creada', 'success')
        }}
      />

      <TemplateConfirmModal
        open={confirmOpen}
        template={confirmTemplate}
        wallets={wallets}
        categories={categories}
        onClose={() => { setConfirmOpen(false); setConfirmTemplate(null) }}
        onConfirm={overrides => handleUseTemplate(confirmTemplate!, overrides)}
      />
    </div>
  )
}

// ── TemplateCard ──────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: TransactionTemplate
  isConfirmingDelete: boolean
  isDeleting: boolean
  isToggling: boolean
  onUse: () => void
  onEdit: () => void
  onDuplicate: () => void
  onToggleActive: () => void
  onToggleFavorite: () => void
  onRequestDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}

function TemplateCard({
  template: t,
  isConfirmingDelete,
  isDeleting,
  isToggling,
  onUse,
  onEdit,
  onDuplicate,
  onToggleActive,
  onToggleFavorite,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: TemplateCardProps) {
  const descriptionText = t.description && t.description !== t.name ? t.description : null

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3 transition-all cursor-default"
      style={{
        background:  'var(--bg-card)',
        border:      '1px solid var(--border)',
        boxShadow:   'var(--shadow-sm)',
        opacity:     t.is_active ? 1 : 0.65,
        transition:  'all 0.15s ease',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)' }}
    >
      {/* Identity row */}
      <div className="flex items-start gap-3">
        {t.color && (
          <div className="w-[3px] self-stretch rounded-full shrink-0 mt-0.5 min-h-[32px]"
            style={{ background: t.color }} />
        )}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{
            background: t.color ? `${t.color}15` : 'var(--bg-subtle)',
            border:     `1px solid ${t.color ? `${t.color}30` : 'var(--border)'}`,
          }}
        >
          {t.icon ?? (t.type === 'income' ? '↑' : '↓')}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {t.name}
            </p>
            {t.is_favorite && <span style={{ color: '#d97706', fontSize: 13 }}>★</span>}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <TypeBadge type={t.type} />
            {!t.is_active && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-faint)', border: '1px solid var(--border)' }}>
                Inactiva
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Amount + meta */}
      {(t.suggested_amount != null || descriptionText || t.has_refund_rule) && (
        <div className="space-y-1">
          {t.suggested_amount != null && (
            <p className="text-base font-bold tabular-nums"
              style={{
                color:      t.type === 'income' ? 'var(--income-500)' : 'var(--expense-500)',
                fontFamily: 'var(--font-sora)',
              }}>
              {t.type === 'income' ? '+' : '−'}{formatCurrency(t.suggested_amount, t.currency)}
            </p>
          )}
          {descriptionText && (
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{descriptionText}</p>
          )}
          {t.has_refund_rule && (
            <p className="text-[11px] font-medium" style={{ color: 'var(--income-600)' }}>↩ Con reintegro</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto pt-3 flex items-center gap-1.5"
        style={{ borderTop: '1px solid var(--border-light)' }}>
        {isConfirmingDelete ? (
          <>
            <span className="text-xs font-semibold" style={{ color: 'var(--expense-600)' }}>¿Eliminar?</span>
            <button
              onClick={onConfirmDelete}
              disabled={isDeleting}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white transition-all ml-1"
              style={{ background: 'var(--expense-500)', opacity: isDeleting ? 0.6 : 1 }}
            >
              {isDeleting ? '…' : 'Sí'}
            </button>
            <button
              onClick={onCancelDelete}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              No
            </button>
          </>
        ) : (
          <>
            {/* Use CTA */}
            <button
              onClick={onUse}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 hover:-translate-y-px"
              style={{ background: 'linear-gradient(135deg,#6d3bd7,#0566d9)', boxShadow: '0 2px 8px rgba(109,59,215,0.30)' }}
            >
              <Zap size={11} /> Usar
            </button>

            {/* Icon actions */}
            <div className="flex items-center gap-0.5 ml-auto">
              <button
                onClick={onToggleFavorite}
                title={t.is_favorite ? 'Quitar favorita' : 'Marcar favorita'}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{ color: t.is_favorite ? '#d97706' : 'var(--text-faint)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Star size={12} fill={t.is_favorite ? '#d97706' : 'none'} />
              </button>
              <button
                onClick={onEdit}
                title="Editar"
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={onDuplicate}
                title="Duplicar"
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Copy size={12} />
              </button>
              <button
                onClick={onToggleActive}
                disabled={isToggling}
                title={t.is_active ? 'Desactivar' : 'Activar'}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{
                  color:   t.is_active ? 'var(--text-muted)' : 'var(--income-500)',
                  opacity: isToggling ? 0.6 : 1,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Power size={12} />
              </button>
              <button
                onClick={onRequestDelete}
                title="Eliminar"
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{ color: 'var(--expense-500)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--expense-50)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
