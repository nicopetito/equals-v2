import type { Metadata } from 'next'
import { Sora, Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers/Providers'

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

export const metadata: Metadata = {
  title: 'Equal — Tu gestor financiero personal',
  description: 'Controlá tus ingresos, gastos, objetivos y billeteras en un solo lugar.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`h-full ${sora.variable} ${inter.variable}`}>
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
