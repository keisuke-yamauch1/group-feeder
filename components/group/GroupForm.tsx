'use client'

import { useCallback, useState } from 'react'

type GroupFormMode = 'create' | 'edit'

type GroupFormProps = {
  mode?: GroupFormMode
  initialName?: string
  onSubmit?: (payload: { name: string; mode: GroupFormMode }) => void | Promise<void>
  disabled?: boolean
}

const defaultLabels: Record<GroupFormMode, { title: string; action: string }> = {
  create: {
    title: '新しいグループを作成',
    action: 'グループを追加'
  },
  edit: {
    title: 'グループ名を編集',
    action: 'グループを更新'
  }
}

/**
 * Lightweight form for Task37. API連携やバリデーション拡張はTask38以降で扱う。
 */
export function GroupForm({
  mode = 'create',
  initialName = '',
  onSubmit,
  disabled = false
}: GroupFormProps) {
  const [name, setName] = useState(initialName)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setHasSubmitted(true)

      if (!name.trim()) {
        return
      }

      if (onSubmit) {
        await onSubmit({ name: name.trim(), mode })
      }
    },
    [name, mode, onSubmit]
  )

  const labels = defaultLabels[mode]
  const showRequiredHint = hasSubmitted && !name.trim()

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-slate-800/60 bg-slate-900/60 px-6 py-6 shadow-inner"
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-slate-100">{labels.title}</h3>
        <p className="text-xs text-slate-500">
          APIへのPOST/PUT処理は後続タスクで差し込み予定です。今はローカル状態のみ扱います。
        </p>
      </div>

      <label className="flex flex-col gap-2 text-sm text-slate-200">
        <span>グループ名</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="例: テクノロジー"
          disabled={disabled}
          className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {showRequiredHint ? (
          <span className="text-xs text-rose-400">グループ名を入力してください。</span>
        ) : null}
      </label>

      <button
        type="submit"
        disabled={disabled}
        className="inline-flex items-center justify-center rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {labels.action}
      </button>
    </form>
  )
}

