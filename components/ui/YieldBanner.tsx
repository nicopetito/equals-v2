'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, X, Settings } from 'lucide-react'

const STORAGE_KEY = 'eq_yield_onboarding_dismissed'

interface Props {
  onConfigure: () => void
}

export function YieldBanner({ onConfigure }: Props) {
  const [visible, setVisible]         = useState(false)
  const [hiddenForSession, setHidden] = useState(false)

  useEffect(() => {
    const dismissed = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'dismissed'
    setVisible(!dismissed)
  }, [])

  const dismissForever = () => {
    localStorage.setItem(STORAGE_KEY, 'dismissed')
    setVisible(false)
  }

  const dismissForSession = () => {
    setHidden(true)
  }

  if (!visible || hiddenForSession) return null

  return (
    <div className="rounded-2xl border border-[var(--brand-500)]/25 bg-gradient-to-r from-[var(--brand-500)]/8 to-[#0566d9]/8 p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-[var(--brand-500)]/15 flex items-center justify-center shrink-0 mt-0.5">
        <TrendingUp size={16} className="text-[var(--brand-500)]" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          Rendimientos automáticos estimados
        </p>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Ahora Equal puede estimar rendimientos diarios para billeteras como Mercado Pago o Ualá.
        </p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button
            type="button"
            onClick={onConfigure}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-[var(--brand-500)] hover:bg-[var(--brand-500)]/90 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Settings size={13} />
            Configurar billeteras
          </button>
          <button
            type="button"
            onClick={dismissForSession}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] px-2 py-1.5 transition-colors"
          >
            Más tarde
          </button>
          <button
            type="button"
            onClick={dismissForever}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] px-2 py-1.5 transition-colors"
          >
            No volver a mostrar
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={dismissForSession}
        className="text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors shrink-0"
        aria-label="Cerrar"
      >
        <X size={16} />
      </button>
    </div>
  )
}
