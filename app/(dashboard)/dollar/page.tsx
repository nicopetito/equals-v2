'use client'

import { RefreshCw, TrendingUp, DollarSign, Clock } from 'lucide-react'
import { useDollar } from '@/hooks/useDollar'
import { formatAmount } from '@/utils/format'

export default function DollarPage() {
  const { data: rates, loading, error, refetch } = useDollar(60_000)

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cotización del Dólar</h1>
          <p className="text-gray-500 text-sm mt-1">Datos en tiempo real · Argentina</p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
          Error al cargar las cotizaciones. Intentá actualizar.
        </div>
      )}

      {loading && rates.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 animate-pulse">
              <div className="h-5 bg-gray-800 rounded w-1/3 mb-4" />
              <div className="h-8 bg-gray-800 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rates.map((rate) => (
            <div
              key={rate.currency}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <DollarSign size={18} className="text-emerald-400" />
                </div>
                <h2 className="font-semibold text-gray-200">{rate.currency}</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Compra</p>
                  <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                    $ {formatAmount(rate.buy)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Venta</p>
                  <p className="text-2xl font-bold text-red-400 tabular-nums">
                    $ {formatAmount(rate.sell)}
                  </p>
                </div>
              </div>

              {rate.sell > 0 && rate.buy > 0 && (
                <div className="pt-3 border-t border-gray-800">
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <TrendingUp size={12} />
                    Spread: $ {formatAmount(rate.sell - rate.buy)} ({(((rate.sell - rate.buy) / rate.buy) * 100).toFixed(1)}%)
                  </p>
                </div>
              )}

              <div className="mt-3 flex items-center gap-1 text-xs text-gray-700">
                <Clock size={11} />
                {new Date(rate.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-600">
          Cotizaciones obtenidas de{' '}
          <span className="text-gray-500 font-medium">Bluelytics API</span>. Se actualizan automáticamente cada 60 segundos. Los valores son aproximados y pueden variar.
        </p>
      </div>
    </div>
  )
}
