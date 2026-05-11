'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { UserPlus, CheckCircle2, Zap } from 'lucide-react'

export default function RegisterPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const { signUp } = useAuth()
  const router = useRouter()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    if (password.length < 6)  { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    setLoading(true)
    try {
      await signUp(email, password)
      setSuccess(true)
    } catch {
      setError('Error al crear la cuenta. Es posible que el email ya esté registrado.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-base)' }}>
        <div
          className="w-full max-w-md text-center rounded-3xl p-10"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)' }}
        >
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'var(--income-50)', border: '2px solid var(--income-100)' }}
          >
            <CheckCircle2 size={40} style={{ color: 'var(--income-500)' }} />
          </div>
          <h2 className="text-2xl font-extrabold mb-2" style={{ color: 'var(--text-primary)' }}>
            ¡Cuenta creada con éxito!
          </h2>
          <p className="text-base mb-8" style={{ color: 'var(--text-muted)' }}>
            Revisá tu casilla de email para confirmar tu cuenta. Luego podés iniciar sesión.
          </p>
          <Button onClick={() => router.push('/login')} className="w-full" size="lg">
            Ir al inicio de sesión
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
            style={{ background: 'var(--grad-brand)', boxShadow: 'var(--shadow-brand)' }}
          >
            <Zap size={24} className="text-white" fill="white" />
          </div>
          <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
            Creá tu cuenta
          </h1>
          <p className="text-base mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Es gratis y solo toma un minuto
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
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            hint="Usá una contraseña segura que no uses en otros sitios"
          />
          <Input
            label="Confirmá tu contraseña"
            type="password"
            placeholder="Repetí tu contraseña"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />
          <Button type="submit" loading={loading} className="w-full" size="lg">
            <UserPlus size={18} /> Crear cuenta gratis
          </Button>
        </form>

        <p className="text-center text-sm mt-5" style={{ color: 'var(--text-muted)' }}>
          ¿Ya tenés cuenta?{' '}
          <Link
            href="/login"
            className="font-bold"
            style={{ color: 'var(--brand-500)' }}
          >
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
