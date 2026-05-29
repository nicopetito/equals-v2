import { redirect } from 'next/navigation'

// El onboarding de bienvenida ahora es un modal dentro del dashboard.
// Esta ruta redirige al dashboard donde el WelcomeModal aparece automáticamente.
export default function WelcomePage() {
  redirect('/dashboard')
}
