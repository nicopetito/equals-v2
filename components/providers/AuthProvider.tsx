'use client'

import { createContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { authService } from '@/services/auth.service'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authService.getUser().then((u) => {
      setUser(u)
      setLoading(false)
    })

    const { data: { subscription } } = authService.onAuthStateChange((_event, session) => {
      const s = session as { user?: User } | null
      setUser(s?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const data = await authService.signIn(email, password)
    setUser(data.user)
  }

  async function signUp(email: string, password: string) {
    await authService.signUp(email, password)
  }

  async function signOut() {
    await authService.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
