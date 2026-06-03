'use client'

import type { ReactNode } from 'react'
import { MotionConfig } from 'motion/react'
import { AuthProvider } from './AuthProvider'
import { ToastProvider } from './ToastProvider'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </MotionConfig>
  )
}
