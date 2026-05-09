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
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div
        className="p-4 rounded-2xl mb-4"
        style={{ background: 'linear-gradient(135deg,rgba(70,51,151,0.08),rgba(152,80,235,0.08))' }}
      >
        <Icon size={32} style={{ color: '#9850eb' }} />
      </div>
      <p className="text-base font-semibold text-gray-700 mb-1">{title}</p>
      <p className="text-sm text-gray-400 max-w-xs">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#463397,#9850eb)' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
