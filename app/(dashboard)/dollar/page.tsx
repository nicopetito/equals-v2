'use client'

import { useState, useMemo, useRef } from 'react'
import {
  RefreshCw, DollarSign, Clock, Info, ArrowLeftRight, ChevronRight,
} from 'lucide-react'
import { PageHeader }      from '@/components/ui/PageHeader'
import { HelpButton }      from '@/components/help/HelpButton'
import { Button }          from '@/components/ui/Button'
import { Select }          from '@/components/ui/Select'
import { useDollar }       from '@/hooks/useDollar'
import { useWallets }      from '@/hooks/useWallets'
import { useToast }        from '@/components/providers/ToastProvider'
import { exchangeService } from '@/services/exchange.service'
import { calculateExchange, formatCurrency, formatAmount, safeNumber } from '@/utils/format'

const RATE_META: Record<string, { label: string; description: string; color: string; bg: string }> = {
  'Oficial':      { label: 'Oficial',      description: 'Banco Central',     color: '#6d3bd7', bg: 'rgba(109,59,215,0.10)' },
  'Blue':         { label: 'Blue',         description: 'Mercado informal',   color: '#F43F5E', bg: '#FFF1F2'               },
  'Euro Oficial': { label: 'Euro Oficial', description: 'Euro oficial',       color: '#F59E0B', bg: '#FFFBEB'               },
  'Euro Blue':    { label: 'Euro Blue',    description: 'Euro informal',      color: '#10B981', bg: '#ECFDF5'               },
}

function getMeta(currency: string) {
  return RATE_META[currency] ?? { label: currency, description: 'Cotización', color: '#6d3bd7', bg: 'rgba(109,59,215,0.10)' }
}

type Direction     = 'ars_to_usd' | 'usd_to_ars' | 'ars_to_eur' | 'eur_to_ars'
type OperationType = 'compra' | 'venta'

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: 'ars_to_usd', label: 'Pesos → Dólares' },
  { value: 'usd_to_ars', label: 'Dólares → Pesos' },
  { value: 'ars_to_eur', label: 'Pesos → Euros'   },
  { value: 'eur_to_ars', label: 'Euros → Pesos'    },
]

function getCurrencies(d: Direction): { from: 'ARS' | 'USD' | 'EUR'; to: 'ARS' | 'USD' | 'EUR' } {
  if (d === 'ars_to_usd') return { from: 'ARS', to: 'USD' }
  if (d === 'usd_to_ars') return { from: 'USD', to: 'ARS' }
  if (d === 'ars_to_eur') return { from: 'ARS', to: 'EUR' }
  return                          { from: 'EUR', to: 'ARS' }
}

function isEurDirection(d: Direction) { return d === 'ars_to_eur' || d === 'eur_to_ars' }
function isUsdDirection(d: Direction) { return d === 'ars_to_usd' || d === 'usd_to_ars' }

export default function DollarPage() {
  const { data: rates, loading, error, refetch } = useDollar(60_000)
  const { data: wallets, refetch: refetchWallets } = useWallets()
  const { addToast } = useToast()
  const converterRef = useRef<HTMLDivElement>(null)

  // ── Converter state ───────────────────────────────────────────────────────
  const [direction,       setDirection]       = useState<Direction>('ars_to_usd')
  const [selectedRateKey, setSelectedRateKey] = useState('')       // '' = no preset (manual)
  const [operationType,   setOperationType]   = useState<OperationType>('venta')
  const [rateValue,       setRateValue]       = useState('')       // always editable
  const [amount,          setAmount]          = useState('')
  const [fromWalletId,    setFromWalletId]    = useState('')
  const [toWalletId,      setToWalletId]      = useState('')
  const [saving,          setSaving]          = useState(false)
  const [formError,       setFormError]       = useState<string | null>(null)

  // ── Computed ──────────────────────────────────────────────────────────────
  const ratesMap = useMemo(
    () => Object.fromEntries(rates.map(r => [r.currency, r])),
    [rates]
  )

  const { from: fromCurrency, to: toCurrency } = getCurrencies(direction)
  const effectiveRate = safeNumber(rateValue)
  const numericAmount = safeNumber(amount)
  const resultAmount  = calculateExchange(
    numericAmount,
    effectiveRate,
    // EUR directions use same math as USD (divide or multiply by rate)
    isEurDirection(direction) ? (direction === 'ars_to_eur' ? 'ars_to_usd' : 'usd_to_ars') : direction
  )

  // Only show rates relevant to the current conversion direction
  const relevantRates = useMemo(() => {
    if (isUsdDirection(direction))
      return rates.filter(r => r.currency === 'Oficial' || r.currency === 'Blue')
    return rates.filter(r => r.currency === 'Euro Oficial' || r.currency === 'Euro Blue')
  }, [rates, direction])

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

  // ── Handlers ──────────────────────────────────────────────────────────────
  function applyRate(currency: string, op: OperationType) {
    const r = ratesMap[currency]
    if (!r) return
    setSelectedRateKey(currency)
    setRateValue(String(op === 'compra' ? r.buy : r.sell))
  }

  function handleSelectRate(currency: string) {
    applyRate(currency, operationType)
    converterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleOpChange(op: OperationType) {
    setOperationType(op)
    if (selectedRateKey) applyRate(selectedRateKey, op)
  }

  function handleRateInput(val: string) {
    setRateValue(val)
    setSelectedRateKey('') // typing manually clears preset selection
  }

  function handleDirectionChange(d: Direction) {
    setDirection(d)
    setFromWalletId('')
    setToWalletId('')
    setFormError(null)
    // Limpiar cotización si no aplica a la nueva dirección
    const switchingToEur = isEurDirection(d)  && isUsdDirection(direction)
    const switchingToUsd = isUsdDirection(d)  && isEurDirection(direction)
    if (switchingToEur || switchingToUsd) {
      setSelectedRateKey('')
      setRateValue('')
    }
  }

  function validate(): string | null {
    if (numericAmount <= 0)          return 'Ingresá un monto válido mayor a 0'
    if (!fromWalletId)               return 'Seleccioná la billetera de origen'
    if (!toWalletId)                 return 'Seleccioná la billetera de destino'
    if (fromWalletId === toWalletId) return 'Las billeteras de origen y destino deben ser diferentes'
    if (effectiveRate <= 0)          return 'Ingresá una cotización válida mayor a 0'
    const bal = safeNumber(selectedFromWallet?.current_balance)
    if (bal < numericAmount)
      return `Saldo insuficiente. Disponible: ${formatCurrency(bal, fromCurrency)}`
    return null
  }

  async function handleConfirm() {
    const err = validate()
    if (err) { setFormError(err); return }
    setSaving(true)
    setFormError(null)
    try {
      await exchangeService.createConversionAtomic({
        fromWalletId,
        toWalletId,
        fromAmount:   numericAmount,
        toAmount:     resultAmount,
        fromCurrency: fromCurrency as 'ARS' | 'USD' | 'EUR',
        toCurrency:   toCurrency   as 'ARS' | 'USD' | 'EUR',
        exchangeRate: effectiveRate,
        exchangeType: selectedRateKey || 'Manual',
        operationType,
        date: new Date().toISOString().split('T')[0],
      })
      addToast('Conversión realizada exitosamente', 'success')
      refetchWallets()
      setAmount('')
      setFromWalletId('')
      setToWalletId('')
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error al procesar la conversión')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 md:p-7 max-w-3xl mx-auto space-y-5 animate-fade-in">

      {/* Header */}
      <PageHeader
        title="Cotización del Dólar"
        subtitle="Datos en tiempo real · Argentina"
        icon={DollarSign}
        color="#0EA5E9"
        layout="split"
      >
        <HelpButton section="dollar" />
        <button
          onClick={refetch}
          className="hero-btn hero-btn-secondary"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </PageHeader>

      {/* Error banner */}
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2"
          style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}
        >
          <Info size={15} />
          Error al cargar las cotizaciones. Intentá actualizar.
        </div>
      )}

      {/* ── CARD 1: Todas las cotizaciones ───────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        {/* Card header */}
        <div
          className="px-5 py-3.5 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <DollarSign size={15} style={{ color: 'var(--brand-500)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Cotizaciones del día
            </span>
          </div>
          {rates[0] && (
            <div className="flex items-center gap-1.5" style={{ color: 'var(--text-faint)' }}>
              <Clock size={11} />
              <span className="text-xs">
                {new Date(rates[0].timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        {/* Skeleton */}
        {loading && rates.length === 0 ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="h-14 rounded-xl animate-pulse"
                style={{ background: 'var(--bg-subtle)' }}
              />
            ))}
          </div>
        ) : (
          /* Rate rows */
          <div>
            {rates.map((rate, idx) => {
              const meta      = getMeta(rate.currency)
              const spread    = rate.sell - rate.buy
              const spreadPct = rate.buy > 0 ? (spread / rate.buy) * 100 : 0
              const isActive  = selectedRateKey === rate.currency
              return (
                <div
                  key={rate.currency}
                  className="px-5 py-3.5 flex items-center gap-3 transition-colors"
                  style={{
                    background: isActive ? `${meta.color}08` : 'transparent',
                    borderTop: idx === 0 ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {/* Color dot + name */}
                  <div className="flex items-center gap-2 w-28 shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta.color }} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                        {meta.label}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-faint)' }}>
                        {meta.description}
                      </p>
                    </div>
                  </div>

                  {/* Compra */}
                  <div className="flex-1 text-center">
                    <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--income-600)' }}>Compra</p>
                    <p className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--income-600)' }}>
                      ${formatAmount(rate.buy)}
                    </p>
                  </div>

                  {/* Venta */}
                  <div className="flex-1 text-center">
                    <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--expense-600)' }}>Venta</p>
                    <p className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--expense-600)' }}>
                      ${formatAmount(rate.sell)}
                    </p>
                  </div>

                  {/* Spread */}
                  <div className="hidden sm:block w-14 text-center">
                    <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Spread</p>
                    <p className="text-xs font-semibold tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {spreadPct.toFixed(1)}%
                    </p>
                  </div>

                  {/* Usar button */}
                  <button
                    onClick={() => handleSelectRate(rate.currency)}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:-translate-y-px"
                    style={{
                      background: isActive ? meta.bg : 'var(--bg-subtle)',
                      color:      isActive ? meta.color : 'var(--text-muted)',
                      border:     `1px solid ${isActive ? `${meta.color}40` : 'var(--border)'}`,
                    }}
                  >
                    {isActive ? 'Usando' : 'Usar'}
                    {!isActive && <ChevronRight size={10} />}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── CARD 2: Conversor inline ──────────────────────────────────────── */}
      <div
        ref={converterRef}
        className="rounded-2xl p-5 space-y-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(109,59,215,0.10)' }}
          >
            <ArrowLeftRight size={15} style={{ color: 'var(--brand-500)' }} />
          </div>
          <div>
            <h2 className="text-sm font-extrabold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
              Convertir divisas
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Conversión interna entre billeteras
            </p>
          </div>
        </div>

        {/* Direction toggle — grilla 2×2 */}
        <div
          className="grid grid-cols-2 gap-1 rounded-xl p-1"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
        >
          {DIRECTIONS.map(d => (
            <button
              key={d.value}
              onClick={() => handleDirectionChange(d.value)}
              className="py-2.5 text-xs font-bold rounded-lg transition-all duration-150"
              style={
                direction === d.value
                  ? { background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)', color: 'white', boxShadow: '0 2px 8px rgba(109,59,215,0.25)' }
                  : { color: 'var(--text-muted)' }
              }
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Cotización: pills + input siempre visible */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Cotización
            </label>
            {/* Compra / Venta toggle — visible cuando hay un preset activo */}
            {selectedRateKey && (
              <div className="flex gap-1">
                {(['compra', 'venta'] as const).map(op => (
                  <button
                    key={op}
                    onClick={() => handleOpChange(op)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg transition-all"
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

          {/* Rate pills — filtradas por dirección activa */}
          <div className="flex flex-wrap gap-2">
            {relevantRates.map(r => {
              const meta     = getMeta(r.currency)
              const isActive = selectedRateKey === r.currency
              return (
                <button
                  key={r.currency}
                  onClick={() => handleSelectRate(r.currency)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:-translate-y-px"
                  style={{
                    background: isActive ? meta.bg : 'var(--bg-subtle)',
                    color:      isActive ? meta.color : 'var(--text-muted)',
                    border:     `1px solid ${isActive ? `${meta.color}40` : 'var(--border)'}`,
                  }}
                >
                  {r.currency}
                </button>
              )
            })}
          </div>

          {/* Input de cotización — siempre visible */}
          <div className="relative">
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
              placeholder={selectedRateKey ? '' : 'Ingresá cotización manual...'}
              value={rateValue}
              onChange={e => handleRateInput(e.target.value)}
              className="w-full pl-8 pr-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-violet-200"
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${selectedRateKey ? 'var(--brand-100)' : 'var(--border)'}`,
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-xs)',
              }}
            />
            {selectedRateKey && (
              <span
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold pointer-events-none"
                style={{ color: 'var(--text-faint)' }}
              >
                {selectedRateKey} {operationType}
              </span>
            )}
          </div>
        </div>

        {/* Monto */}
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: 'var(--text-muted)' }}
          >
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
              className="w-full rounded-xl text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-violet-200"
              style={{
                paddingLeft:   fromCurrency === 'ARS' ? '2rem' : '2.8rem',
                paddingRight:  '1rem',
                paddingTop:    '0.625rem',
                paddingBottom: '0.625rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-xs)',
              }}
            />
          </div>
        </div>

        {/* Billeteras */}
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

        {/* Preview — visible solo cuando hay monto y cotización */}
        {numericAmount > 0 && effectiveRate > 0 && (
          <div
            className="rounded-2xl p-4 space-y-2.5"
            style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-100)' }}
          >
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--brand-500)' }}>
              Resumen
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
              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {selectedRateKey ? `${selectedRateKey} ${operationType}` : 'Manual'} · ${formatAmount(effectiveRate)}
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {formError && (
          <div
            className="rounded-xl px-3 py-2.5 text-xs font-medium"
            style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}
          >
            {formError}
          </div>
        )}

        {/* Confirmar */}
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
      </div>

      {/* Nota informativa */}
      <div
        className="rounded-xl px-4 py-3 flex gap-2"
        style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-100)' }}
      >
        <Info size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--brand-500)' }} />
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Cotizaciones obtenidas de <strong>Bluelytics API</strong>. Se actualizan automáticamente cada 60 segundos.
          Los valores son aproximados y no constituyen asesoramiento financiero.
        </p>
      </div>
    </div>
  )
}
