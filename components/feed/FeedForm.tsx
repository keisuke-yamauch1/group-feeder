'use client'

import { useCallback, useMemo, useState } from 'react'

type FeedFormProps = {
  groups?: { id: number; name: string }[]
  onSubmit?: (payload: { url: string; groupIds: number[] }) => void | Promise<void>
  disabled?: boolean
}

const ensureUnique = (ids: number[]) => Array.from(new Set(ids))

const normalizeUrl = (url: string) => url.trim()

/**
 * Task38 placeholder. Handles local state and defers API wiring / URL validation to later tasks.
 */
export function FeedForm({ groups = [], onSubmit, disabled = false }: FeedFormProps) {
  const [url, setUrl] = useState('')
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([])
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  const hasGroups = groups.length > 0

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.name.localeCompare(b.name)),
    [groups]
  )

  const toggleGroup = useCallback(
    (id: number) => {
      setSelectedGroupIds((prev) =>
        prev.includes(id) ? prev.filter((gid) => gid !== id) : ensureUnique([...prev, id])
      )
    },
    []
  )

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setHasAttemptedSubmit(true)

      const normalized = normalizeUrl(url)
      if (!normalized) {
        return
      }

      if (onSubmit) {
        await onSubmit({ url: normalized, groupIds: selectedGroupIds })
      }
    },
    [onSubmit, selectedGroupIds, url]
  )

  const showUrlHint = hasAttemptedSubmit && !normalizeUrl(url)

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-xl border border-slate-800/60 bg-slate-900/60 px-6 py-6 shadow-inner"
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-slate-100">フィードを登録</h3>
        <p className="text-xs text-slate-500">
          本フォームはTask38としてレイアウトのみ提供します。URL検証やAPI連携は後続タスクで追加します。
        </p>
      </div>

      <label className="flex flex-col gap-2 text-sm text-slate-200">
        <span>フィードURL</span>
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com/feed.xml"
          disabled={disabled}
          className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {showUrlHint ? (
          <span className="text-xs text-rose-400">フィードURLを入力してください。</span>
        ) : null}
        <span className="text-xs text-slate-500">
          lib/security/url-validator.tsの実装後に検証を差し込み予定です。
        </span>
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold text-slate-100">追加するグループ</legend>
        {hasGroups ? (
          <div className="flex flex-wrap gap-2">
            {sortedGroups.map((group) => {
              const selected = selectedGroupIds.includes(group.id)

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  disabled={disabled}
                  className={[
                    'rounded-full border px-4 py-1 text-xs transition',
                    selected
                      ? 'border-slate-100 bg-slate-100 text-slate-900'
                      : 'border-slate-800/80 bg-slate-950 text-slate-300 hover:border-slate-600'
                  ].join(' ')}
                >
                  {group.name}
                </button>
              )
            })}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-800/60 bg-slate-900/40 px-4 py-3 text-xs text-slate-400">
            グループはまだ登録されていません。Task37で作成されたグループがある場合、ここに表示されます。
          </p>
        )}
        <span className="text-xs text-slate-500">
          複数グループを選択すると、登録後に中間テーブルGroupFeedへ紐付ける想定です。
        </span>
      </fieldset>

      <button
        type="submit"
        disabled={disabled}
        className="inline-flex items-center justify-center rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        登録する
      </button>
    </form>
  )
}

