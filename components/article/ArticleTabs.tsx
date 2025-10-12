'use client'

import { useEffect, useMemo, useState } from 'react'

import { ArticleTabValue, isSameArticleTab, serializeArticleTab } from './tab-types'

type ArticleTabsProps = {
  groups?: { id: number; name: string; sortIndex?: number | null }[]
  initialValue?: ArticleTabValue
  onChange?: (value: ArticleTabValue) => void
  disabled?: boolean
  className?: string
  renderGroupLabel?: (group: { id: number; name: string; sortIndex?: number | null }) => string
}

type TabButton = {
  id: string
  label: string
  value: ArticleTabValue
}

const defaultValue: ArticleTabValue = { type: 'all' }

export function ArticleTabs({
  groups = [],
  initialValue = defaultValue,
  onChange,
  disabled = false,
  className = '',
  renderGroupLabel,
}: ArticleTabsProps) {
  const [activeTab, setActiveTab] = useState<ArticleTabValue>(initialValue)

  useEffect(() => {
    setActiveTab((prev) => (isSameArticleTab(prev, initialValue) ? prev : initialValue))
  }, [initialValue])

  const tabs = useMemo<TabButton[]>(() => {
    const sortedGroups = [...groups].sort((a, b) => {
      if (typeof a.sortIndex === 'number' && typeof b.sortIndex === 'number') {
        return a.sortIndex - b.sortIndex
      }
      return a.name.localeCompare(b.name)
    })

    const groupTabs = sortedGroups.map<TabButton>((group) => ({
      id: serializeArticleTab({ type: 'group', groupId: group.id }),
      label: renderGroupLabel ? renderGroupLabel(group) : group.name,
      value: { type: 'group', groupId: group.id },
    }))

    return [
      {
        id: 'all',
        label: '全て',
        value: { type: 'all' } satisfies ArticleTabValue,
      },
      ...groupTabs,
      {
        id: 'ungrouped',
        label: '未分類',
        value: { type: 'ungrouped' } satisfies ArticleTabValue,
      },
    ]
  }, [groups, renderGroupLabel])

  const handleSelect = (value: ArticleTabValue) => {
    if (disabled || isSameArticleTab(activeTab, value)) {
      return
    }

    setActiveTab(value)
    onChange?.(value)
  }

  return (
    <nav
      aria-label="記事フィルターのタブ"
      className={`flex flex-wrap items-center gap-2 rounded-xl border border-slate-800/60 bg-slate-900/60 p-2 ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = isSameArticleTab(activeTab, tab.value)
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleSelect(tab.value)}
            disabled={disabled}
            className={[
              'rounded-lg px-4 py-2 text-sm transition',
              isActive
                ? 'bg-slate-100 text-slate-900 shadow'
                : 'bg-transparent text-slate-300 hover:bg-slate-800/60',
              disabled ? 'cursor-not-allowed opacity-60' : '',
            ].join(' ')}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
