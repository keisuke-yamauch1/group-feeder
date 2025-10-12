import { createHash } from 'crypto'

export function generateContentHash(item: {
  title: string
  description?: string
  pubDate?: string
}): string {
  const content = `${item.title}|${item.description || ''}|${item.pubDate || ''}`
  return createHash('sha256').update(content).digest('hex').slice(0, 16)
}
