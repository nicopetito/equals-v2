'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X, BookOpen, Lightbulb, Zap, ArrowRight } from 'lucide-react'
import { helpContent, type HelpSection } from './helpContent'

interface HelpDrawerProps {
  open: boolean
  onClose: () => void
  section: keyof typeof helpContent
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p
        className="text-[10px] font-bold uppercase tracking-widest mb-2"
        style={{ color: 'var(--text-faint)' }}
      >
        {label}
      </p>
      {children}
    </div>
  )
}

function BulletList({ items, accent }: { items: string[]; accent: 'brand' | 'muted' }) {
  const dotColor = accent === 'brand' ? 'var(--brand-500)' : 'var(--text-faint)'
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span
            className="mt-[7px] w-[5px] h-[5px] rounded-full shrink-0"
            style={{ background: dotColor }}
          />
          <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {item}
          </span>
        </li>
      ))}
    </ul>
  )
}

function DrawerInner({ content, onClose }: { content: HelpSection; onClose: () => void }) {
  return (
    <>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 shrink-0"
        style={{
          background: 'rgba(109,59,215,0.06)',
          borderBottom: '1px solid rgba(109,59,215,0.12)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-[3px] h-5 rounded-full shrink-0"
            style={{ background: 'linear-gradient(180deg, #6d3bd7 0%, #0566d9 100%)' }}
          />
          <div className="min-w-0">
            <p
              id="help-drawer-title"
              className="text-sm font-bold leading-tight truncate"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
            >
              {content.title}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
              Guía de uso
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar guía"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150 shrink-0"
          style={{ color: 'var(--text-faint)' }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(109,59,215,0.08)'
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

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Description */}
        <Section label="Descripción">
          <div className="flex items-start gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: 'var(--bg-accent-soft)', border: '1px solid var(--brand-100)' }}
            >
              <BookOpen size={13} style={{ color: 'var(--brand-500)' }} />
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {content.description}
            </p>
          </div>
        </Section>

        {/* Example */}
        {content.example && (
          <>
            <div style={{ height: 1, background: 'var(--border-light)' }} />
            <Section label="Ejemplo">
              <div
                className="rounded-xl px-4 py-3"
                style={{
                  background: 'var(--bg-accent-soft)',
                  border: '1px solid var(--brand-100)',
                }}
              >
                <p
                  className="text-sm font-medium leading-relaxed"
                  style={{ color: 'var(--brand-600)', fontFamily: 'var(--font-sora)' }}
                >
                  {content.example}
                </p>
              </div>
            </Section>
          </>
        )}

        {/* Impact */}
        {content.impact && content.impact.length > 0 && (
          <>
            <div style={{ height: 1, background: 'var(--border-light)' }} />
            <Section label="Cómo impacta en Equal">
              <div className="flex items-start gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(109,59,215,0.08)', border: '1px solid rgba(109,59,215,0.15)' }}
                >
                  <Zap size={13} style={{ color: 'var(--brand-500)' }} />
                </div>
                <BulletList items={content.impact} accent="brand" />
              </div>
            </Section>
          </>
        )}

        {/* Tips */}
        {content.tips && content.tips.length > 0 && (
          <>
            <div style={{ height: 1, background: 'var(--border-light)' }} />
            <Section label="Consejos">
              <div className="flex items-start gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
                >
                  <Lightbulb size={13} style={{ color: 'var(--text-muted)' }} />
                </div>
                <BulletList items={content.tips} accent="muted" />
              </div>
            </Section>
          </>
        )}
      </div>

      {/* CTA */}
      {content.cta && (
        <div
          className="px-5 py-4 shrink-0"
          style={{ borderTop: '1px solid var(--border-light)' }}
        >
          <a
            href={content.cta.href}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 hover:-translate-y-px"
            style={{
              background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)',
              boxShadow: '0 4px 14px rgba(109,59,215,0.35)',
            }}
          >
            {content.cta.label}
            <ArrowRight size={14} />
          </a>
        </div>
      )}
    </>
  )
}

export function HelpDrawer({ open, onClose, section }: HelpDrawerProps) {
  const desktopRef = useRef<HTMLDivElement>(null)
  const mobileRef  = useRef<HTMLDivElement>(null)
  const content = helpContent[section]

  // ESC to close
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

  // Focus trap — operates on whichever panel is visible
  useEffect(() => {
    if (!open) return
    const isMobile = window.innerWidth < 768
    const panel = isMobile ? mobileRef.current : desktopRef.current
    if (!panel) return

    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last  = focusable[focusable.length - 1]
    first?.focus()

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', trap)
    return () => document.removeEventListener('keydown', trap)
  }, [open])

  if (!open || !content) return null

  return createPortal(
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          background: 'rgba(248,250,252,0.45)',
          backdropFilter: 'blur(3px) saturate(110%)',
          WebkitBackdropFilter: 'blur(3px) saturate(110%)',
        }}
      />

      {/* Desktop: right drawer */}
      <div
        ref={desktopRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-drawer-title"
        className="animate-slide-in-right hidden md:flex flex-col"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 380,
          zIndex: 9999,
          background: 'rgba(255,255,255,0.98)',
          borderLeft: '1px solid var(--border)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.08), -2px 0 12px rgba(0,0,0,0.04)',
          overflowY: 'auto',
        }}
      >
        <DrawerInner content={content} onClose={onClose} />
      </div>

      {/* Mobile: bottom sheet */}
      <div
        ref={mobileRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-drawer-title"
        className="animate-slide-in-up flex md:hidden flex-col"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: '90vh',
          zIndex: 9999,
          background: 'rgba(255,255,255,0.98)',
          borderTop: '1px solid var(--border)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.10)',
          overflowY: 'auto',
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: 'var(--border)' }}
          />
        </div>
        <DrawerInner content={content} onClose={onClose} />
      </div>
    </>,
    document.body
  )
}
