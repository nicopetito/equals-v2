'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Wallet, CreditCard, Tag,
  CalendarClock, Target, DollarSign, PiggyBank,
  LogOut, ChevronLeft, ChevronRight, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const NAV_ITEMS = [
  { href: '/dashboard',   label: 'Dashboard',            icon: LayoutDashboard },
  { href: '/transactions',label: 'Transacciones',         icon: Wallet },
  { href: '/wallets',     label: 'Billeteras',            icon: CreditCard },
  { href: '/categories',  label: 'Categorías',            icon: Tag },
  { href: '/scheduled',   label: 'Operaciones Futuras',   icon: CalendarClock },
  { href: '/goals',       label: 'Objetivos',             icon: Target },
  { href: '/dollar',      label: 'Dólar',                 icon: DollarSign },
  { href: '/plazo-fijo',  label: 'Plazo Fijo',            icon: PiggyBank },
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

  const sidebarStyle = {
    background: 'linear-gradient(180deg, #463397 0%, #2c116a 100%)',
    boxShadow: '0 20px 25px rgba(70,51,151,0.25)',
  }

  return (
    <aside
      style={sidebarStyle}
      className={cn(
        'flex flex-col text-white transition-all duration-300 ease-in-out',
        mobile
          ? 'w-72 h-full rounded-none'
          : cn(
              'rounded-3xl my-5 ml-5',
              collapsed ? 'w-20' : 'w-64'
            )
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-6 border-b border-white/10">
        {(!collapsed || mobile) && (
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tracking-tight">Equals</span>
          </div>
        )}
        {mobile ? (
          <button
            onClick={onClose}
            className="ml-auto p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(c => !c)}
            className={cn(
              'p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors',
              collapsed && 'mx-auto'
            )}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto px-3">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              title={item.label}
              className={cn(
                'relative flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
                collapsed && !mobile && 'justify-center px-0'
              )}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full"
                  style={{ height: '60%', background: '#9850eb' }}
                />
              )}
              <item.icon size={22} className="shrink-0" />
              {(!collapsed || mobile) && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer logout */}
      <div className="px-3 pb-5 pt-4 border-t border-white/10">
        {showLogout ? (
          <div className="bg-white rounded-xl p-3 space-y-2">
            <p className="text-sm font-semibold text-gray-700 text-center">¿Cerrar sesión?</p>
            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm py-2 rounded-lg transition-colors font-medium"
              >
                Sí
              </button>
              <button
                onClick={() => setShowLogout(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm py-2 rounded-lg transition-colors font-medium"
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
              'flex items-center gap-4 w-full px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-red-300 transition-all',
              collapsed && !mobile && 'justify-center px-0'
            )}
          >
            <LogOut size={22} className="shrink-0" />
            {(!collapsed || mobile) && <span>Salir</span>}
          </button>
        )}
      </div>
    </aside>
  )
}
