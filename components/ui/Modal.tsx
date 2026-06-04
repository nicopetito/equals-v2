'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { modalOverlay, modalContent, modalSheet } from '@/utils/animations'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* ── Overlay ── */}
          <motion.div
            key="modal-overlay"
            variants={modalOverlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 9998,
              background: 'rgba(248, 250, 252, 0.35)',
              backdropFilter: 'blur(3px) saturate(110%)',
              WebkitBackdropFilter: 'blur(3px) saturate(110%)',
            }}
          />

          {/* ── Modal container — bottom-sheet en mobile, centrado en sm+ ── */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              padding: '0 0 0',
              pointerEvents: 'none',
            }}
            className="sm:items-center sm:px-4 sm:py-8"
          >
            <motion.div
              key="modal-panel"
              variants={isMobile ? modalSheet : modalContent}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={cn(
                'relative w-full flex flex-col',
                'rounded-t-2xl rounded-b-none sm:rounded-xl',
                SIZES[size]
              )}
              style={{
                maxHeight: isMobile
                  ? 'calc(92vh - env(safe-area-inset-bottom,0px))'
                  : 'calc(100vh - 4rem)',
                overflow: 'hidden',
                pointerEvents: 'auto',
                background: 'rgba(255, 255, 255, 0.97)',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                boxShadow: '0 24px 70px rgba(15, 23, 42, 0.14), 0 4px 16px rgba(15, 23, 42, 0.06)',
              }}
            >
              {/* Handle bar — solo mobile */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
              </div>

              {title && (
                <div
                  className="flex items-center justify-between px-5 py-3 shrink-0"
                  style={{
                    background: 'rgba(109, 59, 215, 0.08)',
                    borderBottom: '1px solid rgba(109, 59, 215, 0.15)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-[3px] h-4 rounded-full"
                      style={{ background: 'linear-gradient(180deg, #6d3bd7 0%, #0566d9 100%)' }}
                    />
                    <h2
                      className="text-sm font-bold tracking-tight"
                      style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
                    >
                      {title}
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    aria-label="Cerrar"
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150"
                    style={{ color: 'var(--text-faint)' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(109,59,215,0.06)'
                      e.currentTarget.style.color = 'var(--brand-500)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--text-faint)'
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div
                className="flex-1 overflow-y-auto p-4 sm:p-5"
                style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom,0px))' }}
              >
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
