'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Wallet, CreditCard, Target, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

const BOTTOM_NAV = [
  { href: '/dashboard',    label: 'Inicio',      icon: LayoutDashboard },
  { href: '/transactions', label: 'Movimientos', icon: Wallet },
  { href: '/wallets',      label: 'Billeteras',  icon: CreditCard },
  { href: '/goals',        label: 'Objetivos',   icon: Target },
]

interface MobileNavProps {
  onMenuOpen: () => void
}

export function MobileNav({ onMenuOpen }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 flex md:hidden bg-white border-t"
      style={{
        borderColor: 'rgba(70,51,151,0.1)',
        boxShadow: '0 -4px 12px rgba(70,51,151,0.10)',
        minHeight: 64,
      }}
    >
      {BOTTOM_NAV.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors"
            style={{ color: active ? '#463397' : '#9ca3af' }}
          >
            {active && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[3px] rounded-b-full"
                style={{ background: 'linear-gradient(135deg,#463397,#9850eb)' }}
              />
            )}
            <item.icon size={22} style={{ transform: active ? 'translateY(-2px)' : undefined, transition: 'transform .2s' }} />
            <span>{item.label}</span>
          </Link>
        )
      })}
      <button
        onClick={onMenuOpen}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors"
        style={{ color: '#463397', fontWeight: 600 }}
      >
        <Menu size={22} />
        <span>Más</span>
      </button>
    </nav>
  )
}
