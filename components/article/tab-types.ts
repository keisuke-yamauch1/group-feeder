export type ArticleTabValue =
  | { type: 'all' }
  | { type: 'group'; groupId: number }
  | { type: 'ungrouped' }

export type ArticleListItem = {
  id: string
  title: string
  link: string
  description?: string | null
  content?: string | null
  publishedAt?: string | Date | null
  feedTitle?: string | null
  feedUrl?: string | null
  groupIds?: number[]
  isRead?: boolean
  author?: string | null
}

export function isSameArticleTab(a: ArticleTabValue, b: ArticleTabValue): boolean {
  if (a.type !== b.type) {
    return false
  }

  if (a.type === 'group' && b.type === 'group') {
    return a.groupId === b.groupId
  }

  return true
}

export function serializeArticleTab(value: ArticleTabValue): string {
  switch (value.type) {
    case 'all':
      return 'all'
    case 'ungrouped':
      return 'ungrouped'
    case 'group':
      return `group:${value.groupId}`
    default:
      return 'all'
  }
}
