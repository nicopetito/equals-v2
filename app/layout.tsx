import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers/Providers'

export const metadata: Metadata = {
  title: 'Equals — Tu gestor financiero personal',
  description: 'Controlá tus ingresos, gastos, objetivos y billeteras en un solo lugar.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
