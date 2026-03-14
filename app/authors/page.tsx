export const dynamic = 'force-dynamic'

import Link from 'next/link'
import prisma from '@/lib/db'

function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = ['#2563eb', '#14b8a6', '#f59e0b', '#ec4899', '#22c55e', '#3b82f6', '#a855f7']
  return colors[Math.abs(hash) % colors.length]
}

export default async function AuthorsPage() {
  const authors = await prisma.bookmark.groupBy({
    by: ['authorHandle', 'authorName'],
    where: { authorHandle: { not: 'unknown' } },
    _count: { _all: true },
    orderBy: { _count: { authorHandle: 'desc' } },
  })

  return (
    <div className="p-4 sm:p-6 md:p-8 pt-14 lg:pt-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium mb-0.5">Authors</p>
        <h1 className="text-2xl font-bold text-zinc-100">{authors.length} authors bookmarked</h1>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {authors.map((a) => (
          <Link
            key={a.authorHandle}
            href={`/authors/${a.authorHandle}`}
            className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-900 transition-all group"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ backgroundColor: stringToColor(a.authorHandle) }}
            >
              {(a.authorName || a.authorHandle)[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-100 truncate group-hover:text-indigo-300 transition-colors">
                {a.authorName}
              </p>
              <p className="text-xs text-zinc-500 truncate">@{a.authorHandle}</p>
            </div>
            <span className="text-xs text-zinc-600 tabular-nums">{a._count._all}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
