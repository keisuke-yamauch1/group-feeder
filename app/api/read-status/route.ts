import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

type ReadStatusRequest = {
  articleIds: string[]
  isRead: boolean
}

function parseRequestBody(raw: unknown): ReadStatusRequest | null {
  if (typeof raw !== 'object' || raw === null) {
    return null
  }

  const { articleIds, isRead } = raw as Record<string, unknown>

  if (!Array.isArray(articleIds) || typeof isRead !== 'boolean') {
    return null
  }

  const sanitizedArticleIds = articleIds.map((id) => (typeof id === 'string' ? id.trim() : '')).filter(Boolean)

  if (sanitizedArticleIds.length === 0 || sanitizedArticleIds.length !== articleIds.length) {
    return null
  }

  return {
    articleIds: Array.from(new Set(sanitizedArticleIds)),
    isRead,
  }
}

export async function PUT(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const body = parseRequestBody(payload)

  if (!body) {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 })
  }

  const { articleIds, isRead } = body

  if (isRead) {
    const articles = await prisma.article.findMany({
      where: {
        id: { in: articleIds },
      },
      select: { id: true },
    })

    if (articles.length === 0) {
      return NextResponse.json({ error: 'Articles not found' }, { status: 404 })
    }

    const now = new Date()

    try {
      await prisma.$transaction(
        articles.map((article) =>
          prisma.readStatus.upsert({
            where: {
              userId_articleId: {
                userId: session.user.id,
                articleId: article.id,
              },
            },
            update: { readAt: now },
            create: {
              userId: session.user.id,
              articleId: article.id,
              readAt: now,
            },
          }),
        ),
      )
    } catch (error) {
      console.error('Failed to upsert read status', error)
      return NextResponse.json({ error: 'Failed to update read status' }, { status: 500 })
    }

    return NextResponse.json({ updated: articles.length })
  }

  try {
    const result = await prisma.readStatus.deleteMany({
      where: {
        userId: session.user.id,
        articleId: { in: articleIds },
      },
    })

    return NextResponse.json({ updated: result.count })
  } catch (error) {
    console.error('Failed to delete read status', error)
    return NextResponse.json({ error: 'Failed to update read status' }, { status: 500 })
  }
}
