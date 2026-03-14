'use client'

import { useState, useEffect } from 'react'
import { Lightbulb, ExternalLink, MessageSquare, Pencil, BookOpen, FileText, Trash2 } from 'lucide-react'
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

const SOURCE_EMOJI: Record<string, string> = {
  discussion: '💬',
  manual: '✍️',
  highlight: '🔖',
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
            <Lightbulb size={24} className="text-amber-400" />
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
          <div className="text-center py-16">
            <Lightbulb size={48} className="text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-500 text-sm mb-2">No insights yet</p>
            <p className="text-zinc-600 text-xs max-w-sm mx-auto">
              When you discuss articles or bookmarks, insights get captured here.
              You can also manually add them from any item.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([date, dateInsights]) => (
              <div key={date}>
                <h2 className="text-[12px] text-zinc-600 uppercase tracking-wider font-medium mb-3 px-1">
                  {date}
                </h2>
                <div className="space-y-2">
                  {dateInsights.map(insight => (
                    <div
                      key={insight.id}
                      className="group bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 hover:border-zinc-700/50 transition-all"
                    >
                      <div className="flex gap-3 items-start">
                        <span className="text-sm mt-0.5 shrink-0">
                          {SOURCE_EMOJI[insight.source] || '💡'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-zinc-200 leading-relaxed">{insight.content}</p>

                          {/* Source item */}
                          <div className="flex items-center gap-3 mt-2">
                            {insight.readingItem && (
                              <Link
                                href="/reading"
                                className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-blue-400 transition-colors"
                              >
                                <BookOpen size={10} />
                                {insight.readingItem.title}
                              </Link>
                            )}
                            {insight.bookmark && (
                              <span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                                <FileText size={10} />
                                @{insight.bookmark.authorHandle}
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
