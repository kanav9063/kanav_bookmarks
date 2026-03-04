export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { BookmarkIcon, Tag, Image, Layers } from 'lucide-react'
import prisma from '@/lib/db'
import BookmarkCard from '@/components/bookmark-card'
import type { BookmarkWithMedia } from '@/lib/types'

const RECENT_QUERY = {
  take: 6,
  orderBy: { importedAt: 'desc' as const },
  include: {
    mediaItems: { select: { id: true, type: true, url: true, thumbnailUrl: true } },
    categories: {
      include: {
        category: { select: { id: true, name: true, slug: true, color: true } },
      },
    },
  },
} as const

const TOP_CATS_QUERY = {
  include: { _count: { select: { bookmarks: true } } },
  orderBy: { bookmarks: { _count: 'desc' as const } },
  take: 8,
} as const

async function queryDashboard() {
  return Promise.all([
    prisma.bookmark.count(),
    prisma.category.count(),
    prisma.mediaItem.count(),
    prisma.bookmark.count({ where: { categories: { none: {} } } }),
    prisma.bookmark.findMany(RECENT_QUERY),
    prisma.category.findMany(TOP_CATS_QUERY),
  ])
}

type QueryResult = Awaited<ReturnType<typeof queryDashboard>>

function buildDashboardData(result: QueryResult) {
  const [totalBookmarks, totalCategories, totalMedia, uncategorizedCount, recentRaw, catsRaw] = result

  const recentBookmarks: BookmarkWithMedia[] = recentRaw.map((b) => ({
    id: b.id,
    tweetId: b.tweetId,
    text: b.text,
    authorHandle: b.authorHandle,
    authorName: b.authorName,
    tweetCreatedAt: b.tweetCreatedAt?.toISOString() ?? null,
    importedAt: b.importedAt.toISOString(),
    mediaItems: b.mediaItems,
    categories: b.categories.map((bc) => ({
      id: bc.category.id,
      name: bc.category.name,
      slug: bc.category.slug,
      color: bc.category.color,
      confidence: null,
    })),
  }))

  return {
    totalBookmarks,
    totalCategories,
    totalMedia,
    uncategorizedCount,
    recentBookmarks,
    topCategories: catsRaw.map((c) => ({
      name: c.name,
      slug: c.slug,
      color: c.color,
      count: c._count.bookmarks,
    })),
  }
}

const EMPTY_DASHBOARD = {
  totalBookmarks: 0,
  totalCategories: 0,
  totalMedia: 0,
  uncategorizedCount: 0,
  recentBookmarks: [] as BookmarkWithMedia[],
  topCategories: [] as { name: string; slug: string; color: string; count: number }[],
}

async function getDashboardData() {
  try {
    const result = await queryDashboard()
    return buildDashboardData(result)
  } catch {
    return EMPTY_DASHBOARD
  }
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string
  value: number
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: string
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-zinc-100">{value.toLocaleString()}</p>
        <p className="text-sm text-zinc-400">{label}</p>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100">
          bookmark<span className="text-indigo-400">X</span>
        </h1>
        <p className="text-zinc-400 mt-1">Your Twitter bookmarks, organized.</p>
      </div>

      {data.totalBookmarks === 0 && <EmptyState />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Bookmarks" value={data.totalBookmarks} icon={BookmarkIcon} color="bg-indigo-500/10 text-indigo-400" />
        <StatCard label="Categories" value={data.totalCategories} icon={Tag} color="bg-emerald-500/10 text-emerald-400" />
        <StatCard label="Media Items" value={data.totalMedia} icon={Image} color="bg-violet-500/10 text-violet-400" />
        <StatCard label="Uncategorized" value={data.uncategorizedCount} icon={Layers} color="bg-amber-500/10 text-amber-400" />
      </div>

      {data.recentBookmarks.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-100">Recent Bookmarks</h2>
            <Link href="/bookmarks" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.recentBookmarks.map((bookmark) => (
              <BookmarkCard key={bookmark.id} bookmark={bookmark} />
            ))}
          </div>
        </section>
      )}

      {data.topCategories.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-100">Top Categories</h2>
            <Link href="/categories" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              View all →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.topCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all text-sm"
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-zinc-100">{cat.name}</span>
                <span className="text-zinc-500 text-xs">{cat.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="mb-8 bg-zinc-900 border border-dashed border-zinc-700 rounded-2xl p-10 text-center">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 mx-auto mb-4">
        <BookmarkIcon size={28} className="text-indigo-400" />
      </div>
      <h2 className="text-xl font-semibold text-zinc-100 mb-2">No bookmarks yet</h2>
      <p className="text-zinc-400 mb-6 max-w-sm mx-auto">
        Import your Twitter bookmarks to get started with organizing and exploring them.
      </p>
      <Link
        href="/import"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors"
      >
        Import bookmarks
      </Link>
    </div>
  )
}
