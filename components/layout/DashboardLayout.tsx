'use client'

import { useState, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { FAB } from '@/components/ui/FAB'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { Onboarding } from '@/components/ui/Onboarding'
import { WelcomeModal } from '@/components/ui/WelcomeModal'

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="app-bg flex h-screen overflow-hidden">

      {/* Grain noise — SVG turbulence, opacidad 2%, pointer-events none */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[2] select-none"
        style={{
          opacity: 0.022,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
        }}
      />

      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0 relative z-10">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0 backdrop-blur-sm"
            style={{ background: 'rgba(13,15,28,0.40)' }}
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full">
            <Sidebar mobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <div className="flex-1 overflow-y-auto pb-28 md:pb-6">
          {children}
        </div>
      </main>

      <MobileNav onMenuOpen={() => setMobileOpen(true)} />
      <FAB />
      <ToastContainer />
      <Onboarding />
      <WelcomeModal />
    </div>
  )
}

