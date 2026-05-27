'use client'

import { useState, useMemo, useEffect } from 'react'
import { ArrowLeftRight, TrendingUp } from 'lucide-react'
import { Modal }            from '@/components/ui/Modal'
import { Button }           from '@/components/ui/Button'
import { Select }           from '@/components/ui/Select'
import { exchangeService }  from '@/services/exchange.service'
import { calculateExchange, formatCurrency, formatAmount, safeNumber } from '@/utils/format'
import { useToast }         from '@/components/providers/ToastProvider'
import type { DollarRate, WalletWithBalance } from '@/types'

interface ConversionModalProps {
  open: boolean
  onClose: () => void
  rates: DollarRate[]
  wallets: WalletWithBalance[]
  preselectedRate?: DollarRate
  onSuccess: () => void
}

type Direction    = 'ars_to_usd' | 'usd_to_ars'
type OperationType = 'compra' | 'venta'

export function ConversionModal({
  open,
  onClose,
  rates,
  wallets,
  preselectedRate,
  onSuccess,
}: ConversionModalProps) {
  const { addToast } = useToast()

  const [direction,       setDirection]       = useState<Direction>('ars_to_usd')
  const [fromWalletId,    setFromWalletId]    = useState('')
  const [toWalletId,      setToWalletId]      = useState('')
  const [amount,          setAmount]          = useState('')
  const [selectedRateKey, setSelectedRateKey] = useState('')
  const [manualRate,      setManualRate]      = useState('')
  const [operationType,   setOperationType]   = useState<OperationType>('venta')
  const [saving,          setSaving]          = useState(false)
  const [formError,       setFormError]       = useState<string | null>(null)

  // Sync preselected rate when it changes or modal opens
  useEffect(() => {
    if (preselectedRate) setSelectedRateKey(preselectedRate.currency)
  }, [preselectedRate])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setAmount('')
      setFromWalletId('')
      setToWalletId('')
      setManualRate('')
      setFormError(null)
      setOperationType('venta')
      setDirection('ars_to_usd')
      setSelectedRateKey(preselectedRate?.currency ?? '')
    }
  }, [open, preselectedRate])

  // ── Computed ────────────────────────────────────────────────────────────────

  const ratesMap = useMemo(
    () => Object.fromEntries(rates.map(r => [r.currency, r])),
    [rates]
  )

  const effectiveRate = useMemo((): number => {
    if (selectedRateKey === 'Manual') return safeNumber(manualRate)
    const rate = ratesMap[selectedRateKey]
    if (!rate) return 0
    return operationType === 'compra' ? rate.buy : rate.sell
  }, [selectedRateKey, manualRate, ratesMap, operationType])

  const numericAmount = useMemo(() => safeNumber(amount), [amount])

  const resultAmount = useMemo(
    () => calculateExchange(numericAmount, effectiveRate, direction),
    [numericAmount, effectiveRate, direction]
  )

  const fromCurrency = direction === 'ars_to_usd' ? 'ARS' : 'USD'
  const toCurrency   = direction === 'ars_to_usd' ? 'USD' : 'ARS'

  const fromWallets = useMemo(
    () => wallets.filter(w => w.currency === fromCurrency),
    [wallets, fromCurrency]
  )
  const toWallets = useMemo(
    () => wallets.filter(w => w.currency === toCurrency),
    [wallets, toCurrency]
  )

  const selectedFromWallet = useMemo(
    () => wallets.find(w => w.id === fromWalletId),
    [wallets, fromWalletId]
  )

  const spread = useMemo(() => {
    if (selectedRateKey === 'Manual' || !ratesMap[selectedRateKey]) return null
    const r = ratesMap[selectedRateKey]
    const s = r.sell - r.buy
    return { amount: s, pct: r.buy > 0 ? (s / r.buy) * 100 : 0 }
  }, [selectedRateKey, ratesMap])

  const noCompatibleWallets = fromWallets.length === 0 || toWallets.length === 0

  // ── Validation ───────────────────────────────────────────────────────────────

  function validate(): string | null {
    if (numericAmount <= 0)                return 'Ingresá un monto válido mayor a 0'
    if (!fromWalletId)                     return 'Seleccioná la billetera de origen'
    if (!toWalletId)                       return 'Seleccioná la billetera de destino'
    if (fromWalletId === toWalletId)       return 'Las billeteras de origen y destino deben ser diferentes'
    if (effectiveRate <= 0)                return 'La cotización debe ser mayor a 0'
    const balance = safeNumber(selectedFromWallet?.current_balance)
    if (balance < numericAmount)
      return `Saldo insuficiente. Disponible: ${formatCurrency(balance, fromCurrency)}`
    return null
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleConfirm() {
    const error = validate()
    if (error) { setFormError(error); return }
    setSaving(true)
    setFormError(null)
    try {
      await exchangeService.createConversionAtomic({
        fromWalletId,
        toWalletId,
        fromAmount:    numericAmount,
        toAmount:      resultAmount,
        fromCurrency:  fromCurrency as 'ARS' | 'USD',
        toCurrency:    toCurrency   as 'ARS' | 'USD',
        exchangeRate:  effectiveRate,
        exchangeType:  selectedRateKey === 'Manual' ? 'Manual' : selectedRateKey,
        operationType,
        date: new Date().toISOString().split('T')[0],
      })
      addToast('Conversión realizada exitosamente', 'success')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al procesar la conversión')
    } finally {
      setSaving(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function handleDirectionChange(d: Direction) {
    setDirection(d)
    setFromWalletId('')
    setToWalletId('')
    setFormError(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <Modal open={open} onClose={onClose} title="Convertir divisas" size="md">
      <div className="space-y-5">

        {/* 1 ─ Direction toggle */}
        <div
          className="flex rounded-xl p-1 gap-1"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
        >
          {(['ars_to_usd', 'usd_to_ars'] as Direction[]).map(d => (
            <button
              key={d}
              onClick={() => handleDirectionChange(d)}
              className="flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-150"
              style={
                direction === d
                  ? { background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)', color: 'white', boxShadow: '0 2px 8px rgba(109,59,215,0.25)' }
                  : { color: 'var(--text-muted)' }
              }
            >
              {d === 'ars_to_usd' ? 'Pesos → Dólares' : 'Dólares → Pesos'}
            </button>
          ))}
        </div>

        {/* Empty state — no compatible wallets */}
        {noCompatibleWallets ? (
          <div
            className="rounded-xl px-4 py-4 text-sm text-center"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            No tenés billeteras en {fromCurrency}/{toCurrency} suficientes para convertir.
          </div>
        ) : (
          <>
            {/* 2 ─ Amount input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Monto a convertir
              </label>
              <div className="relative">
                <span
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold pointer-events-none select-none"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {fromCurrency === 'ARS' ? '$' : 'US$'}
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0,00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full rounded-xl text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                  style={{
                    paddingLeft: fromCurrency === 'ARS' ? '2rem' : '2.8rem',
                    paddingRight: '1rem',
                    paddingTop: '0.625rem',
                    paddingBottom: '0.625rem',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                />
              </div>
            </div>

            {/* 3 ─ Rate selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Cotización
                </label>
                {selectedRateKey !== 'Manual' && selectedRateKey !== '' && (
                  <div className="flex gap-1">
                    {(['compra', 'venta'] as OperationType[]).map(op => (
                      <button
                        key={op}
                        onClick={() => setOperationType(op)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all"
                        style={
                          operationType === op
                            ? { background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)', color: 'white' }
                            : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                        }
                      >
                        {op === 'compra' ? 'Compra' : 'Venta'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {rates.map(r => (
                  <button
                    key={r.currency}
                    onClick={() => setSelectedRateKey(r.currency)}
                    className="rounded-xl p-3 text-left transition-all hover:-translate-y-px"
                    style={{
                      background: selectedRateKey === r.currency ? 'var(--brand-50)' : 'var(--bg-subtle)',
                      border: `1px solid ${selectedRateKey === r.currency ? 'var(--brand-100)' : 'var(--border)'}`,
                      boxShadow: selectedRateKey === r.currency ? '0 2px 8px rgba(109,59,215,0.12)' : 'none',
                    }}
                  >
                    <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                      {r.currency}
                    </p>
                    <p className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      C: ${formatAmount(r.buy)} · V: ${formatAmount(r.sell)}
                    </p>
                  </button>
                ))}

                {/* Manual option */}
                <button
                  onClick={() => setSelectedRateKey('Manual')}
                  className="rounded-xl p-3 text-left transition-all hover:-translate-y-px"
                  style={{
                    background: selectedRateKey === 'Manual' ? 'var(--brand-50)' : 'var(--bg-subtle)',
                    border: `1px solid ${selectedRateKey === 'Manual' ? 'var(--brand-100)' : 'var(--border)'}`,
                    boxShadow: selectedRateKey === 'Manual' ? '0 2px 8px rgba(109,59,215,0.12)' : 'none',
                  }}
                >
                  <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>Manual</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ingresá el valor</p>
                </button>
              </div>

              {selectedRateKey === 'Manual' && (
                <div className="mt-2 relative">
                  <span
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold pointer-events-none select-none"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Ej: 1.400"
                    value={manualRate}
                    onChange={e => setManualRate(e.target.value)}
                    className="w-full pl-7 pr-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--brand-100)',
                      color: 'var(--text-primary)',
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  />
                </div>
              )}
            </div>

            {/* 4 ─ Wallet selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Billetera origen"
                value={fromWalletId}
                onChange={e => setFromWalletId(e.target.value)}
                options={[
                  { value: '', label: 'Seleccioná...' },
                  ...fromWallets.map(w => ({
                    value: w.id!,
                    label: `${w.name} (${formatCurrency(w.current_balance, fromCurrency)})`,
                  })),
                ]}
              />
              <Select
                label="Billetera destino"
                value={toWalletId}
                onChange={e => setToWalletId(e.target.value)}
                options={[
                  { value: '', label: 'Seleccioná...' },
                  ...toWallets.map(w => ({
                    value: w.id!,
                    label: `${w.name} (${formatCurrency(w.current_balance, toCurrency)})`,
                  })),
                ]}
              />
            </div>

            {/* 5 ─ Preview card */}
            {numericAmount > 0 && effectiveRate > 0 && (
              <div
                className="rounded-2xl p-4 space-y-2.5"
                style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-100)' }}
              >
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--brand-500)' }}>
                  Resumen de la operación
                </p>
                <div className="flex justify-between items-center text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Entregás</span>
                  <span className="font-extrabold tabular-nums" style={{ color: 'var(--expense-600)' }}>
                    {formatCurrency(numericAmount, fromCurrency)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Recibís</span>
                  <span className="font-extrabold tabular-nums" style={{ color: 'var(--income-600)' }}>
                    {formatCurrency(resultAmount, toCurrency)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>Cotización usada</span>
                  <span className="font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {selectedRateKey}{selectedRateKey !== 'Manual' ? ` ${operationType}` : ''} · ${formatAmount(effectiveRate)}
                  </span>
                </div>
                {spread && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <TrendingUp size={10} style={{ color: 'var(--brand-500)' }} />
                      Spread
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      ${formatAmount(spread.amount)} ({spread.pct.toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 6 ─ Error + confirm */}
            {formError && (
              <div
                className="rounded-xl px-3 py-2.5 text-xs font-medium"
                style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}
              >
                {formError}
              </div>
            )}

            <Button
              variant="primary"
              className="w-full"
              loading={saving}
              disabled={saving}
              onClick={handleConfirm}
            >
              <ArrowLeftRight size={14} />
              Confirmar conversión
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}
