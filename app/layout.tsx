import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers/Providers'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'Equals — Tu gestor financiero personal',
  description: 'Controlá tus ingresos, gastos, objetivos y billeteras en un solo lugar.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full`}>
      <body className="font-sans bg-gray-950 text-gray-100 antialiased h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
