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
      <div className="p-4 bg-gray-800 rounded-2xl mb-4">
        <Icon size={32} className="text-gray-600" />
      </div>
      <p className="text-lg font-semibold text-gray-400 mb-1">{title}</p>
      <p className="text-sm text-gray-600 max-w-xs">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
