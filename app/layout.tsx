import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers/Providers'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Equals — Tu gestor financiero personal',
  description: 'Controlá tus ingresos, gastos, objetivos y billeteras en un solo lugar.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`h-full ${poppins.variable}`}>
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
