'use client'

import { RefreshCw, TrendingUp, DollarSign, Clock } from 'lucide-react'
import { useDollar } from '@/hooks/useDollar'
import { formatAmount } from '@/utils/format'

const CARD_STYLE = { background: '#fff', boxShadow: '0 2px 4px rgba(70,51,151,0.08)', border: '1px solid #f3f0ff' }

export default function DollarPage() {
  const { data: rates, loading, error, refetch } = useDollar(60_000)

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#463397' }}>Cotización del Dólar</h1>
          <p className="text-gray-500 text-sm mt-1">Datos en tiempo real · Argentina</p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-violet-200 rounded-xl text-sm font-semibold transition-all hover:bg-violet-50"
          style={{ color: '#463397' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          Error al cargar las cotizaciones. Intentá actualizar.
        </div>
      )}

      {loading && rates.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="rounded-2xl p-6 animate-pulse" style={CARD_STYLE}>
              <div className="h-5 bg-gray-100 rounded w-1/3 mb-4" />
              <div className="h-8 bg-gray-100 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rates.map(rate => (
            <div key={rate.currency} className="rounded-2xl p-6 hover:border-violet-300 transition-all hover:-translate-y-0.5" style={CARD_STYLE}>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg,rgba(70,51,151,0.12),rgba(152,80,235,0.12))' }}>
                  <DollarSign size={20} style={{ color: '#463397' }} />
                </div>
                <h2 className="font-bold text-gray-800">{rate.currency}</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1 font-medium">Compra</p>
                  <p className="text-2xl font-bold tabular-nums text-emerald-600">$ {formatAmount(rate.buy)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1 font-medium">Venta</p>
                  <p className="text-2xl font-bold tabular-nums text-red-500">$ {formatAmount(rate.sell)}</p>
                </div>
              </div>
              {rate.sell > 0 && rate.buy > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <TrendingUp size={12} style={{ color: '#463397' }} />
                    Spread: $ {formatAmount(rate.sell - rate.buy)} ({(((rate.sell - rate.buy) / rate.buy) * 100).toFixed(1)}%)
                  </p>
                </div>
              )}
              <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                <Clock size={11} />
                {new Date(rate.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
        <p className="text-xs text-gray-500">
          Cotizaciones obtenidas de <span className="font-semibold" style={{ color: '#463397' }}>Bluelytics API</span>. Se actualizan automáticamente cada 60 segundos. Los valores son aproximados y pueden variar.
        </p>
      </div>
    </div>
  )
}
