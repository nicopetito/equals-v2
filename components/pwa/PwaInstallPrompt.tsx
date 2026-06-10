'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Download, Share, X } from 'lucide-react'
import { usePwaInstallPrompt } from '@/hooks/usePwaInstallPrompt'

export function PwaInstallPrompt() {
  const { showPrompt, isIOS, isInstalling, handleInstall, handleDismiss } =
    usePwaInstallPrompt()

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          // Mobile: full-width bottom bar. Desktop: compact card bottom-right.
          className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[360px]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          role="dialog"
          aria-label="Instalar aplicación Equal"
          aria-live="polite"
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
            }}
            className="rounded-2xl p-4"
          >
            {/* Header row */}
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div
                className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                style={{
                  background: 'var(--income-50)',
                }}
              >
                <Download size={20} style={{ color: 'var(--income-500)' }} strokeWidth={2.5} />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p
                  className="text-sm font-semibold leading-tight"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
                >
                  Instalá la app
                </p>
                <p
                  className="text-xs mt-0.5 leading-snug"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Accedé más rápido desde tu pantalla de inicio
                </p>
              </div>

              {/* Dismiss X */}
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--text-faint)' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--bg-subtle)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                aria-label="Cerrar"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>

            {/* iOS instructions or action buttons */}
            {isIOS ? (
              <div
                className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{ background: 'var(--bg-subtle)' }}
              >
                <Share size={14} style={{ color: 'var(--income-500)', flexShrink: 0 }} strokeWidth={2.5} />
                <p className="text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>
                  Tocá{' '}
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Compartir
                  </span>{' '}
                  y luego{' '}
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    &quot;Agregar a inicio&quot;
                  </span>
                </p>
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  onClick={handleDismiss}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-secondary)'
                    e.currentTarget.style.background = 'var(--bg-subtle)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-muted)'
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  Ahora no
                </button>

                <button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg text-white transition-opacity disabled:opacity-60"
                  style={{
                    background: 'var(--grad-income)',
                    boxShadow: 'var(--shadow-income)',
                    fontFamily: 'var(--font-sora)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isInstalling) e.currentTarget.style.opacity = '0.88'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1'
                  }}
                >
                  {isInstalling ? (
                    <>
                      <span
                        className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin"
                        aria-hidden
                      />
                      Instalando
                    </>
                  ) : (
                    <>
                      <Download size={13} strokeWidth={2.5} aria-hidden />
                      Instalar
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
