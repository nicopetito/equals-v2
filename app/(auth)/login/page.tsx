'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AuthSidebar } from '@/components/auth/AuthSidebar'
import { LogIn, Zap } from 'lucide-react'

function humanizeAuthError(error: unknown): string {
  const msg = error instanceof Error ? error.message.toLowerCase() : ''
  if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials'))
    return 'Email o contraseña incorrectos. Verificá tus datos e intentá de nuevo.'
  if (msg.includes('email not confirmed'))
    return 'Tu email no está confirmado. Revisá tu casilla y hacé click en el link de activación.'
  if (msg.includes('rate limit') || msg.includes('too many'))
    return 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.'
  return 'Ocurrió un error inesperado. Intentá de nuevo en unos segundos.'
}

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      router.push('/dashboard')
    } catch (err) {
      setError(humanizeAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <AuthSidebar />

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-8 lg:hidden enter-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)', boxShadow: 'var(--shadow-brand)' }}
            >
              <Zap size={18} className="text-white" fill="white" />
            </div>
            <span className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
              Equal
            </span>
          </div>

          {/* Encabezado */}
          <div className="mb-8 enter-1">
            <h1
              className="text-3xl font-extrabold"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
            >
              Bienvenido de vuelta
            </h1>
            <p className="mt-1.5 text-base" style={{ color: 'var(--text-muted)' }}>
              Ingresá con tu cuenta de Equal para continuar.
            </p>
          </div>

          {/* Formulario */}
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-3xl p-7 enter-2"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {error && (
              <div
                role="alert"
                className="rounded-xl px-4 py-3 text-sm font-medium flex items-start gap-2"
                style={{ background: 'var(--expense-50)', color: 'var(--expense-600)', border: '1px solid var(--expense-100)' }}
              >
                <span className="shrink-0 mt-0.5">⚠</span>
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <div className="space-y-1.5">
              <Input
                label="Contraseña"
                type="password"
                placeholder="Ingresá tu contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold transition-colors hover:underline"
                  style={{ color: 'var(--brand-500)' }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              <LogIn size={18} /> Iniciar sesión
            </Button>
          </form>

          <p className="text-center text-sm mt-5 enter-3" style={{ color: 'var(--text-muted)' }}>
            ¿Todavía no tenés cuenta?{' '}
            <Link
              href="/register"
              className="font-bold transition-colors hover:underline"
              style={{ color: 'var(--brand-500)' }}
            >
              Crear cuenta gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
