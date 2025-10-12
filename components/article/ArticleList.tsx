'use client'

import { useCallback, useMemo, useRef, useState } from 'react'

import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import { useReadStatusBatch } from '@/hooks/useReadStatusBatch'

import { ArticleCard } from './ArticleCard'
import { ArticleListItem, ArticleTabValue } from './tab-types'

type ArticleListProps = {
  articles?: ArticleListItem[]
  activeTab: ArticleTabValue
  showUnreadOnly?: boolean
  onManualMarkRead?: (articleId: string) => void
  onManualMarkUnread?: (articleId: string) => void
  onBatchError?: (error: unknown) => void
  className?: string
  emptyState?: React.ReactNode
}

const defaultEmptyState = (
  <div className="rounded-xl border border-dashed border-slate-800/60 bg-slate-900/40 px-6 py-10 text-center text-sm text-slate-400">
    表示できる記事がありません。新しいフィードを登録してみましょう。
  </div>
)

export function ArticleList({
  articles = [],
  activeTab,
  showUnreadOnly = false,
  onManualMarkRead,
  onManualMarkUnread,
  onBatchError,
  className = '',
  emptyState = defaultEmptyState,
}: ArticleListProps) {
  const [localReadMap, setLocalReadMap] = useState<Record<string, boolean>>({})
  const elementRegistryRef = useRef<Map<string, HTMLElement>>(new Map())

  const { markAsRead, isSynced, clearSynced } = useReadStatusBatch({
    onError: onBatchError,
  })

  const handleIntersect = useCallback(
    (articleId: string) => {
      markAsRead(articleId)
      setLocalReadMap((prev) => {
        if (prev[articleId]) {
          return prev
        }
        return { ...prev, [articleId]: true }
      })
    },
    [markAsRead],
  )

  const { observe, unobserve } = useIntersectionObserver(handleIntersect)

  const registerIntersectionTarget = useCallback(
    (element: HTMLElement | null, articleId: string) => {
      if (element) {
        elementRegistryRef.current.set(articleId, element)
        observe(element)
      } else {
        const existing = elementRegistryRef.current.get(articleId)
        if (existing) {
          unobserve(existing)
          elementRegistryRef.current.delete(articleId)
        }
      }
    },
    [observe, unobserve],
  )

  const filteredArticles = useMemo(() => {
    const matchesTab = (article: ArticleListItem) => {
      switch (activeTab.type) {
        case 'all':
          return true
        case 'group':
          return (article.groupIds ?? []).includes(activeTab.groupId)
        case 'ungrouped':
          return (article.groupIds ?? []).length === 0
        default:
          return true
      }
    }

    return articles.filter((article) => {
      if (!matchesTab(article)) {
        return false
      }

      const readFlag =
        article.isRead ||
        localReadMap[article.id] ||
        isSynced(article.id)

      if (showUnreadOnly) {
        return !readFlag
      }

      return true
    })
  }, [activeTab, articles, isSynced, localReadMap, showUnreadOnly])

  const handleManualMarkRead = useCallback(
    (articleId: string) => {
      setLocalReadMap((prev) => (prev[articleId] ? prev : { ...prev, [articleId]: true }))
      onManualMarkRead?.(articleId)
    },
    [onManualMarkRead],
  )

  const handleManualMarkUnread = useCallback(
    (articleId: string) => {
      setLocalReadMap((prev) => {
        if (!prev[articleId]) {
          return prev
        }

        const next = { ...prev }
        delete next[articleId]
        return next
      })
      clearSynced(articleId)
      onManualMarkUnread?.(articleId)
    },
    [onManualMarkUnread, clearSynced],
  )

  if (filteredArticles.length === 0) {
    return <div className={className}>{emptyState}</div>
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {filteredArticles.map((article) => (
        <ArticleCard
          key={article.id}
          article={{
            ...article,
            isRead:
              article.isRead ||
              localReadMap[article.id] ||
              isSynced(article.id),
          }}
          registerIntersectionTarget={registerIntersectionTarget}
          onManualMarkRead={handleManualMarkRead}
          onManualMarkUnread={handleManualMarkUnread}
        />
      ))}
    </div>
  )
}
