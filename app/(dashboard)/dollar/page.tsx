'use client'

import { RefreshCw, DollarSign, Clock, TrendingUp, Info } from 'lucide-react'
import { useDollar } from '@/hooks/useDollar'
import { formatAmount } from '@/utils/format'

const RATE_META: Record<string, { label: string; description: string; color: string; bg: string }> = {
  'Dólar Oficial':  { label: 'Oficial',  description: 'Cotización oficial del Banco Central',        color: '#6366F1', bg: '#EEF2FF' },
  'Dólar Blue':     { label: 'Blue',     description: 'Mercado informal / paralelo',                  color: '#F43F5E', bg: '#FFF1F2' },
  'Dólar CCL':      { label: 'CCL',      description: 'Contado con Liquidación',                      color: '#F59E0B', bg: '#FFFBEB' },
  'Dólar MEP':      { label: 'MEP',      description: 'Mercado Electrónico de Pagos (Bolsa)',          color: '#10B981', bg: '#ECFDF5' },
  'Dólar Cripto':   { label: 'Cripto',   description: 'Tipo de cambio implícito en criptomonedas',   color: '#8B5CF6', bg: '#F5F3FF' },
  'Dólar Tarjeta':  { label: 'Tarjeta',  description: 'Con recargo para compras en el exterior',     color: '#0EA5E9', bg: '#F0F9FF' },
}

function getMeta(currency: string) {
  return RATE_META[currency] ?? { label: currency, description: 'Cotización', color: '#6366F1', bg: '#EEF2FF' }
}

export default function DollarPage() {
  const { data: rates, loading, error, refetch } = useDollar(60_000)

  return (
    <div className="p-5 md:p-7 max-w-3xl mx-auto space-y-6 animate-fade-in">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Cotización del Dólar
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Datos en tiempo real · Argentina
          </p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-px"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--brand-500)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2"
          style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}
        >
          <Info size={15} />
          Error al cargar las cotizaciones. Intentá actualizar.
        </div>
      )}

      {/* Cards de cotización */}
      {loading && rates.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="rounded-2xl p-6 animate-pulse"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', height: 160 }}
            >
              <div className="h-4 bg-slate-100 rounded w-1/3 mb-4" />
              <div className="h-8 bg-slate-100 rounded w-2/3 mb-2" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rates.map(rate => {
            const meta = getMeta(rate.currency)
            const spread = rate.sell - rate.buy
            const spreadPct = rate.buy > 0 ? (spread / rate.buy) * 100 : 0
            return (
              <div
                key={rate.currency}
                className="rounded-2xl p-5 transition-all hover:-translate-y-0.5"
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${meta.color}20`,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: meta.bg }}
                    >
                      <DollarSign size={19} style={{ color: meta.color }} />
                    </div>
                    <div>
                      <p className="font-extrabold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {meta.label}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {meta.description}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-lg"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    USD
                  </span>
                </div>

                {/* Compra / Venta */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div
                    className="rounded-xl p-3"
                    style={{ background: 'var(--income-50)', border: '1px solid var(--income-100)' }}
                  >
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--income-600)' }}>
                      Compra
                    </p>
                    <p className="text-xl font-extrabold tabular-nums" style={{ color: 'var(--income-600)' }}>
                      $ {formatAmount(rate.buy)}
                    </p>
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{ background: 'var(--expense-50)', border: '1px solid var(--expense-100)' }}
                  >
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--expense-600)' }}>
                      Venta
                    </p>
                    <p className="text-xl font-extrabold tabular-nums" style={{ color: 'var(--expense-600)' }}>
                      $ {formatAmount(rate.sell)}
                    </p>
                  </div>
                </div>

                {/* Spread */}
                {spread > 0 && (
                  <div
                    className="rounded-xl px-3 py-2 flex items-center justify-between"
                    style={{ background: 'var(--bg-subtle)' }}
                  >
                    <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <TrendingUp size={11} style={{ color: meta.color }} />
                      Spread
                    </span>
                    <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                      $ {formatAmount(spread)} ({spreadPct.toFixed(1)}%)
                    </span>
                  </div>
                )}

                {/* Timestamp */}
                <div className="mt-2.5 flex items-center gap-1" style={{ color: 'var(--text-faint)' }}>
                  <Clock size={10} />
                  <span className="text-xs">
                    Actualizado: {new Date(rate.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Nota informativa */}
      <div
        className="rounded-xl px-4 py-3 flex gap-2"
        style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-100)' }}
      >
        <Info size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--brand-500)' }} />
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Cotizaciones obtenidas de <strong>Bluelytics API</strong>. Se actualizan automáticamente cada 60 segundos.
          Los valores son aproximados y pueden variar. No constituyen asesoramiento financiero.
        </p>
      </div>
    </div>
  )
}
