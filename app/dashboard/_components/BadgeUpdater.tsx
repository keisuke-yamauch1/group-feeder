'use client'

import { useBadgeUpdate } from '@/hooks/useBadgeUpdate'

type BadgeUpdaterProps = {
  unreadCount: number | null | undefined
}

/**
 * Connects the unread count to the native/app badge surfaces.
 */
export function BadgeUpdater({ unreadCount }: BadgeUpdaterProps) {
  useBadgeUpdate(unreadCount)
  return null
}
