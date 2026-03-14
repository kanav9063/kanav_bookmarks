'use client'

import { useState, useEffect, useMemo } from 'react'
import { Lightbulb, MessageSquare, Pencil, BookOpen, FileText, Trash2, Search, Play } from 'lucide-react'
import Link from 'next/link'

interface Insight {
  id: string
  content: string
  source: string
  createdAt: string
  bookmark?: { id: string; text: string; authorHandle: string } | null
  readingItem?: { id: string; title: string; author: string | null; type: string } | null
}

type Filter = 'all' | 'ai' | 'discussion' | 'manual'

const FILTER_OPTIONS: { key: Filter; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '💡' },
  { key: 'ai', label: 'AI Generated', emoji: '🤖' },
  { key: 'discussion', label: 'From Discussions', emoji: '💬' },
  { key: 'manual', label: 'My Notes', emoji: '✍️' },
]

const SOURCE_STYLE: Record<string, { emoji: string; pill: string }> = {
  ai: { emoji: '🤖', pill: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  discussion: { emoji: '💬', pill: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  manual: { emoji: '✍️', pill: 'text-zinc-400 bg-zinc-800/50 border-zinc-700/30' },
}

function getSourceStyle(source: string) {
  return SOURCE_STYLE[source] || SOURCE_STYLE.manual
}

interface ItemGroup {
  key: string
  title: string
  author: string | null
  type: string
  href: string
  isVideo: boolean
  insights: Insight[]
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  async function fetchInsights() {
    const res = await fetch('/api/insights?recent=200')
    const data = await res.json()
    setInsights(data.insights || [])
    setLoading(false)
  }

  useEffect(() => { fetchInsights() }, [])

  async function deleteInsight(id: string) {
    if (!confirm('Delete this insight?')) return
    await fetch(`/api/insights/${id}`, { method: 'DELETE' })
    fetchInsights()
  }

  // Filter + search
  const filtered = useMemo(() => {
    return insights.filter(i => {
      if (filter !== 'all' && i.source !== filter) return false
      if (query.trim()) {
        const q = query.toLowerCase()
        if (!i.content.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [insights, filter, query])

  // Group by source item
  const groups = useMemo(() => {
    const map = new Map<string, ItemGroup>()

    for (const insight of filtered) {
      let key: string
      let group: ItemGroup

      if (insight.readingItem) {
        key = `reading-${insight.readingItem.id}`
        if (!map.has(key)) {
          map.set(key, {
            key,
            title: insight.readingItem.title,
            author: insight.readingItem.author,
            type: insight.readingItem.type,
            href: `/reading/${insight.readingItem.id}`,
            isVideo: insight.readingItem.type === 'video',
            insights: [],
          })
        }
      } else if (insight.bookmark) {
        key = `bookmark-${insight.bookmark.id}`
        if (!map.has(key)) {
          map.set(key, {
            key,
            title: insight.bookmark.text.slice(0, 80) + (insight.bookmark.text.length > 80 ? '…' : ''),
            author: `@${insight.bookmark.authorHandle}`,
            type: 'tweet',
            href: `/bookmarks`,
            isVideo: false,
            insights: [],
          })
        }
      } else {
        key = 'uncategorized'
        if (!map.has(key)) {
          map.set(key, {
            key: 'uncategorized',
            title: 'Uncategorized',
            author: null,
            type: 'other',
            href: '/insights',
            isVideo: false,
            insights: [],
          })
        }
      }

      map.get(key)!.insights.push(insight)
    }

    return Array.from(map.values())
  }, [filtered])

  // Stats
  const aiCount = insights.filter(i => i.source === 'ai').length
  const discussionCount = insights.filter(i => i.source === 'discussion').length
  const manualCount = insights.filter(i => i.source === 'manual').length
  const itemCount = useMemo(() => {
    const keys = new Set<string>()
    for (const i of insights) {
      if (i.readingItem) keys.add(`r-${i.readingItem.id}`)
      else if (i.bookmark) keys.add(`b-${i.bookmark.id}`)
    }
    return keys.size
  }, [insights])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-14 lg:pt-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl">
              <Lightbulb size={20} className="text-amber-400" />
            </div>
            Insights
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Your personal knowledge base — distilled takeaways from everything you&apos;ve read</p>
        </div>

        {/* Stats bar */}
        {!loading && insights.length > 0 && (
          <div className="flex items-center gap-4 flex-wrap mb-6 px-4 py-3 bg-zinc-900/40 border border-zinc-800/30 rounded-xl text-[12px] text-zinc-500">
            <span className="font-medium text-zinc-300">{insights.length} insights</span>
            <span className="text-zinc-700">·</span>
            <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
            {aiCount > 0 && <><span className="text-zinc-700">·</span><span>🤖 {aiCount} AI</span></>}
            {discussionCount > 0 && <><span className="text-zinc-700">·</span><span>💬 {discussionCount} discussion</span></>}
            {manualCount > 0 && <><span className="text-zinc-700">·</span><span>✍️ {manualCount} notes</span></>}
          </div>
        )}

        {/* Search + filter row */}
        {!loading && insights.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search insights…"
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-900/50 border border-zinc-800/40 rounded-xl text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600/60 transition-colors"
              />
            </div>

            {/* Filter pills */}
            <div className="flex gap-1.5 flex-wrap">
              {FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setFilter(opt.key)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[12px] border transition-all ${
                    filter === opt.key
                      ? 'bg-zinc-700/60 border-zinc-600/50 text-zinc-100'
                      : 'bg-zinc-900/40 border-zinc-800/30 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700/40'
                  }`}
                >
                  <span>{opt.emoji}</span>
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5 animate-pulse">
                <div className="h-3.5 bg-zinc-800 rounded w-1/2 mb-4" />
                <div className="space-y-2">
                  <div className="h-3 bg-zinc-800/70 rounded w-3/4" />
                  <div className="h-3 bg-zinc-800/50 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center">
                  <Lightbulb size={36} className="text-amber-500/40" />
                </div>
              </div>
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-zinc-800/80 border border-zinc-700/30 rounded-xl flex items-center justify-center">
                <MessageSquare size={16} className="text-blue-400/40" />
              </div>
              <div className="absolute -bottom-1 -left-2 w-9 h-9 bg-zinc-800/80 border border-zinc-700/30 rounded-xl flex items-center justify-center">
                <Pencil size={14} className="text-violet-400/40" />
              </div>
            </div>
            <p className="text-zinc-400 font-medium mb-2">No insights yet</p>
            <p className="text-zinc-600 text-xs max-w-sm mx-auto leading-relaxed">
              When you discuss articles or bookmarks, insights get captured here.
              You can also manually add them from any item.
            </p>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 text-[13px]">
            No insights match your search
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(group => (
              <div key={group.key} className="bg-zinc-900/40 border border-zinc-800/30 rounded-2xl overflow-hidden">
                {/* Item header */}
                <div className="flex items-start gap-3 p-4 border-b border-zinc-800/30">
                  {/* Type icon */}
                  <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-zinc-800/60 border border-zinc-700/30 flex items-center justify-center">
                    {group.isVideo
                      ? <Play size={14} className="text-red-400 fill-red-400" />
                      : group.type === 'tweet'
                      ? <FileText size={14} className="text-zinc-400" />
                      : <BookOpen size={14} className="text-zinc-400" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <Link
                      href={group.href}
                      className="text-[14px] font-medium text-zinc-100 hover:text-white line-clamp-2 transition-colors leading-snug"
                    >
                      {group.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {group.author && (
                        <span className="text-[11px] text-zinc-500">{group.author}</span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                        group.type === 'video'
                          ? 'text-red-400 bg-red-500/10 border-red-500/20'
                          : group.type === 'tweet'
                          ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                          : 'text-zinc-400 bg-zinc-800/50 border-zinc-700/30'
                      }`}>
                        {group.type}
                      </span>
                    </div>
                  </div>

                  <span className="shrink-0 text-[11px] text-zinc-600 tabular-nums mt-0.5">
                    {group.insights.length} insight{group.insights.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Insights list */}
                <div className="divide-y divide-zinc-800/20">
                  {group.insights.map(insight => {
                    const style = getSourceStyle(insight.source)
                    return (
                      <div key={insight.id} className="group flex gap-3 items-start px-4 py-3 hover:bg-zinc-800/20 transition-colors">
                        <span className="shrink-0 mt-0.5 text-[13px]">{style.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-zinc-200 leading-relaxed">{insight.content}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border hidden sm:inline ${style.pill}`}>
                            {insight.source}
                          </span>
                          <button
                            onClick={() => deleteInsight(insight.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-700 hover:text-red-400 transition-all"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
