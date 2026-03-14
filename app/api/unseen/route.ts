import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET: count of unseen items
export async function GET() {
  const [unseenBookmarks, unseenReading] = await Promise.all([
    prisma.bookmark.count({ where: { seen: false } }),
    prisma.readingItem.count({ where: { seen: false } }),
  ])

  return NextResponse.json({
    bookmarks: unseenBookmarks,
    reading: unseenReading,
    total: unseenBookmarks + unseenReading,
  })
}

// POST: mark items as seen
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, ids, all } = body

  if (all) {
    // Mark everything as seen
    await Promise.all([
      prisma.bookmark.updateMany({ where: { seen: false }, data: { seen: true } }),
      prisma.readingItem.updateMany({ where: { seen: false }, data: { seen: true } }),
    ])
    return NextResponse.json({ ok: true })
  }

  if (type === 'bookmark' && Array.isArray(ids)) {
    await prisma.bookmark.updateMany({
      where: { id: { in: ids } },
      data: { seen: true },
    })
  } else if (type === 'reading' && Array.isArray(ids)) {
    await prisma.readingItem.updateMany({
      where: { id: { in: ids } },
      data: { seen: true },
    })
  }

  return NextResponse.json({ ok: true })
}
