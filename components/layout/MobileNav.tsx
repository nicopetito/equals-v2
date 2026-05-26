'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Wallet, BarChart2, Target, Grid3X3 } from 'lucide-react'

const BOTTOM_NAV = [
  { href: '/dashboard',    label: 'Inicio',       icon: LayoutDashboard },
  { href: '/estadisticas', label: 'Estadísticas', icon: BarChart2       },
  { href: '/transactions', label: 'Movimientos',  icon: Wallet          },
  { href: '/goals',        label: 'Objetivos',    icon: Target          },
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
        background: 'var(--grad-brand)',
        boxShadow: 'var(--shadow-brand)',
      }}
    >
      {BOTTOM_NAV.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-semibold transition-all"
            style={{ color: active ? 'white' : 'rgba(255,255,255,0.55)' }}
          >
            {active && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
                style={{ width: 24, height: 3, background: 'rgba(255,255,255,0.85)' }}
              />
            )}
            <div
              className="w-9 h-7 rounded-xl flex items-center justify-center transition-all"
              style={active ? { background: 'rgba(255,255,255,0.18)' } : undefined}
            >
              <item.icon size={17} />
            </div>
            <span>{item.label}</span>
          </Link>
        )
      })}

      <button
        onClick={onMenuOpen}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-semibold transition-all hover:opacity-90"
        style={{ color: 'rgba(255,255,255,0.55)' }}
      >
        <div className="w-9 h-7 rounded-xl flex items-center justify-center">
          <Grid3X3 size={17} />
        </div>
        <span>Más</span>
      </button>
    </nav>
  )
}
