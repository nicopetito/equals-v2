'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Wallet, CreditCard, Tag,
  CalendarClock, Target, DollarSign, PiggyBank,
  LogOut, ChevronLeft, ChevronRight, X, Zap,
  Upload, SlidersHorizontal, CalendarDays, Trophy, BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

// ── Paleta ─────────────────────────────────────────────────────────────────
const S = {
  bgFrom:       '#EDE9FF',   // brand-50 ajustado — tinte violeta suave
  bgTo:         '#F5F4FF',   // casi blanco con tinte violeta
  border:       '#E5E8F5',
  shadow:       '2px 0 20px rgba(109,59,215,0.08)',
  // Nav activo
  activeBg:     'rgba(109,59,215,0.09)',
  activeText:   '#4826a0',
  activeIcon:   '#6d3bd7',
  activeBar:    '#6d3bd7',
  // Nav inactivo
  inactiveText: '#6B748F',
  inactiveIcon: '#9AA3BE',
  // Hover
  hoverBg:      'rgba(109,59,215,0.05)',
  hoverText:    '#3D4664',
  // Labels de grupo
  groupLabel:   '#A8B2CE',
  separator:    '#E5E8F5',
  // Logo / texto
  logoText:     '#1A1F36',
  // Footer
  footerText:   '#6B748F',
  footerEmail:  '#9AA3BE',
}

type NavItem = { href: string; label: string; icon: React.ElementType }

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'General',
    items: [
      { href: '/dashboard',    label: 'Inicio',        icon: LayoutDashboard  },
      { href: '/estadisticas', label: 'Estadísticas',  icon: BarChart2        },
      { href: '/transactions',       label: 'Transacciones', icon: Wallet           },
      { href: '/quick-transactions', label: 'Rápidas',       icon: Zap              },
      { href: '/wallets',            label: 'Billeteras',    icon: CreditCard       },
      { href: '/categories',   label: 'Categorías',    icon: Tag              },
    ],
  },
  {
    label: 'Planificación',
    items: [
      { href: '/scheduled', label: 'Programadas',  icon: CalendarClock     },
      { href: '/goals',     label: 'Objetivos',    icon: Target            },
      { href: '/budgets',   label: 'Presupuestos', icon: SlidersHorizontal },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      { href: '/dollar',       label: 'Dólar',        icon: DollarSign   },
      { href: '/plazo-fijo',   label: 'Plazo Fijo',   icon: PiggyBank    },
      { href: '/calendar',     label: 'Calendario',   icon: CalendarDays },
      { href: '/achievements', label: 'Logros',       icon: Trophy       },
      { href: '/import',       label: 'Importar CSV', icon: Upload       },
    ],
  },
]

function UserAvatar({ email }: { email: string }) {
  const initials = email.slice(0, 2).toUpperCase()
  return (
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 select-none"
      style={{
        background: 'rgba(109,59,215,0.10)',
        color: '#6d3bd7',
        border: '1px solid rgba(109,59,215,0.15)',
        fontFamily: 'var(--font-sora)',
      }}
    >
      {initials}
    </div>
  )
}

interface SidebarProps {
  onClose?: () => void
  mobile?: boolean
}

export function Sidebar({ onClose, mobile = false }: SidebarProps) {
  const [collapsed, setCollapsed]   = useState(false)
  const [showLogout, setShowLogout] = useState(false)
  const pathname  = usePathname()
  const router    = useRouter()
  const { signOut, user } = useAuth()

  async function handleLogout() {
    await signOut()
    router.push('/login')
  }

  const isCollapsed = collapsed && !mobile
  const userEmail   = user?.email ?? ''
  const displayName = userEmail.split('@')[0] ?? 'Usuario'

  // Ancho explícito como inline style — garantiza que Tailwind no sea el cuello de botella
  const sidebarWidth = mobile ? 288 : isCollapsed ? 72 : 240

  return (
    <aside
      className={cn(
        'flex flex-col select-none overflow-hidden',
        // La transición solo afecta width para evitar artefactos
        !mobile && 'transition-[width] duration-300 ease-in-out',
        mobile ? 'h-full rounded-none' : 'rounded-3xl my-4 ml-4',
      )}
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        maxWidth: sidebarWidth,
        background: `linear-gradient(180deg, ${S.bgFrom} 0%, ${S.bgTo} 100%)`,
        border: `1px solid ${S.border}`,
        boxShadow: S.shadow,
      }}
    >
      {/* ── Acento de color en el top — conecta visualmente con el header ── */}
      {!mobile && (
        <div
          className="h-[2px] w-full shrink-0"
          style={{
            background: 'linear-gradient(90deg, rgba(109,59,215,0.4) 0%, rgba(5,102,217,0.3) 100%)',
            borderRadius: '24px 24px 0 0',
          }}
        />
      )}

      {/* ── Logo ───────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${S.border}` }}
      >
        {isCollapsed ? (
          /* Colapsado: ícono + flecha → clic para expandir */
          <button
            onClick={() => setCollapsed(false)}
            title="Expandir menú"
            className="w-full flex items-center justify-center gap-1 rounded-xl py-1 transition-colors"
            onMouseEnter={e => (e.currentTarget.style.background = S.hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--grad-brand)' }}
            >
              <Zap size={13} className="text-white" fill="white" />
            </div>
            <ChevronRight size={11} style={{ color: S.inactiveIcon }} />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'var(--grad-brand)' }}
              >
                <Zap size={13} className="text-white" fill="white" />
              </div>
              <span
                className="font-bold text-sm truncate"
                style={{ color: S.logoText, fontFamily: 'var(--font-sora)' }}
              >
                Equal
              </span>
            </div>
            {mobile ? (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition-colors shrink-0"
                style={{ color: S.inactiveIcon }}
                onMouseEnter={e => (e.currentTarget.style.background = S.hoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <X size={15} />
              </button>
            ) : (
              <button
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-lg transition-colors shrink-0"
                style={{ color: S.inactiveIcon }}
                onMouseEnter={e => (e.currentTarget.style.background = S.hoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <ChevronLeft size={13} />
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Nav ────────────────────────────────── */}
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden px-2 min-h-0">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-1' : ''}>
            {!isCollapsed && (
              <p
                className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: S.groupLabel }}
              >
                {group.label}
              </p>
            )}
            {isCollapsed && gi > 0 && (
              <div className="mx-3 my-2" style={{ height: 1, background: S.separator }} />
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    title={isCollapsed ? item.label : undefined}
                    className={cn(
                      'relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 group overflow-hidden',
                      isCollapsed && 'justify-center px-0'
                    )}
                    style={active
                      ? { background: S.activeBg, color: S.activeText }
                      : { color: S.inactiveText }
                    }
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.background = S.hoverBg
                        e.currentTarget.style.color = S.hoverText
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = S.inactiveText
                      }
                    }}
                  >
                    {/* Indicador activo: barra izquierda */}
                    {active && !isCollapsed && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
                        style={{ width: 2.5, height: 20, background: S.activeBar }}
                      />
                    )}

                    {/* Ícono */}
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                      style={active
                        ? { background: 'rgba(109,59,215,0.12)', color: S.activeIcon }
                        : { color: S.inactiveIcon }
                      }
                    >
                      <item.icon size={14} />
                    </div>

                    {!isCollapsed && <span className="truncate font-medium">{item.label}</span>}

                    {/* Tooltip collapsed */}
                    {isCollapsed && (
                      <span
                        className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50"
                        style={{
                          background: '#1A1F36',
                          color: '#F0F4FF',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.20)',
                        }}
                      >
                        {item.label}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer: usuario + logout ─────────── */}
      <div className="px-2 py-2.5 shrink-0" style={{ borderTop: `1px solid ${S.border}` }}>
        {showLogout ? (
          <div
            className="rounded-xl p-3 space-y-2"
            style={{ background: '#FEF2F2', border: '1px solid #FEE2E2' }}
          >
            {!isCollapsed && (
              <p className="text-xs font-semibold text-center" style={{ color: '#be123c' }}>
                ¿Cerrar sesión?
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                className="flex-1 text-white text-xs py-1.5 rounded-lg font-bold transition-all hover:opacity-90"
                style={{ background: '#e11d48' }}
              >
                Sí
              </button>
              <button
                onClick={() => setShowLogout(false)}
                className="flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors"
                style={{ color: S.footerText, background: 'var(--bg-subtle)', border: `1px solid ${S.border}` }}
              >
                No
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowLogout(true)}
            title={isCollapsed ? 'Cerrar sesión' : undefined}
            className={cn(
              'flex items-center gap-2 w-full px-2 py-2 rounded-xl text-[12px] font-medium transition-all duration-150',
              isCollapsed ? 'justify-center' : 'justify-between'
            )}
            style={{ color: S.footerText }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#FEF2F2'
              e.currentTarget.style.color = '#be123c'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = S.footerText
            }}
          >
            {!isCollapsed ? (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <UserAvatar email={userEmail} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: S.logoText }}>
                      {displayName}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: S.footerEmail }}>
                      {userEmail}
                    </p>
                  </div>
                </div>
                <LogOut size={13} style={{ color: S.inactiveIcon, flexShrink: 0 }} />
              </>
            ) : (
              <UserAvatar email={userEmail} />
            )}
          </button>
        )}
      </div>
    </aside>
  )
}
