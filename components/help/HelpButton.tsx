'use client'

import { useState, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'
import { HelpDrawer } from './HelpDrawer'
import { helpContent } from './helpContent'

const SEEN_KEY = 'equal_guide_seen_v1'

function getSeenSections(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function markSectionSeen(section: string) {
  try {
    const seen = getSeenSections()
    if (!seen.includes(section)) {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, section]))
    }
  } catch {
    // localStorage not available — silent fail
  }
}

interface HelpButtonProps {
  section: keyof typeof helpContent
  variant?: 'glass' | 'light'
}

export function HelpButton({ section, variant = 'glass' }: HelpButtonProps) {
  const [open, setOpen] = useState(false)

  // Auto-open on first visit
  useEffect(() => {
    const seen = getSeenSections()
    if (!seen.includes(section)) {
      setOpen(true)
    }
  }, [section])

  function handleClose() {
    markSectionSeen(section)
    setOpen(false)
  }

  function handleOpen() {
    setOpen(true)
  }

  return (
    <>
      <button
        onClick={handleOpen}
        aria-label="Abrir guía de esta sección"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 hover:-translate-y-px"
        style={
          variant === 'light'
            ? {
                background: 'rgba(208,188,255,0.10)',
                border: '1px solid rgba(208,188,255,0.22)',
                color: 'var(--brand-500)',
              }
            : {
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.20)',
                color: 'rgba(255,255,255,0.82)',
              }
        }
        onMouseEnter={e => {
          if (variant === 'light') {
            e.currentTarget.style.background = 'rgba(208,188,255,0.18)'
          } else {
            e.currentTarget.style.background = 'rgba(255,255,255,0.20)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.95)'
          }
        }}
        onMouseLeave={e => {
          if (variant === 'light') {
            e.currentTarget.style.background = 'rgba(208,188,255,0.10)'
          } else {
            e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.82)'
          }
        }}
      >
        <HelpCircle size={14} />
        Guía
      </button>

      <HelpDrawer open={open} onClose={handleClose} section={section} />
    </>
  )
}
