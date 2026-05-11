import { type LucideIcon, Inbox } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: LucideIcon
  action?: { label: string; onClick: () => void }
}

export function EmptyState({
  title = 'Sin datos',
  description = 'No hay registros para mostrar.',
  icon: Icon = Inbox,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-100)' }}
      >
        <Icon size={28} style={{ color: 'var(--brand-500)' }} />
      </div>
      <p className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition-all hover:opacity-90 hover:-translate-y-px"
          style={{ background: 'var(--grad-brand)', boxShadow: 'var(--shadow-brand)' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
