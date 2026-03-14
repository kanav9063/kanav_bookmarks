export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { BookmarkIcon, Tag, Image, Layers, Upload, Sparkles, Search, ArrowRight, TrendingUp, Bookmark, Calendar } from 'lucide-react'
import prisma from '@/lib/db'
import BookmarkCard from '@/components/bookmark-card'
import ContinueReadingSection from '@/components/continue-reading-section'
import type { BookmarkWithMedia } from '@/lib/types'

const RECENT_QUERY = {
  take: 6,
  orderBy: [{ tweetCreatedAt: 'desc' as const }, { importedAt: 'desc' as const }],
  include: {
    mediaItems: { select: { id: true, type: true, url: true, thumbnailUrl: true } },
    categories: {
      include: {
        category: { select: { id: true, name: true, slug: true, color: true } },
      },
    },
  },
}

const TOP_CATS_QUERY = {
  include: { _count: { select: { bookmarks: true } } },
  orderBy: { bookmarks: { _count: 'desc' as const } },
  take: 10,
} as const

function todayStartPST(): Date {
  const now = new Date()
  const pstNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const year = pstNow.getFullYear()
  const month = String(pstNow.getMonth() + 1).padStart(2, '0')
  const day = String(pstNow.getDate()).padStart(2, '0')
  return new Date(`${year}-${month}-${day}T00:00:00-08:00`)
}

async function queryDashboard() {
  const todayStart = todayStartPST()
  return Promise.all([
    prisma.bookmark.count(),
    prisma.category.count(),
    prisma.mediaItem.count(),
    prisma.bookmark.count({ where: { categories: { none: {} } } }),
    prisma.bookmark.findMany(RECENT_QUERY),
    prisma.category.findMany(TOP_CATS_QUERY),
    prisma.bookmark.findMany({
      where: { tweetCreatedAt: { gte: todayStart } },
      orderBy: [{ tweetCreatedAt: 'desc' as const }, { importedAt: 'desc' as const }],
      include: {
        mediaItems: { select: { id: true, type: true, url: true, thumbnailUrl: true } },
        categories: {
          include: {
            category: { select: { id: true, name: true, slug: true, color: true } },
          },
        },
      },
    }),
  ])
}

type QueryResult = Awaited<ReturnType<typeof queryDashboard>>

function buildDashboardData(result: QueryResult) {
  const [totalBookmarks, totalCategories, totalMedia, uncategorizedCount, recentRaw, catsRaw, todayRaw] = result

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
    todayBookmarks: (todayRaw ?? []).map((b) => ({
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
  todayBookmarks: [] as BookmarkWithMedia[],
}

async function getDashboardData() {
  try {
    const result = await queryDashboard()
    return buildDashboardData(result)
  } catch {
    return EMPTY_DASHBOARD
  }
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning, Kanav'
  if (hour < 17) return 'Good afternoon, Kanav'
  return 'Good evening, Kanav'
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

interface StatCardProps {
  label: string
  value: number
  icon: React.ComponentType<{ size?: number; className?: string }>
  iconColor: string
  iconBg: string
  borderColor: string
  barColor: string
  trend?: string
  href?: string
}

const SPARKLINE_HEIGHTS = [40, 60, 45, 80, 100]

function StatCard({ label, value, icon: Icon, iconColor, iconBg, borderColor, barColor, trend, href }: StatCardProps) {
  const inner = (
    <>
      {/* Subtle gradient overlay from border-top color into card */}
      <div className="absolute inset-0 bg-gradient-to-b from-current/5 to-transparent opacity-20 pointer-events-none" style={{ color: 'inherit' }} />
      <div className="flex items-start justify-between mb-3 relative">
        <div className={`p-2.5 rounded-xl ${iconBg}`}>
          <Icon size={18} className={iconColor} />
        </div>
        {trend && (
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <TrendingUp size={11} />
            {trend}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-zinc-100 mb-1 tracking-tight relative">{value.toLocaleString()}</p>
      <p className="text-sm text-zinc-500 relative">{label}</p>
      {/* Sparkline bar chart */}
      <div className="flex items-end gap-0.5 mt-3 h-6 relative">
        {SPARKLINE_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm opacity-40 ${barColor}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </>
  )
  const cls = `bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all duration-200 relative overflow-hidden border-t-2 ${borderColor} ${href ? 'cursor-pointer hover:bg-zinc-800/60' : ''}`
  if (href) {
    return <Link href={href} className={cls}>{inner}</Link>
  }
  return <div className={cls}>{inner}</div>
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  if (data.totalBookmarks === 0) {
    return <EmptyState />
  }

  const categorizedCount = data.totalBookmarks - data.uncategorizedCount

  return (
    <div className="p-4 sm:p-6 md:p-8 pt-14 lg:pt-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">

      {/* Hero Section */}
      <div>
        <p className="text-sm text-zinc-500 mb-1 uppercase tracking-widest font-medium">{formatDate()}</p>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-zinc-100 to-zinc-300 bg-clip-text text-transparent">
              {getGreeting()} <span className="text-blue-400">&#128075;</span>
            </h1>
            <p className="text-zinc-400 mt-1.5">
              Your brain has{' '}
              <span className="text-zinc-100 font-semibold">{data.totalBookmarks.toLocaleString()}</span>{' '}
              bookmarks indexed. What are you looking for?
            </p>
          </div>
          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/import"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20"
            >
              <Upload size={15} />
              Import More
            </Link>
            <Link
              href="/categorize"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors border border-zinc-700"
            >
              <Sparkles size={15} />
              AI Categorize
            </Link>
            <Link
              href="/ai-search"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <Search size={15} />
              AI Search
            </Link>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Bookmarks"
          value={data.totalBookmarks}
          icon={BookmarkIcon}
          iconColor="text-indigo-400"
          iconBg="bg-indigo-500/10"
          borderColor="border-t-indigo-500"
          barColor="bg-indigo-400"
        />
        <StatCard
          label="Categorized"
          value={categorizedCount}
          icon={Tag}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
          borderColor="border-t-emerald-500"
          barColor="bg-emerald-400"
        />
        <StatCard
          label="Media Items"
          value={data.totalMedia}
          icon={Image}
          iconColor="text-violet-400"
          iconBg="bg-violet-500/10"
          borderColor="border-t-violet-500"
          barColor="bg-violet-400"
        />
        <StatCard
          label="Uncategorized"
          value={data.uncategorizedCount}
          icon={Layers}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
          borderColor="border-t-amber-500"
          barColor="bg-amber-400"
          href="/bookmarks?uncategorized=true"
        />
      </div>

      {/* Continue Reading — client component fetches its own data */}
      <ContinueReadingSection />

      {/* Today */}
      {data.todayBookmarks.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium mb-0.5">Today</p>
              <h2 className="text-xl font-semibold text-zinc-100">
                <span className="text-blue-400">{data.todayBookmarks.length}</span> new today
              </h2>
            </div>
            <Link
              href="/bookmarks?date=today"
              className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              <Calendar size={14} />
              View by date
              <ArrowRight size={14} />
            </Link>
          </div>
          {/* Timeline-style feed with left border */}
          <div className="relative pl-4 border-l-2 border-blue-500/20">
            <div className="masonry-grid">
              {data.todayBookmarks.slice(0, 6).map((bookmark) => (
                <div key={bookmark.id} className="masonry-item">
                  <BookmarkCard bookmark={bookmark} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recently Added */}
      {data.recentBookmarks.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium mb-0.5">Latest</p>
              <h2 className="text-xl font-semibold text-zinc-100">Recently Added</h2>
            </div>
            <Link
              href="/bookmarks"
              className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              View all
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="masonry-grid">
            {data.recentBookmarks.map((bookmark) => (
              <div key={bookmark.id} className="masonry-item">
                <BookmarkCard bookmark={bookmark} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top Categories */}
      {data.topCategories.length > 0 && (
        <section className="pb-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium mb-0.5">Browse by topic</p>
              <h2 className="text-xl font-semibold text-zinc-100">Top Categories</h2>
            </div>
            <Link
              href="/categories"
              className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              Manage
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="flex gap-2 flex-wrap">
            {data.topCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/80 transition-all duration-200 text-sm group"
              >
                <Bookmark
                  size={13}
                  className="shrink-0 transition-colors"
                  style={{ color: cat.color, fill: cat.color }}
                />
                <span className="text-zinc-300 group-hover:text-zinc-100 transition-colors font-medium">{cat.name}</span>
                <span className="text-zinc-500 text-xs tabular-nums">
                  {cat.count}
                </span>
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
    <div className="p-4 sm:p-6 md:p-8 pt-14 lg:pt-8 min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md mx-auto">
        <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-500/10 mx-auto mb-6">
          <BookmarkIcon size={36} className="text-indigo-400 opacity-80" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-3">No bookmarks yet</h2>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          Import your Twitter bookmarks to get started. Once imported, use AI to automatically
          categorize and organize them.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/import"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors"
          >
            <Upload size={16} />
            Import bookmarks
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-sm transition-colors border border-zinc-700"
          >
            Configure settings
          </Link>
        </div>
      </div>
    </div>
  )
}
