'use client'

import { useState, useEffect } from 'react'
import {
  Sparkles, Check, CheckCheck, ExternalLink, FileText,
  Book, Newspaper, Headphones, GraduationCap, Eye, Bookmark
} from 'lucide-react'

interface FeedItem {
  id: string
  type: 'bookmark' | 'reading'
  title: string
  author: string | null
  handle: string | null
  thumbnail: string | null
  categories: { name: string; color: string }[]
  date: string
  tweetId?: string
  readingType?: string
  url?: string | null
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function TypeIcon({ type }: { type?: string }) {
  switch (type) {
    case 'book': return <Book size={12} />
    case 'paper': return <GraduationCap size={12} />
    case 'newsletter': return <Newspaper size={12} />
    case 'podcast': return <Headphones size={12} />
    default: return <FileText size={12} />
  }
}

// Type badge colors for reading types
const READING_TYPE_COLORS: Record<string, string> = {
  article: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  book: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  paper: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  newsletter: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  podcast: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
}

function TypeBadge({ itemType, readingType }: { itemType: 'bookmark' | 'reading'; readingType?: string }) {
  if (itemType === 'bookmark') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20">
        <Bookmark size={9} />
        Bookmark
      </span>
    )
  }
  const colorClass = READING_TYPE_COLORS[readingType || 'article'] || READING_TYPE_COLORS.article
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border ${colorClass}`}>
      <TypeIcon type={readingType} />
      {readingType ? readingType.charAt(0).toUpperCase() + readingType.slice(1) : 'Article'}
    </span>
  )
}

// Group feed items by date label
function getDateLabel(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)
  const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  if (itemDay.getTime() === today.getTime()) return 'Today'
  if (itemDay.getTime() === yesterday.getTime()) return 'Yesterday'
  if (itemDay > weekAgo) return 'This Week'
  return 'Older'
}

const DATE_GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'Older']

export default function WhatsNewPage() {
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState<Set<string>>(new Set())
  const [markingAll, setMarkingAll] = useState(false)

  async function fetchFeed() {
    const res = await fetch('/api/unseen/feed')
    const data = await res.json()
    setFeed(data.feed || [])
    setLoading(false)
  }

  useEffect(() => { fetchFeed() }, [])

  async function markSeen(item: FeedItem) {
    setMarking(prev => new Set(prev).add(item.id))
    await fetch('/api/unseen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: item.type === 'bookmark' ? 'bookmark' : 'reading',
        ids: [item.id],
      }),
    })
    // Animate out then remove
    setTimeout(() => {
      setFeed(prev => prev.filter(f => f.id !== item.id))
      setMarking(prev => { const s = new Set(prev); s.delete(item.id); return s })
    }, 300)
  }

  async function markAllSeen() {
    setMarkingAll(true)
    await fetch('/api/unseen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setTimeout(() => {
      setFeed([])
      setMarkingAll(false)
    }, 300)
  }

  function getItemUrl(item: FeedItem): string | null {
    if (item.type === 'bookmark' && item.tweetId) {
      return `https://x.com/${item.handle}/status/${item.tweetId}`
    }
    if (item.type === 'reading' && item.url) {
      return item.url
    }
    return null
  }

  // Group feed by date label
  const grouped = feed.reduce<Record<string, FeedItem[]>>((acc, item) => {
    const label = getDateLabel(item.date)
    if (!acc[label]) acc[label] = []
    acc[label].push(item)
    return acc
  }, {})

  const groupKeys = DATE_GROUP_ORDER.filter(k => grouped[k] && grouped[k].length > 0)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-14 lg:pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl">
                <Sparkles size={20} className="text-blue-400" />
              </div>
              What&apos;s New
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {feed.length > 0 ? `${feed.length} unseen item${feed.length > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          {feed.length > 0 && (
            <button
              onClick={markAllSeen}
              disabled={markingAll}
              className="flex items-center gap-2 px-3.5 py-2 text-[12px] font-medium text-zinc-400 hover:text-emerald-400 bg-zinc-900/50 border border-zinc-800/30 rounded-xl hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all disabled:opacity-40"
            >
              <CheckCheck size={14} />
              Mark all seen
            </button>
          )}
        </div>

        {/* Feed */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-zinc-800 rounded-lg shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 bg-zinc-800 rounded w-3/4 mb-2" />
                    <div className="h-2 bg-zinc-800/50 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : feed.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <Check size={32} className="text-emerald-400" />
            </div>
            <p className="text-zinc-300 font-medium">You&apos;re all caught up!</p>
            <p className="text-zinc-600 text-sm mt-1">New bookmarks and reading items will show up here</p>
          </div>
        ) : (
          <div className={`space-y-6 transition-opacity duration-300 ${markingAll ? 'opacity-30' : ''}`}>
            {groupKeys.map(groupLabel => (
              <div key={groupLabel}>
                {/* Sticky section header */}
                <div className="sticky top-0 z-10 flex items-center gap-3 py-2 mb-2 bg-zinc-950/95 backdrop-blur-sm">
                  <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-semibold">{groupLabel}</span>
                  <span className="text-[10px] text-zinc-700 bg-zinc-800/50 border border-zinc-700/30 rounded-full px-2 py-0.5">
                    {grouped[groupLabel].length}
                  </span>
                </div>

                <div className="space-y-2">
                  {grouped[groupLabel].map(item => {
                    const url = getItemUrl(item)
                    const isMarking = marking.has(item.id)

                    return (
                      <div
                        key={item.id}
                        className={`group flex gap-3 items-start bg-zinc-900/50 border border-zinc-800/30 border-l-2 border-l-blue-500/40 rounded-xl p-3.5 hover:border-zinc-700/40 hover:bg-zinc-900/70 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 ${
                          isMarking ? 'opacity-30 scale-[0.98] translate-x-4' : ''
                        }`}
                      >
                        {/* Blue dot indicator */}
                        <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0 mt-2 animate-pulse" />

                        {/* Thumbnail or type icon */}
                        {item.thumbnail ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                            <img
                              src={item.thumbnail}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                            item.type === 'bookmark'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {item.type === 'bookmark' ? <Bookmark size={18} /> : <TypeIcon type={item.readingType} />}
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[13px] font-medium text-zinc-100 hover:text-blue-400 transition-colors line-clamp-2 leading-snug"
                                  onClick={() => markSeen(item)}
                                >
                                  {item.title}
                                </a>
                              ) : (
                                <p className="text-[13px] font-medium text-zinc-100 line-clamp-2 leading-snug">{item.title}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {item.author && (
                                  <span className="text-[11px] text-zinc-500">
                                    {item.handle ? `@${item.handle}` : item.author}
                                  </span>
                                )}
                                {/* Type badge */}
                                <TypeBadge itemType={item.type} readingType={item.readingType} />
                                <span className="text-[10px] text-zinc-700">{timeAgo(item.date)}</span>
                              </div>
                            </div>

                            {/* Mark as seen button — always visible */}
                            <button
                              onClick={() => markSeen(item)}
                              className="shrink-0 flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 rounded-lg transition-all"
                              title="Mark as seen"
                            >
                              <Eye size={13} />
                              <span className="hidden sm:inline">Seen</span>
                            </button>
                          </div>

                          {/* Categories */}
                          {item.categories.length > 0 && (
                            <div className="flex gap-1.5 mt-1.5 flex-wrap">
                              {item.categories.slice(0, 3).map((cat, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 text-[10px] rounded-full border"
                                  style={{
                                    color: cat.color,
                                    borderColor: `${cat.color}30`,
                                    backgroundColor: `${cat.color}10`,
                                  }}
                                >
                                  {cat.name}
                                </span>
                              ))}
                            </div>
                          )}
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
