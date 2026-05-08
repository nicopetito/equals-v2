'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  Tag,
  CalendarClock,
  Target,
  DollarSign,
  PiggyBank,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transacciones', icon: Wallet },
  { href: '/wallets', label: 'Billeteras', icon: CreditCard },
  { href: '/categories', label: 'Categorías', icon: Tag },
  { href: '/scheduled', label: 'Operaciones Futuras', icon: CalendarClock },
  { href: '/goals', label: 'Objetivos', icon: Target },
  { href: '/dollar', label: 'Dólar', icon: DollarSign },
  { href: '/plazo-fijo', label: 'Plazo Fijo', icon: PiggyBank },
]

interface SidebarProps {
  onClose?: () => void
  mobile?: boolean
}

export function Sidebar({ onClose, mobile = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [showLogout, setShowLogout] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()

  async function handleLogout() {
    await signOut()
    router.push('/login')
  }

  return (
    <aside
      className={cn(
        'flex flex-col bg-gray-900 text-white transition-all duration-300 ease-in-out',
        mobile ? 'w-72 h-full' : collapsed ? 'w-16' : 'w-60',
        'shrink-0'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 h-16">
        {(!collapsed || mobile) && (
          <span className="font-bold text-lg tracking-tight text-white">Equals</span>
        )}
        {mobile ? (
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-gray-800 transition-colors">
            <X size={20} />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn('p-1 rounded hover:bg-gray-800 transition-colors', collapsed && 'mx-auto')}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              title={item.label}
              className={cn(
                'flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                collapsed && !mobile && 'justify-center px-0'
              )}
            >
              <item.icon size={20} className="shrink-0" />
              {(!collapsed || mobile) && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer / logout */}
      <div className="p-4 border-t border-gray-800">
        {showLogout ? (
          <div className="bg-gray-800 rounded-lg p-3 space-y-2">
            <p className="text-sm text-gray-300 text-center">¿Cerrar sesión?</p>
            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-1.5 rounded-md transition-colors"
              >
                Sí
              </button>
              <button
                onClick={() => setShowLogout(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-1.5 rounded-md transition-colors"
              >
                No
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowLogout(true)}
            title="Cerrar sesión"
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors',
              collapsed && !mobile && 'justify-center px-0'
            )}
          >
            <LogOut size={20} className="shrink-0" />
            {(!collapsed || mobile) && <span>Salir</span>}
          </button>
        )}
      </div>
    </aside>
  )
}
