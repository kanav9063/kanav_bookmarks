'use client'

import { useState, useEffect } from 'react'
import { Lightbulb, MessageSquare, Pencil, BookOpen, FileText, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface Insight {
  id: string
  content: string
  source: string
  createdAt: string
  bookmark?: { id: string; text: string; authorHandle: string } | null
  readingItem?: { id: string; title: string; author: string | null; type: string } | null
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function SourceIcon({ source }: { source: string }) {
  switch (source) {
    case 'discussion':
      return <MessageSquare size={14} className="text-blue-400" />
    case 'manual':
      return <Pencil size={14} className="text-violet-400" />
    case 'highlight':
      return <BookOpen size={14} className="text-amber-400" />
    default:
      return <Lightbulb size={14} className="text-amber-400" />
  }
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchInsights() {
    const res = await fetch('/api/insights?recent=100')
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

  // Group by date
  const grouped = insights.reduce<Record<string, Insight[]>>((acc, insight) => {
    const date = new Date(insight.createdAt).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(insight)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-14 lg:pt-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl">
              <Lightbulb size={20} className="text-amber-400" />
            </div>
            Insights
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Key takeaways from discussions and reading — your distilled knowledge
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 animate-pulse">
                <div className="h-3 bg-zinc-800 rounded w-3/4 mb-2" />
                <div className="h-3 bg-zinc-800/50 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative w-24 h-24 mx-auto mb-6">
              {/* Overlapping insight icons for empty state */}
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
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([date, dateInsights]) => (
              <div key={date}>
                {/* Prominent date section header with line separator */}
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-[12px] text-zinc-400 font-semibold tracking-wider uppercase whitespace-nowrap">
                    {date}
                  </h2>
                  <div className="flex-1 h-px bg-zinc-800/60" />
                  <span className="text-[10px] text-zinc-600 tabular-nums">{dateInsights.length}</span>
                </div>
                <div className="space-y-2">
                  {dateInsights.map(insight => (
                    <div
                      key={insight.id}
                      className="group bg-zinc-900/40 border border-zinc-800/30 border-l-2 border-l-amber-500/30 rounded-xl p-4 hover:border-zinc-700/40 hover:bg-zinc-900/60 transition-all duration-200"
                    >
                      <div className="flex gap-3 items-start">
                        {/* Proper icon component instead of emoji */}
                        <span className="mt-0.5 shrink-0">
                          <SourceIcon source={insight.source} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] text-zinc-100 leading-relaxed">{insight.content}</p>

                          {/* Source item as proper preview card */}
                          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                            {insight.readingItem && (
                              <Link
                                href="/reading"
                                className="flex items-center gap-2 bg-zinc-800/50 rounded-lg p-2.5 border border-zinc-700/30 hover:border-zinc-600/40 hover:bg-zinc-800/70 transition-colors"
                              >
                                <BookOpen size={11} className="text-zinc-500 shrink-0" />
                                <span className="text-[11px] text-zinc-400 hover:text-blue-400 transition-colors line-clamp-1">
                                  {insight.readingItem.title}
                                </span>
                              </Link>
                            )}
                            {insight.bookmark && (
                              <span className="flex items-center gap-2 bg-zinc-800/50 rounded-lg p-2.5 border border-zinc-700/30">
                                <FileText size={11} className="text-zinc-500 shrink-0" />
                                <span className="text-[11px] text-zinc-400">@{insight.bookmark.authorHandle}</span>
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-700 ml-auto shrink-0">
                              {timeAgo(insight.createdAt)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteInsight(insight.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-700 hover:text-red-400 transition-all shrink-0"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
