'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/auth.service'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CheckCircle2, AlertTriangle, Zap } from 'lucide-react'

function getPasswordStrength(pwd: string): { level: 0 | 1 | 2 | 3; label: string } {
  if (pwd.length === 0) return { level: 0, label: '' }
  const hasNumber = /[0-9]/.test(pwd)
  const hasUpper  = /[A-Z]/.test(pwd)
  if (pwd.length >= 8 && hasNumber && hasUpper) return { level: 3, label: 'Fuerte' }
  if (pwd.length >= 8 && hasNumber)             return { level: 2, label: 'Buena' }
  if (pwd.length >= 8)                          return { level: 1, label: 'Regular' }
  return { level: 1, label: 'Débil' }
}

const STRENGTH_COLORS = ['', '#e11d48', '#ffb869', '#16a34a']

export default function ResetPasswordPage() {
  const [password,   setPassword]   = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [error,      setError]      = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [success,    setSuccess]    = useState(false)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const { updatePassword } = useAuth()
  const router = useRouter()

  const strength = getPasswordStrength(password)

  useEffect(() => {
    // Supabase inyecta el token de recuperación en el hash de la URL
    const hash = window.location.hash
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      setTokenValid(true)
    }

    const { data: { subscription } } = authService.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setTokenValid(true)
    })

    // Si después de 2s no hay señal de token, asumir inválido
    const timer = setTimeout(() => {
      setTokenValid(prev => prev === null ? false : prev)
    }, 2000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    try {
      await updatePassword(password)
      setPassword('')
      setConfirm('')
      setSuccess(true)
    } catch {
      setError('No se pudo actualizar la contraseña. El link puede haber expirado.')
    } finally {
      setLoading(false)
    }
  }

  // Loading inicial mientras se detecta el token
  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="animate-pulse w-8 h-8 rounded-full" style={{ background: 'var(--brand-100)' }} />
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div
          className="w-full max-w-md text-center rounded-3xl p-10 enter-1"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)' }}
        >
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'var(--expense-50)', border: '2px solid var(--expense-100)' }}
          >
            <AlertTriangle size={40} style={{ color: 'var(--expense-500)' }} />
          </div>
          <h2
            className="text-2xl font-extrabold mb-3"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
          >
            Link inválido o expirado
          </h2>
          <p className="text-base mb-8" style={{ color: 'var(--text-muted)' }}>
            Este link ya fue usado o expiró. Podés solicitar uno nuevo desde la pantalla de recuperación.
          </p>
          <Button onClick={() => router.push('/forgot-password')} className="w-full" size="lg">
            Solicitar nuevo link
          </Button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div
          className="w-full max-w-md text-center rounded-3xl p-10 enter-1"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)' }}
        >
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'var(--income-50)', border: '2px solid var(--income-100)' }}
          >
            <CheckCircle2 size={40} style={{ color: 'var(--income-500)' }} />
          </div>
          <h2
            className="text-2xl font-extrabold mb-3"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
          >
            Contraseña actualizada
          </h2>
          <p className="text-base mb-8" style={{ color: 'var(--text-muted)' }}>
            Tu contraseña fue cambiada con éxito. Podés ingresar con tus nuevos datos.
          </p>
          <Button onClick={() => router.push('/login')} className="w-full" size="lg">
            Ir al inicio de sesión
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 enter-1">
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
        <div className="mb-8 enter-2">
          <h1
            className="text-3xl font-extrabold"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
          >
            Crear nueva contraseña
          </h1>
          <p className="mt-1.5 text-base" style={{ color: 'var(--text-muted)' }}>
            Elegí una contraseña segura para tu cuenta.
          </p>
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-3xl p-7 enter-3"
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

          <div className="space-y-2">
            <Input
              label="Nueva contraseña"
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
            Actualizar contraseña
          </Button>
        </form>
      </div>
    </div>
  )
}
