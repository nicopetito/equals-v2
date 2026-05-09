'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { UserPlus, CheckCircle2 } from 'lucide-react'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const router = useRouter()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    setLoading(true)
    try {
      await signUp(email, password)
      setSuccess(true)
    } catch {
      setError('Error al crear la cuenta. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f8f7ff' }}>
        <div className="w-full max-w-md text-center bg-white rounded-2xl p-8 border border-gray-100" style={{ boxShadow: '0 10px 15px rgba(70,51,151,0.08)' }}>
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">¡Cuenta creada!</h2>
          <p className="text-gray-500 mb-6">Revisá tu email para confirmar tu cuenta y luego iniciá sesión.</p>
          <Button onClick={() => router.push('/login')} className="w-full">Ir al login</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f8f7ff' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg"
            style={{ background: 'linear-gradient(135deg,#463397,#9850eb)' }}
          >
            <span className="text-white text-2xl font-bold">E</span>
          </div>
          <h1 className="text-3xl font-bold" style={{ color: '#463397' }}>Equals</h1>
          <p className="text-gray-500 mt-1">Creá tu cuenta gratis</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-8 space-y-5 border border-gray-100"
          style={{ boxShadow: '0 10px 15px rgba(70,51,151,0.08)' }}
        >
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
          )}
          <Input label="Email" type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input label="Contraseña" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required />
          <Input label="Confirmar contraseña" type="password" placeholder="Repetí tu contraseña" value={confirm} onChange={e => setConfirm(e.target.value)} required />
          <Button type="submit" loading={loading} className="w-full" size="lg">
            <UserPlus size={18} />
            Crear cuenta
          </Button>
          <p className="text-center text-sm text-gray-500">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="font-semibold" style={{ color: '#463397' }}>Iniciá sesión</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
