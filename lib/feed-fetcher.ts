import { Feed } from '@prisma/client'
import { parseFeed } from 'feedsmith'

import { prisma } from '@/lib/prisma'

const USER_AGENT = 'GroupFeeder/1.0'
const ACCEPT_HEADER =
  'application/xml, text/xml, application/rss+xml, application/atom+xml, application/feed+json, application/json'

type FeedFormat = 'rss' | 'atom' | 'rdf' | 'json'

export type ContentHashInput = {
  title: string
  description?: string | null
  pubDate?: string | null
}

export type FetchFeedOptions = {
  generateContentHash?: (input: ContentHashInput) => string
}

export type FetchFeedResult = {
  feedId: number
  status: number
  updated: boolean
  fetchedAt: Date
  articlesCreated: number
  articlesSkipped: number
}

export type FeedFetchErrorCode = 'NETWORK' | 'HTTP_ERROR' | 'PARSE_ERROR'

export class FeedFetchError extends Error {
  readonly code: FeedFetchErrorCode

  constructor(code: FeedFetchErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'FeedFetchError'
    this.code = code
  }
}

type NormalizedFeedItem = {
  guid: string | null
  link: string
  title: string
  description: string | null
  content: string | null
  author: string | null
  pubDate: Date | null
  contentHash: string | null
}

export async function fetchFeed(feed: Feed, options: FetchFeedOptions = {}): Promise<FetchFeedResult> {
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: ACCEPT_HEADER,
  }

  if (feed.etag) {
    headers['If-None-Match'] = feed.etag
  }

  if (feed.lastModified) {
    headers['If-Modified-Since'] = feed.lastModified
  }

  let response: Response
  try {
    response = await fetch(feed.url, { headers })
  } catch (error) {
    throw new FeedFetchError('NETWORK', `Failed to fetch feed ${feed.url}`, { cause: error })
  }

  const fetchedAt = new Date()
  const etag = response.headers.get('etag')
  const lastModified = response.headers.get('last-modified')

  if (response.status === 304) {
    await prisma.feed.update({
      where: { id: feed.id },
      data: {
        lastFetchedAt: fetchedAt,
        etag: etag ?? null,
        lastModified: lastModified ?? null,
      },
    })

    return {
      feedId: feed.id,
      status: response.status,
      updated: false,
      fetchedAt,
      articlesCreated: 0,
      articlesSkipped: 0,
    }
  }

  if (!response.ok) {
    throw new FeedFetchError('HTTP_ERROR', `Feed responded with status ${response.status}`)
  }

  let rawContent: string
  try {
    rawContent = await response.text()
  } catch (error) {
    throw new FeedFetchError('NETWORK', 'Failed to read feed response body', { cause: error })
  }

  const contentType = response.headers.get('content-type') ?? ''
  const looksLikeJson =
    contentType.includes('json') ||
    (() => {
      const trimmed = rawContent.trimStart()
      return trimmed.startsWith('{') || trimmed.startsWith('[')
    })()

  let parsedFeed:
    | {
        format: FeedFormat
        feed: unknown
      }
    | null = null

  try {
    const input = looksLikeJson ? JSON.parse(rawContent) : rawContent
    parsedFeed = parseFeed(input) as { format: FeedFormat; feed: unknown }
  } catch (error) {
    throw new FeedFetchError('PARSE_ERROR', 'Failed to parse feed content', { cause: error })
  }

  const normalizedItems = normalizeItems(parsedFeed.format, parsedFeed.feed, feed.url, options.generateContentHash)

  if (normalizedItems.length === 0) {
    await prisma.feed.update({
      where: { id: feed.id },
      data: {
        lastFetchedAt: fetchedAt,
        etag: etag ?? null,
        lastModified: lastModified ?? null,
      },
    })

    return {
      feedId: feed.id,
      status: response.status,
      updated: false,
      fetchedAt,
      articlesCreated: 0,
      articlesSkipped: 0,
    }
  }

  const itemsToInsert = await filterExistingArticles(feed.id, normalizedItems)

  if (itemsToInsert.length > 0) {
    await prisma.article.createMany({
      data: itemsToInsert.map((item) => ({
        feedId: feed.id,
        guid: item.guid,
        link: item.link,
        contentHash: item.contentHash,
        title: item.title,
        description: item.description,
        content: item.content,
        author: item.author,
        pubDate: item.pubDate,
      })),
      skipDuplicates: true,
    })
  }

  await prisma.feed.update({
    where: { id: feed.id },
    data: {
      lastFetchedAt: fetchedAt,
      etag: etag ?? null,
      lastModified: lastModified ?? null,
    },
  })

  return {
    feedId: feed.id,
    status: response.status,
    updated: itemsToInsert.length > 0,
    fetchedAt,
    articlesCreated: itemsToInsert.length,
    articlesSkipped: normalizedItems.length - itemsToInsert.length,
  }
}

async function filterExistingArticles(feedId: number, items: NormalizedFeedItem[]): Promise<NormalizedFeedItem[]> {
  const guidValues = Array.from(new Set(items.map((item) => item.guid).filter(isNonEmptyString)))
  const linkValues = Array.from(new Set(items.map((item) => item.link)))
  const hashValues = Array.from(
    new Set(items.map((item) => item.contentHash).filter(isNonEmptyString)),
  )

  const [existingByGuid, existingByLink, existingByHash] = await Promise.all([
    guidValues.length > 0
      ? prisma.article.findMany({
          where: {
            guid: { in: guidValues },
          },
          select: { guid: true },
        })
      : Promise.resolve([]),
    linkValues.length > 0
      ? prisma.article.findMany({
          where: {
            link: { in: linkValues },
          },
          select: { link: true },
        })
      : Promise.resolve([]),
    hashValues.length > 0
      ? prisma.article.findMany({
          where: {
            feedId,
            contentHash: { in: hashValues },
          },
          select: { contentHash: true },
        })
      : Promise.resolve([]),
  ])

  const seenGuids = new Set(existingByGuid.map((item) => item.guid).filter(isNonEmptyString))
  const seenLinks = new Set(existingByLink.map((item) => item.link))
  const seenHashes = new Set(existingByHash.map((item) => item.contentHash).filter(isNonEmptyString))

  const deduped: NormalizedFeedItem[] = []

  for (const item of items) {
    const hasGuid = isNonEmptyString(item.guid)

    if (hasGuid && item.guid && seenGuids.has(item.guid)) {
      continue
    }

    if (seenLinks.has(item.link)) {
      continue
    }

    if (!hasGuid && item.contentHash && seenHashes.has(item.contentHash)) {
      continue
    }

    deduped.push(item)

    if (hasGuid && item.guid) {
      seenGuids.add(item.guid)
    }
    seenLinks.add(item.link)
    if (!hasGuid && item.contentHash) {
      seenHashes.add(item.contentHash)
    }
  }

  return deduped
}

function normalizeItems(
  format: FeedFormat,
  feed: unknown,
  feedUrl: string,
  generateContentHash?: (input: ContentHashInput) => string,
): NormalizedFeedItem[] {
  const rawItems = extractRawItems(format, feed)

  const normalized: NormalizedFeedItem[] = []

  for (const rawItem of rawItems) {
    const guid = extractGuid(rawItem)
    const link = resolveLink(extractLink(format, rawItem), feedUrl, guid)
    if (!link) {
      continue
    }

    const title = extractTitle(rawItem) ?? link
    const description = extractDescription(rawItem)
    const content = extractContent(rawItem)
    const author = extractAuthor(rawItem)
    const pubDateRaw = extractPubDate(rawItem)
    const pubDate = parseDate(pubDateRaw)

    const contentHash =
      !guid && generateContentHash
        ? safeGenerateHash(generateContentHash, {
            title,
            description,
            pubDate: pubDateRaw,
          })
        : null

    normalized.push({
      guid,
      link,
      title,
      description,
      content,
      author,
      pubDate,
      contentHash,
    })
  }

  return normalized
}

function extractRawItems(format: FeedFormat, feed: unknown): unknown[] {
  const candidate = feed as Record<string, unknown>

  if (!candidate || typeof candidate !== 'object') {
    return []
  }

  if (Array.isArray(candidate.items)) {
    return candidate.items
  }

  if (Array.isArray(candidate.entries)) {
    return candidate.entries
  }

  if (format === 'atom' && Array.isArray((candidate as Record<string, unknown>).entry)) {
    return (candidate as Record<string, unknown>).entry as unknown[]
  }

  return []
}

function extractGuid(item: unknown): string | null {
  const guidCandidate = readString(item, 'guid')
  if (guidCandidate) {
    return guidCandidate
  }

  return getString((item as Record<string, unknown>).id)
}

function extractLink(format: FeedFormat, item: unknown): string | null {
  const record = (item ?? {}) as Record<string, unknown>

  const link = getString(record.link)
  if (link) {
    return link
  }

  if (format === 'atom' && Array.isArray(record.links)) {
    const links = record.links as Array<Record<string, unknown>>
    const alternate = links.find((entry) => getString(entry.rel) === 'alternate')
    const hrefFromAlternate = alternate ? getString(alternate.href) : null
    if (hrefFromAlternate) {
      return hrefFromAlternate
    }

    for (const entry of links) {
      const href = getString(entry.href)
      if (href) {
        return href
      }
    }
  }

  if (format === 'json') {
    const url = getString(record.url)
    if (url) {
      return url
    }

    const external = getString(record.external_url)
    if (external) {
      return external
    }
  }

  return null
}

function extractTitle(item: unknown): string | null {
  return getString((item as Record<string, unknown>).title)
}

function extractDescription(item: unknown): string | null {
  const record = (item ?? {}) as Record<string, unknown>

  return (
    getString(record.description) ??
    getString(record.summary) ??
    getString(record.content_text) ??
    getString(record.subtitle)
  )
}

function extractContent(item: unknown): string | null {
  const record = (item ?? {}) as Record<string, unknown>

  const contentField = record.content
  if (typeof contentField === 'string') {
    return contentField
  }

  if (contentField && typeof contentField === 'object') {
    const contentRecord = contentField as Record<string, unknown>
    return getString(contentRecord.encoded) ?? getString(contentRecord.value) ?? getString(contentRecord.content)
  }

  return getString(record.content_html) ?? getString(record.contentText) ?? null
}

function extractAuthor(item: unknown): string | null {
  const record = (item ?? {}) as Record<string, unknown>

  const directAuthor = getString(record.author)
  if (directAuthor) {
    return directAuthor
  }

  const authorObject = record.author
  if (authorObject && typeof authorObject === 'object') {
    const authorRecord = authorObject as Record<string, unknown>
    const name = getString(authorRecord.name)
    if (name) {
      return name
    }
  }

  if (Array.isArray(record.authors)) {
    for (const author of record.authors as Array<Record<string, unknown>>) {
      const name = getString(author?.name)
      if (name) {
        return name
      }
    }
  }

  const dc = record.dc
  if (dc && typeof dc === 'object') {
    const creator = getString((dc as Record<string, unknown>).creator)
    if (creator) {
      return creator
    }
  }

  return null
}

function extractPubDate(item: unknown): string | null {
  const record = (item ?? {}) as Record<string, unknown>

  return (
    getString(record.pubDate) ??
    getString(record.published) ??
    getString(record.updated) ??
    getString(record.date_published) ??
    getString(record.created) ??
    readString(record.dc, 'date') ??
    readString(record.dcterms, 'created')
  )
}

function resolveLink(link: string | null, feedUrl: string, guid: string | null): string | null {
  if (link) {
    const trimmed = link.trim()
    if (trimmed) {
      try {
        return new URL(trimmed, feedUrl).toString()
      } catch {
        return trimmed
      }
    }
  }

  if (guid) {
    return `${feedUrl.replace(/#.*$/, '')}#guid=${encodeURIComponent(guid)}`
  }

  return null
}

function parseDate(value: string | null): Date | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if (value && typeof value === 'object') {
    if ('value' in (value as Record<string, unknown>)) {
      return getString((value as Record<string, unknown>).value)
    }
  }

  return null
}

function readString(source: unknown, key: string): string | null {
  if (!source || typeof source !== 'object') {
    return null
  }

  return getString((source as Record<string, unknown>)[key])
}

function safeGenerateHash(fn: (input: ContentHashInput) => string, input: ContentHashInput): string | null {
  try {
    const hash = fn(input)
    return hash && typeof hash === 'string' && hash.length > 0 ? hash : null
  } catch (error) {
    console.warn('generateContentHash failed', error)
    return null
  }
}

function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0
}
