'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  Target,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const BOTTOM_NAV = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/transactions', label: 'Operaciones', icon: Wallet },
  { href: '/wallets', label: 'Billeteras', icon: CreditCard },
  { href: '/goals', label: 'Objetivos', icon: Target },
]

interface MobileNavProps {
  onMenuOpen: () => void
}

export function MobileNav({ onMenuOpen }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-gray-900 border-t border-gray-800 flex md:hidden">
      {BOTTOM_NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors',
              active ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'
            )}
          >
            <item.icon size={22} />
            <span>{item.label}</span>
          </Link>
        )
      })}
      <button
        onClick={onMenuOpen}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors"
      >
        <Menu size={22} />
        <span>Más</span>
      </button>
    </nav>
  )
}
