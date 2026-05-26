'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useToast, type Toast } from '@/components/providers/ToastProvider'

const STYLES: Record<Toast['type'], {
  bg: string; border: string; icon: typeof CheckCircle2; iconColor: string; bar: string
}> = {
  success: {
    bg: 'var(--income-50)',   border: 'var(--income-100)',
    icon: CheckCircle2, iconColor: 'var(--income-500)',
    bar: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
  },
  error: {
    bg: 'var(--expense-50)',  border: 'var(--expense-100)',
    icon: XCircle,      iconColor: 'var(--expense-500)',
    bar: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
  },
  info: {
    bg: 'var(--sky-50)',      border: 'var(--sky-100)',
    icon: Info,         iconColor: 'var(--sky-500)',
    bar: 'linear-gradient(135deg, #adc6ff 0%, #0566d9 100%)',
  },
  warning: {
    bg: 'var(--goal-50)',     border: 'var(--goal-100)',
    icon: AlertTriangle, iconColor: 'var(--goal-500)',
    bar: 'linear-gradient(135deg, #ffb869 0%, #ca801e 100%)',
  },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [visible, setVisible] = useState(false)
  const s = STYLES[toast.type]
  const Icon = s.icon

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function dismiss() {
    setVisible(false)
    setTimeout(onRemove, 280)
  }

  return (
    <div
      role="alert"
      onClick={dismiss}
      className="relative flex items-start gap-3 rounded-2xl px-4 py-3.5 cursor-pointer overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${s.border}`,
        boxShadow: 'var(--shadow-lg)',
        minWidth: 280,
        maxWidth: 380,
        transform: visible ? 'translateX(0) scale(1)' : 'translateX(120%) scale(0.95)',
        opacity: visible ? 1 : 0,
        transition: 'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      {/* Barra lateral de color */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ background: s.bar }}
      />
      <Icon size={18} className="shrink-0 mt-0.5" style={{ color: s.iconColor }} />
      <p className="text-sm font-semibold flex-1 leading-snug" style={{ color: 'var(--text-primary)' }}>
        {toast.message}
      </p>
      <button className="shrink-0 opacity-40 hover:opacity-70 transition-opacity" style={{ color: 'var(--text-primary)' }}>
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2.5 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={() => removeToast(t.id)} />
        </div>
      ))}
    </div>
  )
}


