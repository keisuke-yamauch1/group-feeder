'use client'

import { useEffect } from 'react'

/**
 * Synchronises the app badge with the latest unread count.
 * Falls back to the client-side Badging API when the service worker
 * does not expose a controller yet.
 */
export function useBadgeUpdate(unreadCount: number | null | undefined) {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const normalizedCount = typeof unreadCount === 'number' && unreadCount > 0 ? unreadCount : 0

    const updateServiceWorkerBadge = async () => {
      if (!('serviceWorker' in navigator)) {
        return
      }

      try {
        const registration = await navigator.serviceWorker.ready

        registration.active?.postMessage({
          type: 'UPDATE_BADGE',
          count: normalizedCount,
        })
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[BadgeUpdate] Failed to notify service worker', error)
        }
      }
    }

    const updateNavigatorBadge = async () => {
      const nav: Partial<Navigator> & Record<string, any> = navigator

      if (typeof nav.setAppBadge === 'function') {
        try {
          if (normalizedCount > 0) {
            await nav.setAppBadge(normalizedCount)
          } else {
            await nav.clearAppBadge?.()
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.debug('[BadgeUpdate] Failed to update navigator badge', error)
          }
        }
      }
    }

    updateServiceWorkerBadge()
    updateNavigatorBadge()
  }, [unreadCount])
}
