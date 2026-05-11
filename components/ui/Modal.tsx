'use client'

import { useEffect, type ReactNode } from 'react'
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
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: 'rgba(15,23,42,0.55)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative w-full flex flex-col max-h-[92vh] rounded-3xl overflow-hidden animate-fade-in',
          SIZES[size]
        )}
        style={{
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-light)',
        }}
      >
        {/* Header */}
        {title && (
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{ borderBottom: '1px solid var(--border-light)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-1.5 h-6 rounded-full"
                style={{ background: 'var(--grad-brand)' }}
              />
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-slate-100"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}
