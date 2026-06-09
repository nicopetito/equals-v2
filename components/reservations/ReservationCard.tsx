'use client'

import { ArrowDownCircle, ArrowUpCircle, History, Trash2, Pencil } from 'lucide-react'
import { formatCurrency } from '@/utils/format'
import type { Reservation, WalletWithBalance } from '@/types'

interface Props {
  reservation:  Reservation
  wallet?:      WalletWithBalance
  onDeposit:    (r: Reservation) => void
  onWithdraw:   (r: Reservation) => void
  onHistory:    (r: Reservation) => void
  onEdit:       (r: Reservation) => void
  onCancel:     (r: Reservation) => void
}

const CURRENCY_COLORS: Record<string, { grad: string; text: string; chip: string }> = {
  ARS:    { grad: 'linear-gradient(135deg, #5B21B6 0%, #2563EB 100%)', text: '#fff', chip: '#c4b5fd' },
  USD:    { grad: 'linear-gradient(135deg, #065F46 0%, #047857 100%)', text: '#fff', chip: '#6EE7B7' },
  EUR:    { grad: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)', text: '#fff', chip: '#93C5FD' },
  CRYPTO: { grad: 'linear-gradient(135deg, #78350F 0%, #B45309 100%)', text: '#fff', chip: '#FDE68A' },
}

export function ReservationCard({ reservation, wallet, onDeposit, onWithdraw, onHistory, onEdit, onCancel }: Props) {
  const theme = CURRENCY_COLORS[reservation.currency] ?? CURRENCY_COLORS.ARS

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        boxShadow: 'var(--shadow-sm)',
        border:    '1px solid var(--border)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform  = 'translateY(-2px)'
        el.style.boxShadow  = 'var(--shadow-md)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform  = ''
        el.style.boxShadow  = 'var(--shadow-sm)'
      }}
    >
      {/* Header con gradiente */}
      <div
        className="px-5 pt-5 pb-4"
        style={{ background: theme.grad }}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-0.5"
              style={{ color: 'rgba(255,255,255,0.65)' }}
            >
              Reserva
            </p>
            <h3
              className="text-base font-bold truncate"
              style={{ color: theme.text, fontFamily: 'var(--font-sora)' }}
            >
              {reservation.name}
            </h3>
          </div>
          <span
            className="shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.18)', color: theme.text }}
          >
            {reservation.currency}
          </span>
        </div>

        <div>
          <p className="text-xs font-medium mb-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Monto reservado
          </p>
          <p
            className="text-2xl font-black tabular-nums"
            style={{ color: theme.text, fontFamily: 'var(--font-sora)' }}
          >
            {formatCurrency(reservation.amount, reservation.currency as never)}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3" style={{ background: 'var(--bg-card)' }}>
        {wallet && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Billetera: <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{wallet.name}</span>
            {wallet.provider ? ` · ${wallet.provider}` : ''}
          </p>
        )}

        {reservation.description && (
          <p className="text-xs truncate" style={{ color: 'var(--text-faint)' }}>
            {reservation.description}
          </p>
        )}

        {/* Acciones */}
        <div className="flex gap-2 pt-1">
          <ActionButton
            onClick={() => onDeposit(reservation)}
            icon={<ArrowDownCircle size={13} />}
            label="Apartar"
            color="var(--brand-500)"
            bg="rgba(109,59,215,0.08)"
          />
          <ActionButton
            onClick={() => onWithdraw(reservation)}
            icon={<ArrowUpCircle size={13} />}
            label="Retirar"
            color="var(--income-600)"
            bg="rgba(22,163,74,0.08)"
            disabled={reservation.amount <= 0}
          />
          <ActionButton
            onClick={() => onHistory(reservation)}
            icon={<History size={13} />}
            label="Historial"
            color="var(--text-secondary)"
            bg="var(--bg-subtle)"
          />
          <div className="ml-auto flex gap-1.5">
            <IconBtn onClick={() => onEdit(reservation)} title="Editar" color="var(--text-muted)">
              <Pencil size={12} />
            </IconBtn>
            <IconBtn onClick={() => onCancel(reservation)} title="Cancelar reserva" color="var(--expense-500)">
              <Trash2 size={12} />
            </IconBtn>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionButton({
  onClick, icon, label, color, bg, disabled,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  color: string
  bg: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ color, background: bg }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = '0.8' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
    >
      {icon}
      {label}
    </button>
  )
}

function IconBtn({
  onClick, title, color, children,
}: {
  onClick: () => void
  title: string
  color: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
      style={{ color, background: 'transparent' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}
