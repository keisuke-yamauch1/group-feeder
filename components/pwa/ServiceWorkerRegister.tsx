'use client'

import { useEffect } from 'react'

/**
 * Registers the PWA service worker once the application hydrates on the client.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[ServiceWorker] registration failed', error)
        }
      }
    }

    register()
  }, [])

  return null
}
