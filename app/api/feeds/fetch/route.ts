import { Feed } from '@prisma/client'
import { NextResponse } from 'next/server'

import { generateContentHash } from '@/lib/content-hash'
import { fetchFeed, FeedFetchError, FetchFeedResult } from '@/lib/feed-fetcher'
import { prisma } from '@/lib/prisma'

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000
const MAX_CONCURRENCY = 5
const FEED_TIMEOUT_MS = 30_000

type SuccessResult = {
  status: 'success'
  feedId: number
  data: FetchFeedResult
}

type ErrorResult = {
  status: 'error'
  feedId: number
  error: {
    code: string
    message: string
  }
}

type ExecutionResult = SuccessResult | ErrorResult

class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

export async function GET() {
  const now = new Date()
  const fifteenMinutesAgo = new Date(now.getTime() - FIFTEEN_MINUTES_MS)

  const feeds = await prisma.feed.findMany({
    where: {
      OR: [{ lastFetchedAt: null }, { lastFetchedAt: { lt: fifteenMinutesAgo } }],
    },
    orderBy: { lastFetchedAt: 'asc' },
  })

  if (feeds.length === 0) {
    return NextResponse.json({
      totalFeeds: 0,
      successes: 0,
      failures: 0,
      updatedFeeds: 0,
      articlesCreated: 0,
      articlesSkipped: 0,
      results: [],
    })
  }

  const results: ExecutionResult[] = []

  for (const chunk of chunkArray(feeds, MAX_CONCURRENCY)) {
    const chunkResults = await Promise.all(chunk.map((feed) => processFeed(feed)))
    results.push(...chunkResults)
  }

  const successes = results.filter((result): result is SuccessResult => result.status === 'success')
  const failures = results.filter((result): result is ErrorResult => result.status === 'error')

  const responseBody = {
    totalFeeds: results.length,
    successes: successes.length,
    failures: failures.length,
    updatedFeeds: successes.reduce((count, current) => count + (current.data.updated ? 1 : 0), 0),
    articlesCreated: successes.reduce((sum, current) => sum + current.data.articlesCreated, 0),
    articlesSkipped: successes.reduce((sum, current) => sum + current.data.articlesSkipped, 0),
    results,
  }

  return NextResponse.json(responseBody)
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    return [items]
  }

  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

async function processFeed(feed: Feed): Promise<ExecutionResult> {
  try {
    const data = await withTimeout(
      fetchFeed(feed, {
        generateContentHash: (input) =>
          generateContentHash({
            title: input.title,
            description: input.description ?? undefined,
            pubDate: input.pubDate ?? undefined,
          }),
      }),
      FEED_TIMEOUT_MS,
    )

    return {
      status: 'success',
      feedId: feed.id,
      data,
    }
  } catch (error) {
    if (error instanceof FeedFetchError) {
      console.warn(`Feed fetch failed for feed ${feed.id}`, error)
      return {
        status: 'error',
        feedId: feed.id,
        error: {
          code: error.code,
          message: error.message,
        },
      }
    }

    if (error instanceof TimeoutError) {
      console.warn(`Feed fetch timed out for feed ${feed.id}`, error)
      return {
        status: 'error',
        feedId: feed.id,
        error: {
          code: 'TIMEOUT',
          message: error.message,
        },
      }
    }

    console.error(`Unexpected error while fetching feed ${feed.id}`, error)
    return {
      status: 'error',
      feedId: feed.id,
      error: {
        code: 'UNKNOWN',
        message: 'Unexpected error while fetching feed',
      },
    }
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(`Feed fetch exceeded ${timeoutMs}ms timeout`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}
