'use client'

import { useState, useEffect, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/auth.service'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AuthSidebar } from '@/components/auth/AuthSidebar'
import { UserPlus, Mail, Zap, RefreshCw } from 'lucide-react'

function humanizeAuthError(error: unknown): string {
  const msg = error instanceof Error ? error.message.toLowerCase() : ''
  if (msg.includes('user already registered') || msg.includes('already registered'))
    return 'Ya existe una cuenta con ese email. ¿Querés iniciar sesión?'
  if (msg.includes('password should be at least'))
    return 'La contraseña debe tener al menos 8 caracteres.'
  if (msg.includes('rate limit') || msg.includes('too many'))
    return 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.'
  return 'No se pudo crear la cuenta. Intentá de nuevo en unos segundos.'
}

function getPasswordStrength(pwd: string): { level: 0 | 1 | 2 | 3; label: string } {
  if (pwd.length === 0) return { level: 0, label: '' }
  const hasNumber  = /[0-9]/.test(pwd)
  const hasUpper   = /[A-Z]/.test(pwd)
  if (pwd.length >= 8 && hasNumber && hasUpper) return { level: 3, label: 'Fuerte' }
  if (pwd.length >= 8 && hasNumber)             return { level: 2, label: 'Buena' }
  if (pwd.length >= 8)                          return { level: 1, label: 'Regular' }
  return { level: 1, label: 'Débil' }
}

const STRENGTH_COLORS = ['', '#e11d48', '#ffb869', '#16a34a']

function SuccessScreen({ email, onResend, onLogin }: {
  email: string
  onResend: () => Promise<void>
  onLogin: () => void
}) {
  const [resendLoading,  setResendLoading]  = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown(c => c - 1), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  async function handleResend() {
    setResendLoading(true)
    try {
      await onResend()
      setResendCooldown(60)
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <AuthSidebar variant="register" />
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="w-full max-w-md text-center rounded-3xl p-10 enter-1"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)' }}
        >
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'var(--brand-50)', border: '2px solid var(--brand-100)' }}
          >
            <Mail size={40} style={{ color: 'var(--brand-500)' }} />
          </div>
          <h2
            className="text-2xl font-extrabold mb-2"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
          >
            Revisá tu email
          </h2>
          <p className="text-base mb-2" style={{ color: 'var(--text-muted)' }}>
            Enviamos un link de confirmación a{' '}
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{email}</span>.
          </p>
          <p className="text-sm mb-8" style={{ color: 'var(--text-faint)' }}>
            Hacé click en el link para activar tu cuenta. Si no lo ves, revisá la carpeta de spam.
          </p>
          <div className="space-y-3">
            <Button onClick={onLogin} className="w-full" size="lg">
              Ir al inicio de sesión
            </Button>
            <Button
              onClick={handleResend}
              loading={resendLoading}
              disabled={resendCooldown > 0}
              variant="secondary"
              className="w-full"
              size="lg"
            >
              <RefreshCw size={16} />
              {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar email'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const [fullName,  setFullName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const { signUp } = useAuth()
  const router = useRouter()

  const strength = getPasswordStrength(password)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (fullName.trim().length < 2) { setError('Ingresá tu nombre completo.'); return }
    if (password.length < 8)        { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (password !== confirm)        { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    try {
      await signUp(email, password, fullName.trim())
      setSuccess(true)
    } catch (err) {
      setError(humanizeAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    await authService.signUp(email, password, fullName.trim())
  }

  if (success) {
    return (
      <SuccessScreen
        email={email}
        onResend={handleResend}
        onLogin={() => router.push('/login')}
      />
    )
  }

  return (
    <div className="flex min-h-screen">
      <AuthSidebar variant="register" />

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
              Creá tu cuenta gratis
            </h1>
            <p className="mt-1.5 text-base" style={{ color: 'var(--text-muted)' }}>
              Empezá a gestionar tus finanzas en minutos.
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
              label="Nombre completo"
              type="text"
              placeholder="Tu nombre y apellido"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              autoComplete="name"
            />

            <Input
              label="Email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <div className="space-y-2">
              <Input
                label="Contraseña"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              {password.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map(n => (
                      <div
                        key={n}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{
                          background: n <= strength.level
                            ? STRENGTH_COLORS[strength.level]
                            : 'var(--border)',
                        }}
                      />
                    ))}
                  </div>
                  <span
                    className="text-xs font-semibold w-12 text-right"
                    style={{ color: STRENGTH_COLORS[strength.level] || 'var(--text-faint)' }}
                  >
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <Input
              label="Confirmá tu contraseña"
              type="password"
              placeholder="Repetí tu contraseña"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />

            <Button type="submit" loading={loading} className="w-full" size="lg">
              <UserPlus size={18} /> Crear cuenta gratis
            </Button>
          </form>

          <p className="text-center text-sm mt-5 enter-3" style={{ color: 'var(--text-muted)' }}>
            ¿Ya tenés cuenta?{' '}
            <Link
              href="/login"
              className="font-bold transition-colors hover:underline"
              style={{ color: 'var(--brand-500)' }}
            >
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
