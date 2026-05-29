'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Mail, ArrowLeft, Zap } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const { resetPassword } = useAuth()
  const router = useRouter()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await resetPassword(email)
    } catch {
      // Siempre mostrar éxito — no revelar si el email existe
    } finally {
      setLoading(false)
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div
          className="w-full max-w-md rounded-3xl overflow-hidden enter-1"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)' }}
        >
          {/* Franja superior brand */}
          <div
            className="p-8 text-center"
            style={{ background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)' }}
          >
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
              <Mail size={26} className="text-white" />
            </div>
            <h2
              className="text-2xl font-extrabold text-white"
              style={{ fontFamily: 'var(--font-sora)' }}
            >
              Link enviado
            </h2>
          </div>

          {/* Cuerpo */}
          <div className="p-8 text-center">
            <p className="text-base mb-8" style={{ color: 'var(--text-muted)' }}>
              Si existe una cuenta con ese email, vas a recibir las instrucciones en los próximos minutos.
              Revisá también tu carpeta de spam.
            </p>
            <Button
              onClick={() => router.push('/login')}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <ArrowLeft size={16} /> Volver al inicio de sesión
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Logo + back link */}
        <div className="flex items-center justify-between mb-6 enter-1">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)', boxShadow: 'var(--shadow-brand)' }}
            >
              <Zap size={16} className="text-white" fill="white" />
            </div>
            <span className="text-xl font-extrabold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
              Equal
            </span>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-sm font-semibold transition-colors hover:underline"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={14} /> Volver
          </Link>
        </div>

        {/* Card único que contiene heading + form */}
        <div
          className="rounded-3xl overflow-hidden enter-2"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
        >
          {/* Heading dentro del card */}
          <div className="px-7 pt-7 pb-5">
            <h1
              className="text-2xl font-extrabold"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
            >
              Recuperar contraseña
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              Ingresá tu email y te enviamos un link para crear una contraseña nueva.
            </p>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--border)' }} />

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="px-7 py-6 space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Button type="submit" loading={loading} className="w-full" size="lg">
              <Mail size={17} /> Enviar link de recuperación
            </Button>
          </form>
        </div>

        <p className="text-center text-sm mt-5 enter-3" style={{ color: 'var(--text-muted)' }}>
          ¿Todavía no tenés cuenta?{' '}
          <Link href="/register" className="font-bold hover:underline" style={{ color: 'var(--brand-500)' }}>
            Registrarte gratis
          </Link>
        </p>
      </div>
    </div>
  )
}
