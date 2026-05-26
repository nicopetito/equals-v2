import { type LucideIcon, Inbox } from 'lucide-react'

type IllustrationType = 'default' | 'wallets' | 'transactions' | 'goals' | 'categories' | 'scheduled' | 'dollar'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: LucideIcon
  action?: { label: string; onClick: () => void }
  type?: IllustrationType
}

function Illustration({ type }: { type: IllustrationType }) {
  if (type === 'wallets') return (
    <svg width="80" height="64" viewBox="0 0 80 64" fill="none">
      <rect x="8" y="16" width="64" height="42" rx="10" fill="#1d1a23" stroke="#494454" strokeWidth="1.5"/>
      <rect x="8" y="24" width="64" height="10" fill="#2c2832"/>
      <circle cx="56" cy="37" r="8" fill="#a078ff" opacity="0.12" stroke="#a078ff" strokeWidth="1.5"/>
      <circle cx="62" cy="37" r="8" fill="#d0bcff" opacity="0.10" stroke="#d0bcff" strokeWidth="1.5"/>
      <rect x="16" y="33" width="18" height="3" rx="1.5" fill="#d0bcff" opacity="0.30"/>
      <rect x="16" y="40" width="12" height="3" rx="1.5" fill="#d0bcff" opacity="0.18"/>
      <rect x="20" y="4" width="40" height="16" rx="6" fill="#a078ff" opacity="0.20"/>
    </svg>
  )

  if (type === 'transactions') return (
    <svg width="80" height="64" viewBox="0 0 80 64" fill="none">
      <rect x="10" y="8" width="60" height="48" rx="10" fill="#1d1a23" stroke="#494454" strokeWidth="1.5"/>
      <rect x="20" y="20" width="26" height="4" rx="2" fill="#059669" opacity="0.40"/>
      <rect x="20" y="28" width="18" height="4" rx="2" fill="#059669" opacity="0.25"/>
      <rect x="20" y="36" width="22" height="4" rx="2" fill="#059669" opacity="0.15"/>
      <rect x="50" y="20" width="12" height="4" rx="2" fill="#059669" opacity="0.50"/>
      <rect x="52" y="28" width="10" height="4" rx="2" fill="#DC2626" opacity="0.45"/>
      <rect x="51" y="36" width="11" height="4" rx="2" fill="#DC2626" opacity="0.30"/>
      <circle cx="40" cy="52" r="6" fill="#1d1a23" stroke="#059669" strokeWidth="1.5"/>
      <path d="M37 52 L39 54 L43 50" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )

  if (type === 'goals') return (
    <svg width="80" height="64" viewBox="0 0 80 64" fill="none">
      <circle cx="40" cy="32" r="22" fill="#1d1a23" stroke="#494454" strokeWidth="1.5"/>
      <circle cx="40" cy="32" r="15" fill="none" stroke="#DC2626" strokeWidth="1.5" strokeDasharray="4 3"/>
      <circle cx="40" cy="32" r="7" fill="#DC2626" opacity="0.15"/>
      <circle cx="40" cy="32" r="3" fill="#DC2626" opacity="0.60"/>
      <path d="M62 10 L56 16 M56 10 L62 16" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="10" y="52" width="20" height="3" rx="1.5" fill="#DC2626" opacity="0.20"/>
      <rect x="50" y="52" width="20" height="3" rx="1.5" fill="#DC2626" opacity="0.20"/>
    </svg>
  )

  if (type === 'categories') return (
    <svg width="80" height="64" viewBox="0 0 80 64" fill="none">
      <rect x="8" y="8" width="28" height="22" rx="8" fill="#1d1a23" stroke="#494454" strokeWidth="1.5"/>
      <rect x="44" y="8" width="28" height="22" rx="8" fill="#1d1a23" stroke="#494454" strokeWidth="1.5"/>
      <rect x="8" y="36" width="28" height="22" rx="8" fill="#1d1a23" stroke="#494454" strokeWidth="1.5"/>
      <rect x="44" y="36" width="28" height="22" rx="8" fill="#1d1a23" stroke="#494454" strokeWidth="1.5"/>
      <circle cx="16" cy="19" r="4" fill="#a078ff" opacity="0.50"/>
      <circle cx="52" cy="19" r="4" fill="#059669" opacity="0.50"/>
      <circle cx="16" cy="47" r="4" fill="#ffb869" opacity="0.50"/>
      <circle cx="52" cy="47" r="4" fill="#DC2626" opacity="0.50"/>
    </svg>
  )

  if (type === 'scheduled') return (
    <svg width="80" height="64" viewBox="0 0 80 64" fill="none">
      <rect x="10" y="10" width="60" height="52" rx="10" fill="#1d1a23" stroke="#494454" strokeWidth="1.5"/>
      <rect x="10" y="10" width="60" height="16" rx="10" fill="#a078ff" opacity="0.15"/>
      <rect x="22" y="6" width="8" height="12" rx="3" fill="#a078ff" opacity="0.50"/>
      <rect x="50" y="6" width="8" height="12" rx="3" fill="#a078ff" opacity="0.50"/>
      <rect x="18" y="34" width="12" height="4" rx="2" fill="#d0bcff" opacity="0.30"/>
      <rect x="18" y="42" width="16" height="4" rx="2" fill="#d0bcff" opacity="0.20"/>
      <rect x="18" y="50" width="10" height="4" rx="2" fill="#d0bcff" opacity="0.12"/>
      <circle cx="54" cy="44" r="10" fill="#1d1a23" stroke="#a078ff" strokeWidth="1.5"/>
      <path d="M54 39 L54 44 L58 46" stroke="#a078ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )

  return (
    <svg width="80" height="64" viewBox="0 0 80 64" fill="none">
      <rect x="14" y="20" width="52" height="36" rx="10" fill="#1d1a23" stroke="#494454" strokeWidth="1.5"/>
      <rect x="24" y="32" width="32" height="4" rx="2" fill="#d0bcff" opacity="0.28"/>
      <rect x="28" y="40" width="24" height="4" rx="2" fill="#d0bcff" opacity="0.16"/>
      <path d="M40 8 L40 16 M36 12 L40 8 L44 12" stroke="#d0bcff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.40"/>
    </svg>
  )
}

export function EmptyState({
  title = 'Sin datos',
  description = 'No hay registros para mostrar.',
  icon: _Icon = Inbox,
  action,
  type = 'default',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="mb-5">
        <Illustration type={type} />
      </div>
      <p className="text-base font-bold mb-1.5" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
        {title}
      </p>
      <p className="text-sm max-w-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-5 py-2.5 text-white text-sm font-bold rounded-xl transition-all hover:opacity-90 hover:-translate-y-px"
          style={{
            background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)',
            boxShadow: '0 4px 14px rgba(109,59,215,0.40)',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

