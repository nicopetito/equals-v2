'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authService } from '@/services/auth.service'
import { Button } from '@/components/ui/Button'
import { OTPInput } from '@/components/auth/OTPInput'
import { Zap, ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'

// Nota: esta pantalla requiere que OTP esté habilitado en el dashboard de Supabase
// (Auth → Email → "Use OTP instead of magic link").
// Con la configuración por defecto, Supabase envía links de email, no códigos OTP.

function VerifyContent() {
  const [otp,           setOtp]           = useState('')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown,setResendCooldown]= useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown(c => c - 1), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  useEffect(() => {
    if (otp.length === 4) handleVerify()
  }, [otp])

  async function handleVerify() {
    if (!email || otp.length < 4) return
    setLoading(true)
    setError(null)
    try {
      await authService.verifyOtp(email, otp)
      router.push('/welcome')
    } catch {
      setError('El código es incorrecto o expiró. Revisá el email e intentá de nuevo.')
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!email) return
    setResendLoading(true)
    try {
      await authService.signUp(email, '')
    } catch {
      // ignorar error — el reenvío puede fallar si el user ya existe pero aún no confirmó
    } finally {
      setResendLoading(false)
      setResendCooldown(60)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Logo + back */}
        <div className="flex items-center justify-between mb-8 enter-1">
          <div className="flex items-center gap-3">
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
            href="/register"
            className="flex items-center gap-1.5 text-sm font-semibold hover:underline"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={14} /> Volver
          </Link>
        </div>

        {/* Encabezado */}
        <div className="mb-8 enter-2">
          <h1
            className="text-3xl font-extrabold"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
          >
            Verificá tu email
          </h1>
          <p className="mt-1.5 text-base" style={{ color: 'var(--text-muted)' }}>
            Ingresá el código de 4 dígitos que enviamos a{' '}
            {email
              ? <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{email}</span>
              : 'tu email'
            }.
          </p>
        </div>

        {/* Card OTP */}
        <div
          className="rounded-3xl p-7 space-y-6 enter-3"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <OTPInput
            value={otp}
            onChange={setOtp}
            disabled={loading}
            error={!!error}
          />

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

          <Button
            onClick={handleVerify}
            loading={loading}
            disabled={otp.length < 4}
            className="w-full"
            size="lg"
          >
            Verificar código
          </Button>

          <Button
            onClick={handleResend}
            loading={resendLoading}
            disabled={resendCooldown > 0}
            variant="ghost"
            className="w-full"
            size="md"
          >
            <RefreshCw size={15} />
            {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar código'}
          </Button>
        </div>

        <p className="text-center text-sm mt-5 enter-4" style={{ color: 'var(--text-muted)' }}>
          ¿El email es incorrecto?{' '}
          <Link
            href="/register"
            className="font-bold hover:underline"
            style={{ color: 'var(--brand-500)' }}
          >
            Volvé al registro
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  )
}
