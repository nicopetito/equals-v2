'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AuthSidebar } from '@/components/auth/AuthSidebar'
import { UserPlus, CheckCircle2, XCircle } from 'lucide-react'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function humanizeAuthError(error: unknown): string {
  const msg = error instanceof Error ? error.message.toLowerCase() : ''
  if (msg.includes('user already registered') || msg.includes('already registered'))
    return 'Ya hay una cuenta con ese email. ¿Lo recordás? Probá iniciar sesión.'
  if (msg.includes('password should be at least'))
    return 'La contraseña necesita al menos 8 caracteres.'
  if (msg.includes('rate limit') || msg.includes('too many'))
    return 'Demasiados intentos seguidos. Esperá unos minutos y volvé a intentar.'
  return 'Algo salió mal al crear la cuenta. Intentá de nuevo en unos segundos.'
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

export default function RegisterPage() {
  const [fullName,  setFullName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [error,     setError]     = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const { signUp } = useAuth()
  const router = useRouter()

  const strength = getPasswordStrength(password)
  const confirmMatch = confirm.length > 0 && password === confirm

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (fullName.trim().length < 2)    { setError('¿Cómo te llamás? Ingresá tu nombre completo.'); return }
    if (!EMAIL_RE.test(email))          { setError('Ese email no parece válido. Revisalo y volvé a intentar.'); return }
    if (password.length < 8)           { setError('La contraseña necesita al menos 8 caracteres.'); return }
    if (password !== confirm)           { setError('Las contraseñas no coinciden. Fijate bien en la segunda.'); return }
    setLoading(true)
    try {
      await signUp(email, password, fullName.trim())
      router.push('/verify?email=' + encodeURIComponent(email))
    } catch (err) {
      setError(humanizeAuthError(err))
    } finally {
      setLoading(false)
    }
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
              <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M13 2L4.5 13.5H11L10 22L20.5 10.5H14L13 2Z"/></svg>
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
              Tu plata, finalmente ordenada.
            </h1>
            <p className="mt-1.5 text-base" style={{ color: 'var(--text-muted)' }}>
              Creá tu cuenta gratis y empezá en menos de tres minutos.
            </p>
          </div>

          {/* Formulario */}
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-3xl p-4 sm:p-7 enter-2"
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

            <div className="space-y-1.5">
              <Input
                label="Confirmá tu contraseña"
                type="password"
                placeholder="Repetí tu contraseña"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
              {confirm.length > 0 && (
                <div className="flex items-center gap-1.5 px-0.5">
                  {confirmMatch
                    ? <><CheckCircle2 size={13} style={{ color: 'var(--income-500)' }} /><span className="text-xs font-medium" style={{ color: 'var(--income-500)' }}>Las contraseñas coinciden</span></>
                    : <><XCircle size={13} style={{ color: 'var(--expense-500)' }} /><span className="text-xs font-medium" style={{ color: 'var(--expense-500)' }}>Las contraseñas no coinciden</span></>
                  }
                </div>
              )}
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              <UserPlus size={18} /> Crear mi cuenta
            </Button>
          </form>

          <p className="text-center text-sm mt-5 enter-3" style={{ color: 'var(--text-muted)' }}>
            ¿Ya sos parte?{' '}
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
