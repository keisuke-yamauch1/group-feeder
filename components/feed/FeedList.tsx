'use client'

type FeedListItem = {
  id: number
  url: string
  title?: string | null
  description?: string | null
  groups?: { id: number; name: string }[]
}

type FeedListProps = {
  feeds?: FeedListItem[]
  onDelete?: (feedId: number) => void | Promise<void>
  disabled?: boolean
}

const formatGroups = (groups: { id: number; name: string }[] = []) =>
  groups.map((group) => group.name).join(', ')

const sortFeeds = (feeds: FeedListItem[]) =>
  [...feeds].sort((a, b) => {
    const titleA = a.title?.toLowerCase() ?? ''
    const titleB = b.title?.toLowerCase() ?? ''
    return titleA.localeCompare(titleB)
  })

/**
 * Task39 placeholder. Displays feed metadata without calling APIs yet.
 */
export function FeedList({ feeds = [], onDelete, disabled = false }: FeedListProps) {
  if (feeds.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-800/60 bg-slate-900/40 px-6 py-10 text-center">
        <h3 className="text-base font-semibold text-slate-100">登録済みフィードはありません</h3>
        <p className="mt-3 text-sm text-slate-400">
          Task38で実装したフォームからフィードを登録すると、ここに一覧表示されます。
        </p>
        <p className="mt-2 text-xs text-slate-500">
          削除処理（DELETE /api/feed/[id]）は後続のAPI実装後に有効化します。
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
          Registered Feeds
        </h3>
        <span className="rounded-full border border-slate-800/60 bg-slate-900 px-3 py-1 text-xs text-slate-300">
          {feeds.length} 件
        </span>
      </div>

      <ul className="space-y-3">
        {sortFeeds(feeds).map((feed) => (
          <li
            key={feed.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-800/60 bg-slate-900/60 px-4 py-4 text-sm text-slate-200 shadow-inner"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-100">
                  {feed.title || '無題のフィード'}
                </p>
                <p className="mt-1 text-xs text-slate-500 break-all">{feed.url}</p>
              </div>
              <button
                type="button"
                onClick={() => onDelete?.(feed.id)}
                disabled={disabled || !onDelete}
                className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                削除
              </button>
            </div>

            {feed.description ? (
              <p className="text-xs text-slate-400">{feed.description}</p>
            ) : null}

            {feed.groups && feed.groups.length > 0 ? (
              <p className="text-xs text-slate-400">
                紐付けグループ: {formatGroups(feed.groups)}
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                グループ未設定（Task38+で複数グループ紐付けを予定）
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

