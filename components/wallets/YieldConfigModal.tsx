'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from 'react'
import { TrendingUp } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/providers/ToastProvider'
import { walletsService } from '@/services/wallets.service'
import type { WalletWithBalance } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  wallet: WalletWithBalance | null
  onSuccess: () => void
}

export function YieldConfigModal({ open, onClose, wallet, onSuccess }: Props) {
  const { addToast } = useToast()
  const [generatesYield, setGeneratesYield] = useState(false)
  const [annualRate, setAnnualRate]         = useState('')
  const [frequency, setFrequency]           = useState<'daily' | 'business_days'>('daily')
  const [loading, setLoading]               = useState(false)

  useEffect(() => {
    if (wallet && open) {
      setGeneratesYield(wallet.generates_yield ?? false)
      setAnnualRate(wallet.annual_yield_rate ? String(wallet.annual_yield_rate) : '')
      setFrequency((wallet.yield_frequency as 'daily' | 'business_days') ?? 'daily')
    }
  }, [wallet, open])

  const handleSave = async () => {
    if (!wallet?.id) return
    const rate = parseFloat(annualRate)
    if (generatesYield && (isNaN(rate) || rate <= 0 || rate > 1000)) {
      addToast('Ingresá una tasa válida entre 0.01% y 1000%', 'error')
      return
    }

    setLoading(true)
    try {
      await walletsService.updateYieldSettings(wallet.id, {
        generates_yield:   generatesYield,
        yield_mode:        'estimated',
        annual_yield_rate: generatesYield ? rate : null,
        yield_frequency:   frequency,
      })
      addToast('Configuración de rendimiento guardada', 'success')
      onSuccess()
      onClose()
    } catch {
      addToast('Error al guardar la configuración', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!wallet) return null

  const dailyEstimate = generatesYield && parseFloat(annualRate) > 0
    ? ((wallet.current_balance ?? 0) * (parseFloat(annualRate) / 100) / 365).toFixed(2)
    : null

  return (
    <Modal open={open} onClose={onClose} title="Configurar rendimiento">
      <div className="space-y-5">

        <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)]">
          <div>
            <p className="font-medium text-[var(--text-primary)] text-sm">Genera rendimiento</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Activá si esta billetera genera intereses (ej: Mercado Pago, Ualá)</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={generatesYield}
            onClick={() => setGeneratesYield(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${generatesYield ? 'bg-[var(--brand-500)]' : 'bg-[var(--border)]'}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm ${generatesYield ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {generatesYield && (
          <>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Tasa anual estimada (% TNA)
              </label>
              <Input
                type="number"
                min="0.01"
                max="1000"
                step="0.01"
                placeholder="Ej: 35"
                value={annualRate}
                onChange={e => setAnnualRate(e.target.value)}
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Para Mercado Pago: revisá la app o web. Ualá: 35% TNA es una referencia habitual.
              </p>
            </div>

            <Select
              label="Frecuencia de acreditación"
              value={frequency}
              onChange={e => setFrequency(e.target.value as 'daily' | 'business_days')}
              options={[
                { value: 'daily', label: 'Diaria (todos los días)' },
                { value: 'business_days', label: 'Días hábiles (lunes acumula fin de semana)' },
              ]}
            />

            {dailyEstimate && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--brand-500)]/8 border border-[var(--brand-500)]/20">
                <TrendingUp size={16} className="text-[var(--brand-500)] shrink-0" />
                <p className="text-sm text-[var(--text-secondary)]">
                  Con el saldo actual estimarías ~<span className="font-semibold text-[var(--brand-500)]">${dailyEstimate}</span> por día
                </p>
              </div>
            )}
          </>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button variant="primary" size="sm" loading={loading} onClick={handleSave} className="flex-1">
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
