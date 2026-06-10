'use client'

import { useCallback, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

const DISMISSED_KEY = 'eq_pwa_install_dismissed_until'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function isDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    if (!raw) return false
    return Date.now() < parseInt(raw, 10)
  } catch {
    return false
  }
}

function saveDismissal() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + DISMISS_DURATION_MS))
  } catch {
    // localStorage unavailable
  }
}

function clearDismissal() {
  try {
    localStorage.removeItem(DISMISSED_KEY)
  } catch {
    // localStorage unavailable
  }
}

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  )
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    !!(navigator as Navigator & { standalone?: boolean }).standalone
  )
}

interface UsePwaInstallPromptReturn {
  showPrompt: boolean
  isIOS: boolean
  isInstalling: boolean
  handleInstall: () => Promise<void>
  handleDismiss: () => void
}

export function usePwaInstallPrompt(): UsePwaInstallPromptReturn {
  const [mounted, setMounted] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsDismissed(isDismissedRecently())
    setIsInstalled(detectStandalone())

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      clearDismissal()
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    setIsInstalling(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setDeferredPrompt(null)
        clearDismissal()
      } else {
        saveDismissal()
        setIsDismissed(true)
        setDeferredPrompt(null)
      }
    } finally {
      setIsInstalling(false)
    }
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    saveDismissal()
    setIsDismissed(true)
  }, [])

  const isIOS = mounted ? detectIOS() : false
  const isStandalone = mounted ? detectStandalone() : false

  // Show the prompt when:
  // - mounted (no SSR flash)
  // - not already installed/standalone
  // - not recently dismissed
  // - either there's a native install event (Android/Desktop) OR it's iOS
  const showPrompt =
    mounted &&
    !isStandalone &&
    !isInstalled &&
    !isDismissed &&
    (deferredPrompt !== null || isIOS)

  return {
    showPrompt,
    isIOS,
    isInstalling,
    handleInstall,
    handleDismiss,
  }
}
