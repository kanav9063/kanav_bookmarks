import Link from 'next/link'
import { notFound } from 'next/navigation'
import prisma from '@/lib/db'
import BookmarkCard from '@/components/bookmark-card'
import type { BookmarkWithMedia } from '@/lib/types'

function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = ['#2563eb', '#14b8a6', '#f59e0b', '#ec4899', '#22c55e', '#3b82f6', '#a855f7']
  return colors[Math.abs(hash) % colors.length]
}

function getInitial(name: string, handle: string): string {
  const cleaned = name.trim()
  if (cleaned) return cleaned[0].toUpperCase()
  return handle.trim().slice(0, 1).toUpperCase()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBookmark(b: any): BookmarkWithMedia {
  return {
    id: b.id,
    tweetId: b.tweetId,
    text: b.text,
    authorHandle: b.authorHandle,
    authorName: b.authorName,
    tweetCreatedAt: b.tweetCreatedAt?.toISOString() ?? null,
    importedAt: b.importedAt.toISOString(),
    mediaItems: b.mediaItems.map((m: any) => ({
      id: m.id,
      type: m.type,
      url: m.url,
      thumbnailUrl: m.thumbnailUrl,
    })),
    categories: b.categories.map((bc: any) => ({
      id: bc.category.id,
      name: bc.category.name,
      slug: bc.category.slug,
      color: bc.category.color,
      confidence: bc.confidence,
    })),
  }
}

export default async function AuthorPage({ params }: { params: { handle: string } }) {
  const handle = decodeURIComponent(params.handle)

  const bookmarksRaw = await prisma.bookmark.findMany({
    where: { authorHandle: handle },
    orderBy: [{ tweetCreatedAt: 'desc' }, { importedAt: 'desc' }],
    include: {
      mediaItems: true,
      categories: {
        include: { category: { select: { id: true, name: true, slug: true, color: true } } },
      },
    },
  })

  if (bookmarksRaw.length === 0) {
    notFound()
  }

  const bookmarks = bookmarksRaw.map(mapBookmark)
  const authorName = bookmarks[0].authorName

  return (
    <div className="p-4 sm:p-6 md:p-8 pt-14 lg:pt-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white"
            style={{ backgroundColor: stringToColor(handle) }}
          >
            {getInitial(authorName, handle)}
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-100">{authorName}</p>
            <p className="text-sm text-zinc-500">@{handle}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-500">Bookmarks</p>
          <p className="text-2xl font-bold text-zinc-100 tabular-nums">{bookmarks.length}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">Recent saves from this author.</p>
        <Link href="/authors" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
          All authors
        </Link>
      </div>

      <div className="masonry-grid">
        {bookmarks.map((bookmark) => (
          <div key={bookmark.id} className="masonry-item">
            <BookmarkCard bookmark={bookmark} />
          </div>
        ))}
      </div>
    </div>
  )
}
