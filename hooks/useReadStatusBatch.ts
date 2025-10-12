'use client'

import { useCallback, useRef } from 'react'

type ReadStatusBatchOptions = {
  debounceMs?: number
  endpoint?: string
  onError?: (error: unknown) => void
  fetcher?: typeof fetch
}

type UseReadStatusBatchResult = {
  markAsRead: (articleId: string) => void
  flushNow: () => Promise<void>
  isQueued: (articleId: string) => boolean
  isSynced: (articleId: string) => boolean
  reset: () => void
  clearSynced: (articleId: string) => void
}

export function useReadStatusBatch(options: ReadStatusBatchOptions = {}): UseReadStatusBatchResult {
  const {
    debounceMs = 500,
    endpoint = '/api/read-status',
    onError,
    fetcher = fetch,
  } = options

  const queueRef = useRef<Set<string>>(new Set())
  const syncedRef = useRef<Set<string>>(new Set())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushPromiseRef = useRef<Promise<void> | null>(null)

  const flushNow = useCallback(async () => {
    if (queueRef.current.size === 0) {
      return
    }

    const articleIds = Array.from(queueRef.current)
    queueRef.current.clear()

    try {
      flushPromiseRef.current = fetcher(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleIds, isRead: true }),
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to update read status (${response.status})`)
        }

        articleIds.forEach((id) => syncedRef.current.add(id))
      })

      await flushPromiseRef.current
    } catch (error) {
      articleIds.forEach((id) => queueRef.current.add(id))
      if (onError) {
        onError(error)
      } else {
        console.error('useReadStatusBatch: failed to update read status', error)
      }
    } finally {
      flushPromiseRef.current = null
    }
  }, [endpoint, fetcher, onError])

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      void flushNow()
    }, debounceMs)
  }, [debounceMs, flushNow])

  const markAsRead = useCallback(
    (articleId: string) => {
      if (!articleId || syncedRef.current.has(articleId) || queueRef.current.has(articleId)) {
        return
      }

      queueRef.current.add(articleId)
      scheduleFlush()
    },
    [scheduleFlush],
  )

  const isQueued = useCallback((articleId: string) => queueRef.current.has(articleId), [])

  const isSynced = useCallback((articleId: string) => syncedRef.current.has(articleId), [])

  const reset = useCallback(() => {
    queueRef.current.clear()
    syncedRef.current.clear()
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const clearSynced = useCallback((articleId: string) => {
    syncedRef.current.delete(articleId)
  }, [])

  return {
    markAsRead,
    flushNow,
    isQueued,
    isSynced,
    reset,
    clearSynced,
  }
}
