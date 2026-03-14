'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Trash2, Send } from 'lucide-react'

interface Insight {
  id: string
  content: string
  source: string
  createdAt: string
}

interface InsightsPanelProps {
  bookmarkId?: string
  readingItemId?: string
  compact?: boolean
}

export default function InsightsPanel({ bookmarkId, readingItemId, compact = false }: InsightsPanelProps) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [expanded, setExpanded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchInsights = useCallback(async () => {
    const params = new URLSearchParams()
    if (bookmarkId) params.set('bookmarkId', bookmarkId)
    if (readingItemId) params.set('readingItemId', readingItemId)
    const res = await fetch(`/api/insights?${params}`)
    const data = await res.json()
    setInsights(data.insights || [])
  }, [bookmarkId, readingItemId])

  useEffect(() => {
    if (expanded || !compact) fetchInsights()
  }, [expanded, compact, fetchInsights])

  async function addInsight() {
    if (!newContent.trim()) return
    setLoading(true)
    await fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent.trim(), source: 'manual', bookmarkId, readingItemId }),
    })
    setNewContent('')
    setAdding(false)
    setLoading(false)
    fetchInsights()
  }

  async function deleteInsight(id: string) {
    await fetch(`/api/insights/${id}`, { method: 'DELETE' })
    fetchInsights()
  }

  const aiInsights = insights.filter(i => i.source === 'ai')
  const discussionInsights = insights.filter(i => i.source === 'discussion')
  const manualInsights = insights.filter(i => i.source === 'manual')

  // Compact mode: teaser that expands inline
  if (compact && !expanded) {
    if (insights.length === 0) return null
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-zinc-400 hover:text-zinc-200 bg-zinc-800/40 hover:bg-zinc-800/60 border border-zinc-700/30 rounded-lg transition-all"
      >
        <span>💡</span>
        <span>{insights.length} takeaway{insights.length > 1 ? 's' : ''}</span>
      </button>
    )
  }

  // Show nothing when empty (no hollow box)
  if (insights.length === 0 && !adding) {
    if (!compact) return null
    // compact expanded but empty — still show a close + add option
    return (
      <div className="mt-3 pt-3 border-t border-zinc-800/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] text-zinc-500">Insights</span>
          <button onClick={() => setExpanded(false)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X size={13} />
          </button>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="text-[11px] text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors"
        >
          <Plus size={11} /> Add your own
        </button>
      </div>
    )
  }

  return (
    <div className={`${compact ? 'mt-3 pt-3 border-t border-zinc-800/50' : ''}`}>
      {compact && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-medium text-zinc-300">💡 Insights</span>
          <button onClick={() => setExpanded(false)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X size={13} />
          </button>
        </div>
      )}

      <div className="space-y-3">
        {/* AI Takeaways — blue-tinted glass, most prominent */}
        {aiInsights.length > 0 && (
          <div className="rounded-xl bg-blue-500/[0.03] border border-blue-500/10 p-3">
            <div className="text-[11px] font-semibold text-blue-400/70 uppercase tracking-wider mb-2">🤖 AI Takeaways</div>
            <div className="space-y-1.5">
              {aiInsights.map(insight => (
                <div key={insight.id} className="group flex gap-2 items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-zinc-200 leading-relaxed">{insight.content}</p>
                  </div>
                  <button
                    onClick={() => deleteInsight(insight.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-700 hover:text-red-400 transition-all shrink-0"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discussion insights — warm amber tint */}
        {discussionInsights.length > 0 && (
          <div className="rounded-xl bg-amber-500/[0.03] border border-amber-500/10 p-3">
            <div className="text-[11px] font-semibold text-amber-400/70 uppercase tracking-wider mb-2">💬 From Discussions</div>
            <div className="space-y-1.5">
              {discussionInsights.map(insight => (
                <div key={insight.id} className="group flex gap-2 items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-zinc-300 leading-relaxed">{insight.content}</p>
                  </div>
                  <button
                    onClick={() => deleteInsight(insight.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-700 hover:text-red-400 transition-all shrink-0"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual notes — subtle zinc */}
        {manualInsights.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">✍️ Notes</div>
            {manualInsights.map(insight => (
              <div key={insight.id} className="group flex gap-2 items-start rounded-lg bg-zinc-800/20 border border-zinc-700/20 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-zinc-400 leading-relaxed">{insight.content}</p>
                </div>
                <button
                  onClick={() => deleteInsight(insight.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-700 hover:text-red-400 transition-all shrink-0"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add insight inline input */}
      {adding && (
        <div className="mt-3 flex gap-2">
          <input
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addInsight()}
            placeholder="What's the key takeaway?"
            className="flex-1 px-3 py-2 bg-zinc-800/50 border border-zinc-700/40 rounded-lg text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500/40"
            autoFocus
          />
          <button
            onClick={addInsight}
            disabled={!newContent.trim() || loading}
            className="px-3 py-2 bg-zinc-700/30 border border-zinc-600/30 text-zinc-300 rounded-lg hover:bg-zinc-700/50 disabled:opacity-40 transition-colors"
          >
            <Send size={12} />
          </button>
          <button onClick={() => { setAdding(false); setNewContent('') }} className="px-2 text-zinc-600 hover:text-zinc-300 transition-colors">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Secondary 'add your own' — not the star of the show */}
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 text-[11px] text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors"
        >
          <Plus size={11} /> Add your own
        </button>
      )}
    </div>
  )
}
