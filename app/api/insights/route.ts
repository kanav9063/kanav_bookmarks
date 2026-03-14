import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET: fetch insights for a bookmark or reading item
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const bookmarkId = searchParams.get('bookmarkId')
  const readingItemId = searchParams.get('readingItemId')
  const recent = searchParams.get('recent') // get N most recent across all items

  if (recent) {
    const insights = await prisma.insight.findMany({
      take: parseInt(recent),
      orderBy: { createdAt: 'desc' },
      include: {
        bookmark: { select: { id: true, text: true, authorHandle: true } },
        readingItem: { select: { id: true, title: true, author: true, type: true } },
      },
    })
    return NextResponse.json({ insights })
  }

  const where: Record<string, unknown> = {}
  if (bookmarkId) where.bookmarkId = bookmarkId
  if (readingItemId) where.readingItemId = readingItemId

  const insights = await prisma.insight.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ insights })
}

// POST: add a new insight
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { content, source, bookmarkId, readingItemId } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }
    if (!bookmarkId && !readingItemId) {
      return NextResponse.json({ error: 'Must link to a bookmark or reading item' }, { status: 400 })
    }

    const insight = await prisma.insight.create({
      data: {
        content: content.trim(),
        source: source || 'discussion',
        bookmarkId: bookmarkId || null,
        readingItemId: readingItemId || null,
      },
    })

    return NextResponse.json(insight, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
