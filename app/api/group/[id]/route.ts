import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

type RouteContext = {
  params: {
    id: string
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const groupId = Number(params.id)

  if (!Number.isInteger(groupId)) {
    return NextResponse.json({ error: 'Invalid group id' }, { status: 400 })
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

  const existingGroup = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, userId: true },
  })

  if (!existingGroup || existingGroup.userId !== session.user.id) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  try {
    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: { name },
    })

    return NextResponse.json(updatedGroup)
  } catch (error) {
    console.error('Failed to update group name', error)
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (params.id !== 'reorder') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

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

  const groups =
    typeof body === 'object' && body !== null && 'groups' in body ? (body as { groups: unknown }).groups : undefined

  if (!Array.isArray(groups) || groups.length === 0) {
    return NextResponse.json({ error: 'groups array is required' }, { status: 400 })
  }

  const parsedGroups = groups
    .map((item) => {
      if (
        item &&
        typeof item === 'object' &&
        'id' in item &&
        'sortIndex' in item &&
        Number.isInteger(Number((item as { id: unknown }).id)) &&
        Number.isInteger(Number((item as { sortIndex: unknown }).sortIndex))
      ) {
        return {
          id: Number((item as { id: unknown }).id),
          sortIndex: Number((item as { sortIndex: unknown }).sortIndex),
        }
      }
      return null
    })
    .filter((item): item is { id: number; sortIndex: number } => item !== null)

  if (parsedGroups.length !== groups.length) {
    return NextResponse.json({ error: 'Invalid groups payload' }, { status: 400 })
  }

  const targetIds = parsedGroups.map((group) => group.id)

  const ownedGroups = await prisma.group.findMany({
    where: {
      id: { in: targetIds },
      userId: session.user.id,
    },
    select: { id: true },
  })

  if (ownedGroups.length !== parsedGroups.length) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  try {
    await prisma.$transaction(
      parsedGroups.map((group) =>
        prisma.group.update({
          where: { id: group.id },
          data: { sortIndex: group.sortIndex },
        }),
      ),
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to reorder groups', error)
    return NextResponse.json({ error: 'Failed to update group order' }, { status: 500 })
  }
}
