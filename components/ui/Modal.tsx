'use client'

import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  // Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return createPortal(
    <>
      {/* ── Overlay: fixed to viewport, outside any stacking context ── */}
      <div
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

      {/* ── Modal container: centered over the overlay ── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          pointerEvents: 'none',
        }}
      >
        <div
          className={cn(
            'relative w-full flex flex-col animate-fade-in',
            SIZES[size]
          )}
          style={{
            maxHeight: '90vh',
            borderRadius: '1rem',
            overflow: 'hidden',
            pointerEvents: 'auto',
            background: 'rgba(255, 255, 255, 0.97)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            boxShadow: '0 24px 70px rgba(15, 23, 42, 0.14), 0 4px 16px rgba(15, 23, 42, 0.06)',
          }}
        >
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
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
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
                <X size={13} />
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5">{children}</div>
        </div>
      </div>
    </>,
    document.body
  )
}
