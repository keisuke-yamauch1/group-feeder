import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name =
    typeof body === 'object' && body !== null && 'name' in body && typeof (body as { name: unknown }).name === 'string'
      ? (body as { name: string }).name.trim()
      : ''

  if (!name) {
    return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
  }

  try {
    const maxSortIndex = await prisma.group.findFirst({
      where: { userId: session.user.id },
      orderBy: { sortIndex: 'desc' },
      select: { sortIndex: true },
    })

    const nextSortIndex = maxSortIndex?.sortIndex != null ? maxSortIndex.sortIndex + 1 : 0

    const group = await prisma.group.create({
      data: {
        userId: session.user.id,
        name,
        sortIndex: nextSortIndex,
      },
    })

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    console.error('Failed to create group', error)
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
  }
}
