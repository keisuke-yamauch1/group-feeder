'use client'

import { useCallback, useMemo } from 'react'

import { sanitizeHtml } from '@/lib/sanitize'

import { ArticleListItem } from './tab-types'

type ArticleCardProps = {
  article: ArticleListItem
  registerIntersectionTarget?: (element: HTMLElement | null, articleId: string) => void
  onManualMarkRead?: (articleId: string) => void
  onManualMarkUnread?: (articleId: string) => void
  showDescription?: boolean
  descriptionSource?: 'description' | 'content'
  className?: string
}

function formatPublishedAt(value: ArticleListItem['publishedAt']): string | null {
  if (!value) {
    return null
  }

  const date = typeof value === 'string' ? new Date(value) : value

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function ArticleCard({
  article,
  registerIntersectionTarget,
  onManualMarkRead,
  onManualMarkUnread,
  showDescription = true,
  descriptionSource = 'description',
  className = '',
}: ArticleCardProps) {
  const formattedPublishedAt = useMemo(() => formatPublishedAt(article.publishedAt), [article.publishedAt])

  const descriptionHtml = useMemo(() => {
    const raw = descriptionSource === 'content' ? article.content : article.description
    return raw ? sanitizeHtml(raw) : null
  }, [article.content, article.description, descriptionSource])

  const registerRef = useCallback(
    (node: HTMLDivElement | null) => {
      registerIntersectionTarget?.(node, article.id)
    },
    [article.id, registerIntersectionTarget],
  )

  const handleManualMarkRead = () => {
    onManualMarkRead?.(article.id)
  }

  const handleManualMarkUnread = () => {
    onManualMarkUnread?.(article.id)
  }

  const isRead = article.isRead ?? false

  return (
    <article
      ref={registerRef}
      data-article-id={article.id}
      className={[
        'rounded-xl border px-5 py-5 transition',
        isRead
          ? 'border-slate-800/60 bg-slate-900/40 text-slate-400'
          : 'border-slate-700 bg-slate-900/70 text-slate-100 shadow-inner',
        className,
      ].join(' ')}
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-100">
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-slate-300"
            >
              {article.title}
            </a>
          </h3>
          {article.feedTitle ? (
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{article.feedTitle}</p>
          ) : null}
          {article.author ? <p className="text-xs text-slate-500">by {article.author}</p> : null}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {formattedPublishedAt ? <time className="font-medium">{formattedPublishedAt}</time> : null}
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={handleManualMarkUnread}
              className="rounded-full border border-slate-700 px-2 py-1 text-[11px] uppercase transition hover:border-slate-500"
            >
              未読に戻す
            </button>
            <button
              type="button"
              onClick={handleManualMarkRead}
              className="rounded-full border border-slate-700 px-2 py-1 text-[11px] uppercase transition hover:border-slate-500"
            >
              既読にする
            </button>
          </div>
        </div>
      </header>

      {showDescription && descriptionHtml ? (
        <div
          className="mt-4 text-sm leading-relaxed text-slate-300"
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      ) : null}
    </article>
  )
}
