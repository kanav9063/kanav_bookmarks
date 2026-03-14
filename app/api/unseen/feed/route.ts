import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET: fetch all unseen items as a combined feed
export async function GET() {
  const [bookmarks, readingItems] = await Promise.all([
    prisma.bookmark.findMany({
      where: { seen: false },
      orderBy: { importedAt: 'desc' },
      take: 50,
      include: {
        mediaItems: { select: { id: true, type: true, url: true, thumbnailUrl: true }, take: 1 },
        categories: {
          include: { category: { select: { name: true, slug: true, color: true } } },
        },
      },
    }),
    prisma.readingItem.findMany({
      where: { seen: false },
      orderBy: { addedAt: 'desc' },
      take: 20,
    }),
  ])

  // Combine into a unified feed
  const feed = [
    ...bookmarks.map(b => ({
      id: b.id,
      type: 'bookmark' as const,
      title: b.text.slice(0, 120) + (b.text.length > 120 ? '…' : ''),
      author: b.authorName || b.authorHandle,
      handle: b.authorHandle,
      thumbnail: b.mediaItems[0]?.thumbnailUrl || null,
      categories: b.categories.map(c => ({ name: c.category.name, color: c.category.color })),
      date: b.tweetCreatedAt || b.importedAt,
      tweetId: b.tweetId,
    })),
    ...readingItems.map(r => ({
      id: r.id,
      type: 'reading' as const,
      title: r.title,
      author: r.author,
      handle: null,
      thumbnail: r.coverImage,
      categories: [],
      date: r.addedAt,
      readingType: r.type,
      url: r.url,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return NextResponse.json({ feed, total: feed.length })
}
