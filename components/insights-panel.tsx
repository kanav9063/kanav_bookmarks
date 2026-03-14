'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Plus, X, Trash2, Lightbulb, Send } from 'lucide-react'

interface Insight {
  id: string
  content: string
  source: string
  createdAt: string
}

interface InsightsPanelProps {
  bookmarkId?: string
  readingItemId?: string
  compact?: boolean // inline mode for cards
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  discussion: { label: '💬', color: 'text-blue-400' },
  manual: { label: '✍️', color: 'text-zinc-400' },
  highlight: { label: '🔖', color: 'text-amber-400' },
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
      body: JSON.stringify({
        content: newContent.trim(),
        source: 'manual',
        bookmarkId,
        readingItemId,
      }),
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

  // Compact mode: just show a button with count
  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`flex items-center gap-1.5 text-[11px] transition-colors ${
          insights.length > 0
            ? 'text-amber-500/80 hover:text-amber-400'
            : 'text-zinc-600 hover:text-zinc-400'
        }`}
      >
        <Lightbulb size={11} />
        {insights.length > 0 ? `${insights.length} insight${insights.length > 1 ? 's' : ''}` : 'Add insight'}
      </button>
    )
  }

  return (
    <div className={`${compact ? 'mt-3 pt-3 border-t border-zinc-800/50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-amber-400" />
          <span className="text-[13px] font-medium text-zinc-200">Insights</span>
          {insights.length > 0 && (
            <span className="text-[11px] text-zinc-600 bg-zinc-800/50 px-1.5 py-0.5 rounded-full">
              {insights.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-blue-400 transition-colors"
            >
              <Plus size={12} />
              Add
            </button>
          )}
          {compact && (
            <button onClick={() => setExpanded(false)} className="text-zinc-600 hover:text-zinc-300">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Add new insight */}
      {adding && (
        <div className="mb-3 flex gap-2">
          <input
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addInsight()}
            placeholder="What's the key takeaway?"
            className="flex-1 px-3 py-2 bg-zinc-800/50 border border-zinc-700/40 rounded-lg text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/40"
            autoFocus
          />
          <button
            onClick={addInsight}
            disabled={!newContent.trim() || loading}
            className="px-3 py-2 bg-amber-600/20 border border-amber-500/30 text-amber-400 rounded-lg hover:bg-amber-600/30 disabled:opacity-40 transition-colors"
          >
            <Send size={12} />
          </button>
          <button onClick={() => { setAdding(false); setNewContent('') }} className="px-2 text-zinc-600 hover:text-zinc-300">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Insights list */}
      {insights.length === 0 && !adding ? (
        <p className="text-[12px] text-zinc-600 italic">No insights yet. Discuss this item to capture takeaways.</p>
      ) : (
        <div className="space-y-2">
          {insights.map(insight => (
            <div key={insight.id} className="group flex gap-2 items-start">
              <span className="text-[12px] mt-0.5 shrink-0">
                {SOURCE_LABELS[insight.source]?.label || '💡'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-zinc-300 leading-relaxed">{insight.content}</p>
                <span className="text-[10px] text-zinc-700">{timeAgo(insight.createdAt)}</span>
              </div>
              <button
                onClick={() => deleteInsight(insight.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-700 hover:text-red-400 transition-all shrink-0"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
