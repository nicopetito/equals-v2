'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Fragment, useState } from 'react'
import {
  LayoutDashboard, Wallet, CreditCard, Tag,
  CalendarClock, Target, DollarSign, PiggyBank,
  LogOut, ChevronLeft, ChevronRight, ChevronDown, X, Zap,
  Upload, SlidersHorizontal, CalendarDays, Trophy, BarChart2, Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

// ── Paleta ─────────────────────────────────────────────────────────────────
const S = {
  bgFrom:       '#EDE9FF',
  bgTo:         '#F5F4FF',
  border:       '#E5E8F5',
  shadow:       '2px 0 20px rgba(109,59,215,0.08)',
  activeBg:     'rgba(109,59,215,0.09)',
  activeText:   '#4826a0',
  activeIcon:   '#6d3bd7',
  activeBar:    '#6d3bd7',
  inactiveText: '#6B748F',
  inactiveIcon: '#9AA3BE',
  hoverBg:      'rgba(109,59,215,0.05)',
  hoverText:    '#3D4664',
  groupLabel:   '#A8B2CE',
  separator:    '#E5E8F5',
  logoText:     '#1A1F36',
  footerText:   '#6B748F',
  footerEmail:  '#9AA3BE',
}

type NavItem = { href: string; label: string; icon: React.ElementType }

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'General',
    items: [
      { href: '/dashboard',          label: 'Inicio',        icon: LayoutDashboard },
      { href: '/estadisticas',       label: 'Estadísticas',  icon: BarChart2       },
      { href: '/transactions',       label: 'Transacciones', icon: Wallet          },
      { href: '/quick-transactions', label: 'Rápidas',       icon: Zap             },
      { href: '/wallets',            label: 'Billeteras',    icon: CreditCard      },
      { href: '/categories',         label: 'Categorías',    icon: Tag             },
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
      { href: '/dollar',       label: 'Dólar',            icon: DollarSign   },
      { href: '/plazo-fijo',   label: 'Plazo Fijo',       icon: PiggyBank    },
      { href: '/calendar',     label: 'Calendario',        icon: CalendarDays },
      { href: '/achievements', label: 'Logros',            icon: Trophy       },
      { href: '/import',       label: 'Importar CSV',      icon: Upload       },
      { href: '/health',       label: 'Salud del sistema', icon: Activity     },
    ],
  },
]

function UserAvatar({ email, large = false }: { email: string; large?: boolean }) {
  const initials = email.slice(0, 2).toUpperCase()
  return (
    <div
      className={cn(
        large ? 'w-10 h-10' : 'w-9 h-9',
        'rounded-xl flex items-center justify-center text-xs font-bold shrink-0 select-none',
      )}
      style={{
        background:  'var(--brand-50)',
        color:       'var(--brand-500)',
        border:      '1px solid var(--brand-100)',
        fontFamily:  'var(--font-sora)',
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
  const [collapsed, setCollapsed]         = useState(false)
  const [showLogout, setShowLogout]       = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  function toggleGroup(label: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }
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

  const sidebarWidth = mobile ? 300 : isCollapsed ? 72 : 240

  return (
    <aside
      className={cn(
        'flex flex-col select-none overflow-hidden',
        !mobile && 'transition-[width] duration-300 ease-in-out',
        mobile ? 'h-full rounded-none' : 'rounded-3xl my-4 ml-4',
      )}
      style={{
        width:      sidebarWidth,
        minWidth:   sidebarWidth,
        maxWidth:   sidebarWidth,
        background: `linear-gradient(180deg, ${S.bgFrom} 0%, ${S.bgTo} 100%)`,
        border:     `1px solid ${S.border}`,
        boxShadow:  S.shadow,
      }}
    >
      {/* ── Acento de color en el top ── */}
      <div
        className="h-[2px] w-full shrink-0"
        style={{
          background:   'linear-gradient(90deg, rgba(109,59,215,0.4) 0%, rgba(5,102,217,0.3) 100%)',
          borderRadius: mobile ? '0' : '24px 24px 0 0',
        }}
      />

      {/* ── Logo / header ── */}
      <div
        className={cn('flex items-center justify-between shrink-0', mobile ? 'px-5 py-4' : 'px-4 py-3')}
        style={{ borderBottom: `1px solid ${S.border}` }}
      >
        {isCollapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            title="Expandir menú"
            aria-label="Expandir menú"
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
                className={cn(
                  'flex items-center justify-center shrink-0',
                  mobile ? 'w-8 h-8 rounded-xl' : 'w-7 h-7 rounded-lg',
                )}
                style={{ background: 'var(--grad-brand)' }}
              >
                <Zap size={mobile ? 15 : 13} className="text-white" fill="white" />
              </div>
              <span
                className={cn('font-bold truncate', mobile ? 'text-base' : 'text-sm')}
                style={{ color: S.logoText, fontFamily: 'var(--font-sora)' }}
              >
                Equal
              </span>
            </div>
            {mobile ? (
              <button
                onClick={onClose}
                aria-label="Cerrar menú"
                className="p-2.5 rounded-xl flex items-center justify-center transition-colors shrink-0"
                style={{ color: S.inactiveIcon }}
                onMouseEnter={e => (e.currentTarget.style.background = S.hoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <X size={18} />
              </button>
            ) : (
              <button
                onClick={() => setCollapsed(true)}
                title="Colapsar menú"
                aria-label="Colapsar menú"
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

      {/* ── Nav ── */}
      {mobile ? (
        /* ── Mobile: hamburger card-per-section con acordeón ── */
        <nav className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 py-3 px-3 space-y-2">
          {NAV_GROUPS.map(group => {
            const isGroupCollapsed = collapsedGroups.has(group.label)
            return (
              <div
                key={group.label}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'white',
                  border:     `1px solid ${S.border}`,
                  boxShadow:  '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                {/* Section header — botón que colapsa/expande */}
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center justify-between w-full px-4 py-3 transition-colors"
                  style={{
                    borderBottom: isGroupCollapsed ? 'none' : `1px solid ${S.border}`,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = S.hoverBg)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: S.groupLabel }}
                  >
                    {group.label}
                  </p>
                  <ChevronDown
                    size={14}
                    style={{
                      color:     S.groupLabel,
                      transform: isGroupCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.22s ease',
                    }}
                  />
                </button>

                {/* Items — animación via grid-template-rows */}
                <div
                  style={{
                    display:           'grid',
                    gridTemplateRows:  isGroupCollapsed ? '0fr' : '1fr',
                    transition:        'grid-template-rows 0.22s ease',
                  }}
                >
                  <div style={{ overflow: 'hidden' }}>
                    {group.items.map((item, idx) => {
                      const active = pathname === item.href || pathname.startsWith(item.href + '/')
                      return (
                        <Fragment key={item.href}>
                          {idx > 0 && (
                            <div className="mx-4" style={{ height: 1, background: S.separator }} />
                          )}
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className="flex items-center gap-3 px-4 py-3.5 transition-all duration-150"
                            style={
                              active
                                ? { background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)', color: 'white' }
                                : { color: S.inactiveText }
                            }
                            onMouseEnter={e => {
                              if (!active) e.currentTarget.style.background = S.hoverBg
                            }}
                            onMouseLeave={e => {
                              if (!active) e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                              style={active ? { color: 'white' } : { color: S.inactiveIcon }}
                            >
                              <item.icon size={18} />
                            </div>
                            <span className="font-medium text-[14px] truncate flex-1">{item.label}</span>
                            {active && (
                              <div
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ background: 'rgba(255,255,255,0.7)' }}
                              />
                            )}
                          </Link>
                        </Fragment>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </nav>
      ) : (
        /* ── Desktop: lista compacta original ── */
        <nav className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 py-2 px-2">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? 'mt-1' : ''}>
              {!isCollapsed && (
                <p
                  className="pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest px-2.5"
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
                      aria-label={isCollapsed ? item.label : undefined}
                      className={cn(
                        'relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 group overflow-hidden',
                        isCollapsed && 'justify-center px-0',
                      )}
                      style={
                        active
                          ? { background: S.activeBg, color: S.activeText }
                          : { color: S.inactiveText }
                      }
                      onMouseEnter={e => {
                        if (!active) {
                          e.currentTarget.style.background = S.hoverBg
                          e.currentTarget.style.color      = S.hoverText
                        }
                      }}
                      onMouseLeave={e => {
                        if (!active) {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color      = S.inactiveText
                        }
                      }}
                    >
                      {active && !isCollapsed && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
                          style={{ width: 2.5, height: 20, background: S.activeBar }}
                        />
                      )}
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                        style={
                          active
                            ? { background: 'rgba(109,59,215,0.12)', color: S.activeIcon }
                            : { color: S.inactiveIcon }
                        }
                      >
                        <item.icon size={15} />
                      </div>
                      {!isCollapsed && <span className="truncate font-medium">{item.label}</span>}
                      {isCollapsed && (
                        <span
                          role="tooltip"
                          className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50"
                          style={{
                            background: '#1A1F36',
                            color:      '#F0F4FF',
                            boxShadow:  '0 4px 12px rgba(0,0,0,0.20)',
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
      )}

      {/* ── Footer: usuario + logout ── */}
      <div
        className={cn('shrink-0', mobile ? 'px-3 py-3' : 'px-2 py-2.5')}
        style={{
          borderTop:     `1px solid ${S.border}`,
          paddingBottom: mobile ? 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' : undefined,
        }}
      >
        {showLogout ? (
          <div
            className="rounded-xl p-3 space-y-2.5"
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
                className={cn('flex-1 text-white text-xs font-bold transition-all hover:opacity-90 rounded-xl', mobile ? 'py-2.5' : 'py-1.5')}
                style={{ background: '#e11d48' }}
              >
                Sí
              </button>
              <button
                onClick={() => setShowLogout(false)}
                className={cn('flex-1 text-xs font-medium transition-colors rounded-xl', mobile ? 'py-2.5' : 'py-1.5')}
                style={{ color: S.footerText, background: 'var(--bg-subtle)', border: `1px solid ${S.border}` }}
              >
                No
              </button>
            </div>
          </div>
        ) : mobile ? (
          /* Mobile: card-style user block */
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'white', border: `1px solid ${S.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            <button
              onClick={() => setShowLogout(true)}
              className="flex items-center gap-3 w-full px-4 py-3.5 justify-between font-medium transition-all duration-150"
              style={{ color: S.footerText }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#FEF2F2'
                e.currentTarget.style.color      = '#be123c'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color      = S.footerText
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar email={userEmail} large />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: S.logoText }}>
                    {displayName}
                  </p>
                  <p className="text-[11px] truncate" style={{ color: S.footerEmail }}>
                    {userEmail}
                  </p>
                </div>
              </div>
              <LogOut size={16} style={{ color: S.inactiveIcon, flexShrink: 0 }} />
            </button>
          </div>
        ) : (
          /* Desktop: botón plano */
          <button
            onClick={() => setShowLogout(true)}
            title={isCollapsed ? 'Cerrar sesión' : undefined}
            className={cn(
              'flex items-center gap-2.5 w-full rounded-xl text-[12px] font-medium transition-all duration-150',
              'px-2 py-2',
              isCollapsed ? 'justify-center' : 'justify-between',
            )}
            style={{ color: S.footerText }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#FEF2F2'
              e.currentTarget.style.color      = '#be123c'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color      = S.footerText
            }}
          >
            {!isCollapsed ? (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar email={userEmail} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: S.logoText }}>
                      {displayName}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: S.footerEmail }}>
                      {userEmail}
                    </p>
                  </div>
                </div>
                <LogOut size={14} style={{ color: S.inactiveIcon, flexShrink: 0 }} />
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
