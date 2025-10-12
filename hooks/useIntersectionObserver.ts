'use client'

import { useCallback, useEffect, useRef } from 'react'

type IntersectionOptions = {
  threshold?: number
  rootMargin?: string
}

type ObserveResult = {
  observe: (element: HTMLElement | null) => void
  unobserve: (element: HTMLElement | null) => void
}

export function useIntersectionObserver(
  onIntersect: (articleId: string) => void,
  options: IntersectionOptions = {},
): ObserveResult {
  const callbackRef = useRef(onIntersect)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    callbackRef.current = onIntersect
  }, [onIntersect])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return
          }

          if (entry.intersectionRatio < (options.threshold ?? 0.5)) {
            return
          }

          const target = entry.target as HTMLElement
          const articleId = target.getAttribute('data-article-id')

          if (articleId) {
            callbackRef.current(articleId)
          }
        })
      },
      {
        threshold: options.threshold ?? 0.5,
        rootMargin: options.rootMargin,
      },
    )

    observerRef.current = observer

    return () => {
      observer.disconnect()
      observerRef.current = null
    }
  }, [options.threshold, options.rootMargin])

  const observe = useCallback((element: HTMLElement | null) => {
    if (element && observerRef.current) {
      observerRef.current.observe(element)
    }
  }, [])

  const unobserve = useCallback((element: HTMLElement | null) => {
    if (element && observerRef.current) {
      observerRef.current.unobserve(element)
    }
  }, [])

  return { observe, unobserve }
}
