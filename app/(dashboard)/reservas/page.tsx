'use client'

import { useState, useMemo } from 'react'
import { Archive, PiggyBank, Plus } from 'lucide-react'
import { useReservations } from '@/hooks/useReservations'
import { useWallets } from '@/hooks/useWallets'
import { reservationsService } from '@/services/reservations.service'
import { useToast } from '@/components/providers/ToastProvider'
import { Button } from '@/components/ui/Button'
import { HeroHeader } from '@/components/ui/HeroHeader'
import { Modal } from '@/components/ui/Modal'
import { ReservationCard } from '@/components/reservations/ReservationCard'
import { CreateReservationModal } from '@/components/reservations/CreateReservationModal'
import { MovementModal } from '@/components/reservations/MovementModal'
import { HistoryModal } from '@/components/reservations/HistoryModal'
import { formatCurrency } from '@/utils/format'
import { motion } from 'motion/react'
import { staggerContainer, staggerItem } from '@/utils/animations'
import type { Reservation } from '@/types'
import { getErrorMessage } from '@/utils/errors'

// ── Design tokens ─────────────────────────────────────────────────────────
const CARD_SHADOW   = 'var(--shadow-sm)'
const CARD_SHADOW_H = 'var(--shadow-md)'

function cardHoverOn(el: HTMLElement) {
  el.style.transform = 'translateY(-1px)'
  el.style.boxShadow = CARD_SHADOW_H
}
function cardHoverOff(el: HTMLElement) {
  el.style.transform = ''
  el.style.boxShadow = CARD_SHADOW
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function ReservasPage() {
  const { data: reservations, loading, refetch } = useReservations()
  const { data: wallets }                        = useWallets()
  const { addToast }                             = useToast()

  const [createOpen, setCreateOpen]         = useState(false)
  const [editing, setEditing]               = useState<Reservation | null>(null)
  const [depositTarget, setDepositTarget]   = useState<Reservation | null>(null)
  const [withdrawTarget, setWithdrawTarget] = useState<Reservation | null>(null)
  const [historyTarget, setHistoryTarget]   = useState<Reservation | null>(null)
  const [cancelTarget, setCancelTarget]     = useState<Reservation | null>(null)
  const [cancelling, setCancelling]         = useState(false)

  // Mapa walletId → wallet para lookup rápido
  const walletMap = useMemo(
    () => Object.fromEntries(wallets.map(w => [w.id, w])),
    [wallets]
  )

  // Totales por moneda
  const totalsByCurrency = useMemo(() => {
    const map: Record<string, number> = {}
    reservations.forEach(r => {
      map[r.currency] = (map[r.currency] ?? 0) + r.amount
    })
    return Object.entries(map)
  }, [reservations])

  async function handleCreate(data: Omit<Reservation, 'id' | 'user_id' | 'amount' | 'status' | 'created_at' | 'updated_at'>) {
    await reservationsService.create(data)
    refetch()
    addToast('Reserva creada', 'success')
  }

  async function handleEdit(data: Omit<Reservation, 'id' | 'user_id' | 'amount' | 'status' | 'created_at' | 'updated_at'>) {
    if (!editing?.id) return
    await reservationsService.update(editing.id, { name: data.name, description: data.description })
    refetch()
    addToast('Reserva actualizada', 'success')
    setEditing(null)
  }

  async function handleDeposit(amount: number, description: string, date: string) {
    if (!depositTarget?.id || !depositTarget.wallet_id) return
    await reservationsService.deposit({
      reservationId: depositTarget.id,
      walletId:      depositTarget.wallet_id,
      amount,
      description:   description || undefined,
      date,
    })
    refetch()
    addToast(`+${formatCurrency(amount, depositTarget.currency as never)} apartado`, 'success')
  }

  async function handleWithdraw(amount: number, description: string, date: string) {
    if (!withdrawTarget?.id || !withdrawTarget.wallet_id) return
    await reservationsService.withdraw({
      reservationId: withdrawTarget.id,
      walletId:      withdrawTarget.wallet_id,
      amount,
      description:   description || undefined,
      date,
    })
    refetch()
    addToast(`${formatCurrency(amount, withdrawTarget.currency as never)} devuelto a billetera`, 'success')
  }

  async function handleCancel() {
    if (!cancelTarget?.id) return
    setCancelling(true)
    try {
      await reservationsService.cancel(cancelTarget.id)
      refetch()
      addToast('Reserva cancelada', 'info')
      setCancelTarget(null)
    } catch (e) {
      addToast(getErrorMessage(e, 'Error al cancelar'), 'error')
    } finally {
      setCancelling(false)
    }
  }

  const depositWalletBalance = depositTarget?.wallet_id
    ? walletMap[depositTarget.wallet_id]?.current_balance ?? 0
    : 0

  return (
    <div className="p-5 md:p-7 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <HeroHeader
        title="Tus reservas"
        subtitle="Dinero apartado, no disponible para gasto diario"
        icon={PiggyBank}
      >
        <button onClick={() => setCreateOpen(true)} className="hero-btn hero-btn-primary">
          <Plus size={15} /> Nueva reserva
        </button>
      </HeroHeader>

      {/* ── Totales por moneda ── */}
      {totalsByCurrency.length > 0 && (
        <div className={`grid gap-3 ${totalsByCurrency.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {totalsByCurrency.map(([currency, total]) => (
            <div
              key={currency}
              className="rounded-2xl px-4 py-3"
              onMouseEnter={e => cardHoverOn(e.currentTarget)}
              onMouseLeave={e => cardHoverOff(e.currentTarget)}
              style={{
                background: 'var(--bg-card)',
                border:     '1px solid var(--border)',
                boxShadow:  CARD_SHADOW,
                transition: 'all 0.15s ease',
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                Reservado {currency}
              </p>
              <p
                className="text-xl font-black tabular-nums"
                style={{ color: 'var(--brand-500)', fontFamily: 'var(--font-sora)' }}
              >
                {formatCurrency(total, currency as never)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Lista de reservas ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div
              key={i}
              className="rounded-2xl animate-pulse"
              style={{ height: 200, background: 'var(--bg-subtle)' }}
            />
          ))}
        </div>
      ) : reservations.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-16 text-center"
          style={{
            background: 'var(--bg-card)',
            border:     '1px solid var(--border)',
            boxShadow:  CARD_SHADOW,
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(109,59,215,0.08)' }}
          >
            <Archive size={24} style={{ color: 'var(--brand-500)' }} />
          </div>
          <p className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
            No tenés reservas todavía
          </p>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)', maxWidth: 300 }}>
            Apartá dinero para un fin específico sin mezclarlo con tu saldo disponible. No se registra como gasto.
          </p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={13} />
            Nueva reserva
          </Button>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {reservations.map(r => (
            <motion.div key={r.id} variants={staggerItem}>
              <ReservationCard
                reservation={r}
                wallet={r.wallet_id ? walletMap[r.wallet_id] : undefined}
                onDeposit={res => setDepositTarget(res)}
                onWithdraw={res => setWithdrawTarget(res)}
                onHistory={res => setHistoryTarget(res)}
                onEdit={res => setEditing(res)}
                onCancel={res => setCancelTarget(res)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── Modales ── */}
      <CreateReservationModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        wallets={wallets}
        onSave={handleCreate}
      />

      <CreateReservationModal
        open={!!editing}
        onClose={() => setEditing(null)}
        wallets={wallets}
        editing={editing}
        onSave={handleEdit}
      />

      <MovementModal
        open={!!depositTarget}
        onClose={() => setDepositTarget(null)}
        mode="deposit"
        reservation={depositTarget ?? { name: '', amount: 0, currency: 'ARS', status: 'active' }}
        walletBalance={depositWalletBalance}
        onConfirm={handleDeposit}
      />

      <MovementModal
        open={!!withdrawTarget}
        onClose={() => setWithdrawTarget(null)}
        mode="withdrawal"
        reservation={withdrawTarget ?? { name: '', amount: 0, currency: 'ARS', status: 'active' }}
        onConfirm={handleWithdraw}
      />

      <HistoryModal
        open={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
        reservation={historyTarget}
      />

      {/* Modal cancelar */}
      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancelar reserva"
        size="sm"
      >
        <div className="space-y-4">
          {cancelTarget && cancelTarget.amount > 0 && (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{
                background: 'var(--expense-50)',
                color:      'var(--expense-600)',
                border:     '1px solid var(--expense-100)',
              }}
            >
              Esta reserva tiene <strong>{formatCurrency(cancelTarget.amount, cancelTarget.currency as never)}</strong> apartados.
              Al cancelarla el dinero <strong>no vuelve automáticamente</strong> a la billetera. Primero retirá el monto completo.
            </div>
          )}
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            ¿Confirmás que querés cancelar la reserva{' '}
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {cancelTarget?.name}
            </span>
            ?
          </p>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setCancelTarget(null)} className="flex-1" disabled={cancelling}>
              Volver
            </Button>
            <Button
              variant="danger"
              onClick={handleCancel}
              loading={cancelling}
              className="flex-1"
              disabled={!!(cancelTarget?.amount && cancelTarget.amount > 0)}
            >
              Cancelar reserva
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
