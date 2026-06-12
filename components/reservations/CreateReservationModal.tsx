'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { Reservation, WalletWithBalance } from '@/types'
import { getErrorMessage } from '@/utils/errors'

const CURRENCY_OPTS = [
  { value: 'ARS',    label: 'ARS — Peso argentino' },
  { value: 'USD',    label: 'USD — Dólar'          },
  { value: 'EUR',    label: 'EUR — Euro'            },
  { value: 'CRYPTO', label: 'CRYPTO'                },
]

interface Props {
  open:       boolean
  onClose:    () => void
  wallets:    WalletWithBalance[]
  editing?:   Reservation | null
  onSave:     (data: Omit<Reservation, 'id' | 'user_id' | 'amount' | 'status' | 'created_at' | 'updated_at'>) => Promise<void>
}

export function CreateReservationModal({ open, onClose, wallets, editing, onSave }: Props) {
  const [name, setName]         = useState(editing?.name ?? '')
  const [description, setDesc]  = useState(editing?.description ?? '')
  const [walletId, setWalletId] = useState(editing?.wallet_id ?? '')
  const [currency, setCurrency] = useState(editing?.currency ?? 'ARS')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const walletOpts = wallets.map(w => ({
    value: w.id ?? '',
    label: `${w.name}${w.provider ? ` (${w.provider})` : ''} — ${w.currency}`,
  }))

  async function handleSave() {
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    if (!walletId)    { setError('Seleccioná una billetera'); return }

    setSaving(true)
    setError(null)
    try {
      await onSave({
        name:        name.trim(),
        description: description.trim() || null,
        wallet_id:   walletId,
        currency,
      })
      onClose()
    } catch (e) {
      setError(getErrorMessage(e, 'Error al guardar'))
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setName(editing?.name ?? '')
    setDesc(editing?.description ?? '')
    setWalletId(editing?.wallet_id ?? '')
    setCurrency(editing?.currency ?? 'ARS')
    setError(null)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={editing ? 'Editar reserva' : 'Nueva reserva'}
      size="sm"
    >
      <div className="space-y-4">
        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm font-medium"
            style={{
              background: 'var(--expense-50)',
              color:      'var(--expense-600)',
              border:     '1px solid var(--expense-100)',
            }}
          >
            {error}
          </div>
        )}

        <Input
          label="Nombre"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ej: Reserva Mercado Pago"
          autoFocus
        />

        <Input
          label="Descripción (opcional)"
          value={description}
          onChange={e => setDesc(e.target.value)}
          placeholder="Para qué es esta reserva"
        />

        <Select
          label="Billetera"
          value={walletId}
          options={walletOpts}
          onChange={e => setWalletId(e.target.value)}
          placeholder="Seleccioná una billetera"
          disabled={!!editing}
        />

        <Select
          label="Moneda"
          value={currency}
          options={CURRENCY_OPTS}
          onChange={e => setCurrency(e.target.value)}
          disabled={!!editing}
        />

        {!editing && (
          <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>
            💡 Depositar a una reserva no cuenta como gasto. El dinero sigue siendo tuyo, solo está apartado.
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" onClick={handleClose} className="flex-1" disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving} className="flex-1">
            {editing ? 'Guardar' : 'Crear reserva'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
