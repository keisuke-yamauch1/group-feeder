import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isValidFeedUrl } from '@/lib/security/url-validator'

const USER_AGENT = 'GroupFeeder/1.0'

type FeedRequestBody = {
  url: string
  groupIds?: number[]
}

function parseBody(raw: unknown): FeedRequestBody | null {
  if (typeof raw !== 'object' || raw === null) {
    return null
  }

  const { url, groupIds } = raw as Record<string, unknown>

  if (typeof url !== 'string') {
    return null
  }

  const trimmedUrl = url.trim()

  const parsedGroupIds =
    groupIds === undefined
      ? undefined
      : Array.isArray(groupIds)
        ? Array.from(
            new Set(
              groupIds
                .map((id) => Number(id))
                .filter((id) => Number.isInteger(id) && id > 0),
            ),
          )
        : null

  if (parsedGroupIds === null) {
    return null
  }

  return { url: trimmedUrl, groupIds: parsedGroupIds }
}

async function ensureGroupsBelongToUser(groupIds: number[], userId: string): Promise<boolean> {
  if (groupIds.length === 0) {
    return true
  }

  const ownedGroups = await prisma.group.findMany({
    where: {
      id: { in: groupIds },
      userId,
    },
    select: { id: true },
  })

  return ownedGroups.length === groupIds.length
}

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const body = parseBody(json)

  if (!body) {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 })
  }

  if (!isValidFeedUrl(body.url)) {
    return NextResponse.json({ error: 'Invalid feed url' }, { status: 400 })
  }

  const groupIds = body.groupIds ?? []

  const groupsOwned = await ensureGroupsBelongToUser(groupIds, session.user.id)
  if (!groupsOwned) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  let response: Response
  try {
    response = await fetch(body.url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/xml, text/xml, application/rss+xml, application/atom+xml, application/json',
      },
    })
  } catch (error) {
    console.error('Failed to fetch feed', error)
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 400 })
  }

  if (!response.ok) {
    return NextResponse.json({ error: 'Feed responded with an error' }, { status: 400 })
  }

  const feedContent = await response.text()

  let parsedFeed: any
  try {
    // @ts-ignore -- feedsmith types will be provided when dependency is installed
    const mod = await import('feedsmith')
    const feedsmith = (mod && (mod.feedsmith || mod.default)) as ((input: string) => unknown) | undefined

    if (!feedsmith) {
      throw new Error('feedsmith parser not available')
    }

    parsedFeed = feedsmith(feedContent)
  } catch (error) {
    console.error('Failed to parse feed using feedsmith', error)
    return NextResponse.json({ error: 'Failed to parse feed' }, { status: 422 })
  }

  const titleFromFeed =
    (parsedFeed?.title || parsedFeed?.info?.title || parsedFeed?.channel?.title || '').toString().trim()
  const descriptionFromFeed =
    (parsedFeed?.description || parsedFeed?.info?.description || parsedFeed?.channel?.description || null) ?? null

  const urlHostFallback = (() => {
    try {
      return new URL(body.url).hostname
    } catch {
      return body.url
    }
  })()

  const feedTitle = titleFromFeed || urlHostFallback
  const feedDescription = descriptionFromFeed

  const existingFeed = await prisma.feed.findUnique({
    where: { url: body.url },
  })

  const isNewFeed = !existingFeed

  const feedRecord = await prisma.feed.upsert({
    where: { url: body.url },
    update: {
      title: feedTitle,
      description: feedDescription,
    },
    create: {
      url: body.url,
      title: feedTitle,
      description: feedDescription,
    },
  })

  if (groupIds.length > 0) {
    await prisma.groupFeed.createMany({
      data: groupIds.map((groupId) => ({
        groupId,
        feedId: feedRecord.id,
      })),
      skipDuplicates: true,
    })
  }

  return NextResponse.json(
    {
      feed: feedRecord,
      groupIds,
    },
    { status: isNewFeed ? 201 : 200 },
  )
}
