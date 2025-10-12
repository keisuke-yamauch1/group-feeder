'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallButtonProps = {
  className?: string
  children?: ReactNode
}

/**
 * Renders a button that becomes visible when the browser fires `beforeinstallprompt`.
 * The button triggers the cached prompt and hides itself once the user makes a choice.
 */
export function InstallButton({ className = '', children }: InstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const checkDisplayMode = () => {
      const query = window.matchMedia?.('(display-mode: standalone)')
      const isStandalone = Boolean(query && query.matches)
      const isIosStandalone = (window.navigator as unknown as { standalone?: boolean })?.standalone
      if (isStandalone || isIosStandalone) {
        setIsInstallable(false)
      }
    }

    checkDisplayMode()
    window.addEventListener('resize', checkDisplayMode)

    return () => {
      window.removeEventListener('resize', checkDisplayMode)
    }
  }, [])

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstallable(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return
    }

    try {
      deferredPrompt.prompt()
      await deferredPrompt.userChoice
    } finally {
      setDeferredPrompt(null)
      setIsInstallable(false)
    }
  }, [deferredPrompt])

  if (!isInstallable || !deferredPrompt) {
    return null
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${className}`}
    >
      {children ?? 'アプリをインストール'}
    </button>
  )
}

export default InstallButton
