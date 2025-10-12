'use client'

type GroupListItem = {
  id: number
  name: string
  sortIndex: number
}

type GroupListProps = {
  groups?: GroupListItem[]
}

const sortGroups = (groups: GroupListItem[]) =>
  [...groups].sort((a, b) => a.sortIndex - b.sortIndex)

/**
 * Placeholder list for the group management view.
 * Drag-and-drop reordering and API integration will be added in Task36+.
 */
export function GroupList({ groups = [] }: GroupListProps) {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-800/60 bg-slate-900/40 px-6 py-10 text-center">
        <h3 className="text-base font-semibold text-slate-100">グループはまだありません</h3>
        <p className="mt-3 text-sm text-slate-400">
          Task37で実装予定のグループ作成フォームからグループを追加するとここに表示されます。
        </p>
        <p className="mt-2 text-xs text-slate-500">
          ドラッグ&ドロップによる並び替えはTask36以降で組み込みます。
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
          Registered Groups
        </h3>
        <span className="rounded-full border border-slate-800/60 bg-slate-900 px-3 py-1 text-xs text-slate-300">
          {groups.length} 件
        </span>
      </div>

      <ul className="space-y-2">
        {sortGroups(groups).map((group) => (
          <li
            key={group.id}
            className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/60 px-4 py-3 text-sm text-slate-200 shadow-inner"
          >
            <div className="flex flex-col">
              <span className="font-medium text-slate-100">{group.name}</span>
              <span className="text-xs text-slate-500">
                sortIndex: {group.sortIndex}（Task36でドラッグ&ドロップ更新対応予定）
              </span>
            </div>
            <span className="rounded-full border border-slate-800/60 bg-slate-950 px-3 py-1 text-xs text-slate-400">
              ID: {group.id}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

