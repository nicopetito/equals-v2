'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Wallet, CreditCard, Tag,
  CalendarClock, Target, DollarSign, PiggyBank,
  LogOut, ChevronLeft, ChevronRight, X, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Inicio',              icon: LayoutDashboard, color: '#6366F1', bg: '#EEF2FF' },
  { href: '/transactions', label: 'Transacciones',       icon: Wallet,          color: '#10B981', bg: '#ECFDF5' },
  { href: '/wallets',      label: 'Billeteras',          icon: CreditCard,      color: '#F59E0B', bg: '#FFFBEB' },
  { href: '/categories',   label: 'Categorías',          icon: Tag,             color: '#0EA5E9', bg: '#F0F9FF' },
  { href: '/scheduled',    label: 'Op. Futuras',         icon: CalendarClock,   color: '#8B5CF6', bg: '#F5F3FF' },
  { href: '/goals',        label: 'Objetivos',           icon: Target,          color: '#F43F5E', bg: '#FFF1F2' },
  { href: '/dollar',       label: 'Dólar',               icon: DollarSign,      color: '#0EA5E9', bg: '#F0F9FF' },
  { href: '/plazo-fijo',   label: 'Plazo Fijo',          icon: PiggyBank,       color: '#10B981', bg: '#ECFDF5' },
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

  const isCollapsed = collapsed && !mobile

  return (
    <aside
      className={cn(
        'flex flex-col transition-all duration-300 ease-in-out select-none',
        mobile
          ? 'w-72 h-full rounded-none'
          : cn('rounded-3xl my-4 ml-4', isCollapsed ? 'w-[72px]' : 'w-60')
      )}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Header — Logo */}
      <div
        className={cn(
          'flex items-center px-4 py-5',
          isCollapsed ? 'justify-center' : 'justify-between'
        )}
        style={{ borderBottom: '1px solid var(--border-light)' }}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md shrink-0"
              style={{ background: 'var(--grad-brand)', boxShadow: 'var(--shadow-brand)' }}
            >
              <Zap size={16} className="text-white" fill="white" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Equals
              </span>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
            style={{ background: 'var(--grad-brand)', boxShadow: 'var(--shadow-brand)' }}
          >
            <Zap size={17} className="text-white" fill="white" />
          </div>
        )}
        {mobile ? (
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors hover:bg-slate-100"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={17} />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1.5 rounded-xl transition-colors hover:bg-slate-100"
            style={{ color: 'var(--text-muted)' }}
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto px-2.5">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              title={item.label}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group',
                isCollapsed && 'justify-center px-0'
              )}
              style={active
                ? { background: item.bg, color: item.color }
                : { color: 'var(--text-muted)' }
              }
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-subtle)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
                style={active
                  ? { background: item.color + '20', color: item.color }
                  : { color: 'var(--text-faint)' }
                }
              >
                <item.icon size={17} />
              </div>
              {!isCollapsed && <span className="truncate">{item.label}</span>}

              {/* Dot indicator for active */}
              {active && !isCollapsed && (
                <span
                  className="ml-auto w-2 h-2 rounded-full shrink-0"
                  style={{ background: item.color }}
                />
              )}

              {/* Tooltip on collapsed */}
              {isCollapsed && (
                <span
                  className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50"
                  style={{ background: 'var(--text-primary)', boxShadow: 'var(--shadow-md)' }}
                >
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer — Logout */}
      <div className="px-2.5 pb-4 pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
        {showLogout ? (
          <div
            className="rounded-2xl p-3 space-y-2.5"
            style={{ background: 'var(--expense-50)', border: '1px solid var(--expense-100)' }}
          >
            {!isCollapsed && (
              <p className="text-xs font-bold text-center" style={{ color: 'var(--expense-600)' }}>
                ¿Cerrar sesión?
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                className="flex-1 text-white text-xs py-2 rounded-xl font-bold transition-all hover:opacity-90"
                style={{ background: 'var(--grad-expense)' }}
              >
                Sí, salir
              </button>
              <button
                onClick={() => setShowLogout(false)}
                className="flex-1 text-xs py-2 rounded-xl font-semibold transition-colors hover:bg-slate-100"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-subtle)' }}
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
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all',
              isCollapsed && 'justify-center px-0'
            )}
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--expense-50)'
              e.currentTarget.style.color = 'var(--expense-600)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <LogOut size={17} className="shrink-0" />
            {!isCollapsed && <span>Cerrar sesión</span>}
          </button>
        )}
      </div>
    </aside>
  )
}
