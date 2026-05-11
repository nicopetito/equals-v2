'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Wallet, CreditCard, Target, Grid3X3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const BOTTOM_NAV = [
  { href: '/dashboard',    label: 'Inicio',      icon: LayoutDashboard, color: '#6366F1', bg: '#EEF2FF' },
  { href: '/transactions', label: 'Movimientos', icon: Wallet,          color: '#10B981', bg: '#ECFDF5' },
  { href: '/wallets',      label: 'Billeteras',  icon: CreditCard,      color: '#F59E0B', bg: '#FFFBEB' },
  { href: '/goals',        label: 'Objetivos',   icon: Target,          color: '#F43F5E', bg: '#FFF1F2' },
]

interface MobileNavProps {
  onMenuOpen: () => void
}

export function MobileNav({ onMenuOpen }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-3 left-3 right-3 z-40 flex md:hidden rounded-2xl overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        boxShadow: '0 -2px 0 rgba(0,0,0,0.04), 0 8px 32px rgba(15,23,42,0.12)',
        border: '1px solid var(--border)',
      }}
    >
      {BOTTOM_NAV.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-bold transition-all"
            style={{ color: active ? item.color : 'var(--text-faint)' }}
          >
            {active && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
                style={{ width: 28, height: 3, background: item.color }}
              />
            )}
            <div
              className="w-10 h-8 rounded-xl flex items-center justify-center transition-all"
              style={active ? { background: item.bg } : undefined}
            >
              <item.icon
                size={19}
                style={{
                  transform: active ? 'scale(1.1)' : undefined,
                  transition: 'transform 0.2s',
                }}
              />
            </div>
            <span>{item.label}</span>
          </Link>
        )
      })}

      <button
        onClick={onMenuOpen}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-bold transition-all"
        style={{ color: 'var(--text-faint)' }}
      >
        <div className="w-10 h-8 rounded-xl flex items-center justify-center">
          <Grid3X3 size={19} />
        </div>
        <span>Más</span>
      </button>
    </nav>
  )
}
