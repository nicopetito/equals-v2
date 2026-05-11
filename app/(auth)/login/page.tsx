'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { LogIn, Zap, Shield, TrendingUp, Target } from 'lucide-react'

const FEATURES = [
  { icon: TrendingUp, label: 'Seguí tus ingresos y gastos', color: '#10B981' },
  { icon: Target,     label: 'Alcanzá tus objetivos de ahorro', color: '#F59E0B' },
  { icon: Shield,     label: 'Datos seguros y privados', color: '#6366F1' },
]

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
    } catch {
      setError('Email o contraseña incorrectos. Verificá tus datos e intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Panel izquierdo — ilustración / marca (solo desktop) */}
      <div
        className="hidden lg:flex flex-col justify-between w-2/5 p-12"
        style={{ background: 'var(--grad-brand)', position: 'relative', overflow: 'hidden' }}
      >
        {/* Orb decorativo */}
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.08)', transform: 'translate(30%, -30%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.06)', transform: 'translate(-30%, 30%)' }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Zap size={20} className="text-white" fill="white" />
          </div>
          <span className="text-white text-2xl font-extrabold">Equals</span>
        </div>

        {/* Mensaje central */}
        <div className="relative space-y-8">
          <div>
            <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
              Tomá el control de tu dinero
            </h2>
            <p className="text-white/75 text-lg leading-relaxed">
              Gestioná tus finanzas personales de forma simple, visual y segura. Para todas las edades.
            </p>
          </div>
          <div className="space-y-3">
            {FEATURES.map(f => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/20">
                  <f.icon size={15} className="text-white" />
                </div>
                <span className="text-white/90 text-sm font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/50 text-xs">
          © 2025 Equals · Finanzas personales
        </p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--grad-brand)', boxShadow: 'var(--shadow-brand)' }}
            >
              <Zap size={18} className="text-white" fill="white" />
            </div>
            <span className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
              Equals
            </span>
          </div>

          {/* Encabezado */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
              Bienvenido de vuelta
            </h1>
            <p className="mt-1.5 text-base" style={{ color: 'var(--text-muted)' }}>
              Ingresá a tu cuenta para continuar
            </p>
          </div>

          {/* Formulario */}
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-3xl p-7"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {error && (
              <div
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
            <Input
              label="Contraseña"
              type="password"
              placeholder="Tu contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Button type="submit" loading={loading} className="w-full" size="lg">
              <LogIn size={18} /> Iniciar sesión
            </Button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: 'var(--text-muted)' }}>
            ¿No tenés cuenta?{' '}
            <Link
              href="/register"
              className="font-bold transition-colors"
              style={{ color: 'var(--brand-500)' }}
            >
              Registrarte gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
