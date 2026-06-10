import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Equal — Tu gestor financiero personal',
    short_name: 'Equal',
    description: 'Controlá tus ingresos, gastos, objetivos y billeteras en un solo lugar.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#F4F5F9',
    theme_color: '#6d3bd7',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
