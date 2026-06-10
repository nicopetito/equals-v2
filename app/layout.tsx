import type { Metadata, Viewport } from 'next'
import { Sora, Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers/Providers'
import { PwaServiceWorkerRegistration } from '@/components/pwa/PwaServiceWorkerRegistration'
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt'

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-sora',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#6d3bd7',
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'Equal — Tu gestor financiero personal',
  description: 'Controlá tus ingresos, gastos, objetivos y billeteras en un solo lugar.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Equal',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`h-full ${sora.variable} ${inter.variable}`}>
      <body className="h-full" suppressHydrationWarning>
        <Providers>{children}</Providers>
        <PwaServiceWorkerRegistration />
        <PwaInstallPrompt />
      </body>
    </html>
  )
}
