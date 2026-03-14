'use client'

import { useState, useEffect } from 'react'
import {
  Sparkles, Check, CheckCheck, ExternalLink, FileText,
  Book, Newspaper, Headphones, GraduationCap, Eye, Bookmark
} from 'lucide-react'
import Image from 'next/image'

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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-14 lg:pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <Sparkles size={24} className="text-blue-400" />
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
              className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-900/50 border border-zinc-800/50 rounded-lg hover:border-zinc-700/50 transition-all disabled:opacity-40"
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
            <div className="w-16 h-16 mx-auto mb-4 bg-zinc-900 rounded-2xl flex items-center justify-center">
              <Check size={28} className="text-emerald-400" />
            </div>
            <p className="text-zinc-300 font-medium">You&apos;re all caught up!</p>
            <p className="text-zinc-600 text-sm mt-1">New bookmarks and reading items will show up here</p>
          </div>
        ) : (
          <div className={`space-y-2 transition-opacity duration-300 ${markingAll ? 'opacity-30' : ''}`}>
            {feed.map(item => {
              const url = getItemUrl(item)
              const isMarking = marking.has(item.id)

              return (
                <div
                  key={item.id}
                  className={`group bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-3.5 hover:border-zinc-700/50 transition-all duration-300 ${
                    isMarking ? 'opacity-30 scale-[0.98] translate-x-4' : ''
                  }`}
                >
                  <div className="flex gap-3 items-start">
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
                          <div className="flex items-center gap-2 mt-1">
                            {item.author && (
                              <span className="text-[11px] text-zinc-500">
                                {item.handle ? `@${item.handle}` : item.author}
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-700">{timeAgo(item.date)}</span>
                          </div>
                        </div>

                        {/* Mark as seen button */}
                        <button
                          onClick={() => markSeen(item)}
                          className="shrink-0 p-1.5 text-zinc-700 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                          title="Mark as seen"
                        >
                          <Eye size={14} />
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
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
