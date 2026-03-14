'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ExternalLink, Play, Clock, BookOpen, Star,
  Lightbulb, Plus, Send, X, MessageSquare, Calendar,
  User, Hash, ChevronRight
} from 'lucide-react'

interface Chapter {
  time: string
  title: string
  quote: string
  summary: string
}

interface Insight {
  id: string
  content: string
  source: string
  createdAt: string
}

interface VideoMeta {
  videoId: string
  thumbnailUrl: string | null
  channelName: string | null
  duration: string | null
  transcript: string | null
  chapters: string | null
}

interface ReadingDetail {
  id: string
  type: string
  title: string
  author: string | null
  url: string | null
  description: string | null
  notes: string | null
  coverImage: string | null
  tags: string | null
  rating: number | null
  status: string
  addedAt: string
  finishedAt: string | null
  videoMeta: VideoMeta | null
  insights: Insight[]
}

function timeToSeconds(time: string): number {
  const parts = time.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0]
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'want-to-read': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    'reading': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    'finished': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  }
  const labels: Record<string, string> = {
    'want-to-read': 'Want to Read',
    'reading': 'Reading',
    'finished': 'Finished',
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-medium border ${styles[status] || 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
      {labels[status] || status}
    </span>
  )
}

export default function ReadingDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [item, setItem] = useState<ReadingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [addingInsight, setAddingInsight] = useState(false)
  const [newInsight, setNewInsight] = useState('')
  const [showTranscript, setShowTranscript] = useState(false)

  useEffect(() => {
    fetch(`/api/reading/${id}/detail`)
      .then(r => r.json())
      .then(d => { setItem(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  async function addInsight() {
    if (!newInsight.trim()) return
    await fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: newInsight.trim(),
        source: 'manual',
        readingItemId: id,
      }),
    })
    setNewInsight('')
    setAddingInsight(false)
    // Refetch
    const r = await fetch(`/api/reading/${id}/detail`)
    setItem(await r.json())
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse text-zinc-600">Loading...</div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">
        Item not found
      </div>
    )
  }

  const chapters: Chapter[] = item.videoMeta?.chapters ? JSON.parse(item.videoMeta.chapters) : []
  const isVideo = item.type === 'video' && item.videoMeta
  const videoId = item.videoMeta?.videoId

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pt-14 lg:pt-6">

        {/* Back button */}
        <Link
          href="/reading"
          className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Reading List
        </Link>

        {/* Video embed */}
        {isVideo && videoId && (
          <div className="relative mb-6 rounded-2xl overflow-hidden bg-black aspect-video shadow-2xl shadow-black/50">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        )}

        {/* Non-video cover image */}
        {!isVideo && item.coverImage && (
          <div className="mb-6 rounded-2xl overflow-hidden">
            <img src={item.coverImage} alt="" className="w-full object-cover max-h-[300px]" />
          </div>
        )}

        {/* Title & meta */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight mb-3">
            {item.title}
          </h1>

          <div className="flex items-center gap-3 flex-wrap text-[13px] text-zinc-400">
            {item.author && (
              <span className="flex items-center gap-1.5">
                <User size={13} className="text-zinc-500" />
                {item.author}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar size={13} className="text-zinc-500" />
              {new Date(item.addedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <StatusBadge status={item.status} />
            {item.rating && (
              <span className="flex items-center gap-1">
                {Array.from({ length: item.rating }).map((_, i) => (
                  <Star key={i} size={12} className="text-amber-400 fill-amber-400" />
                ))}
              </span>
            )}
          </div>

          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-[13px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              {item.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
              <ExternalLink size={12} />
            </a>
          )}

          {item.description && (
            <p className="mt-4 text-[14px] text-zinc-400 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Chapters — the Simon Willison style section */}
        {chapters.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
              <Hash size={18} className="text-blue-400" />
              Key Sections
            </h2>

            <div className="space-y-6">
              {chapters.map((chapter, i) => (
                <div key={i} className="relative">
                  {/* Section header */}
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-[15px] font-semibold text-zinc-100">
                      {chapter.title}
                    </h3>
                  </div>

                  {/* Timestamp link */}
                  {videoId && (
                    <a
                      href={`https://www.youtube.com/watch?v=${videoId}&t=${timeToSeconds(chapter.time)}s`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[12px] text-blue-400 hover:text-blue-300 font-mono mb-3 transition-colors"
                    >
                      <Play size={10} className="fill-current" />
                      {chapter.time}
                    </a>
                  )}

                  {/* Quote blockquote — the key insight */}
                  {chapter.quote && (
                    <blockquote className="border-l-2 border-blue-500/30 pl-4 py-1 mb-3 bg-blue-500/[0.03] rounded-r-lg">
                      <p className="text-[14px] text-zinc-300 leading-relaxed italic">
                        {chapter.quote}
                      </p>
                    </blockquote>
                  )}

                  {/* Editorial summary */}
                  {chapter.summary && (
                    <p className="text-[13px] text-zinc-500 leading-relaxed">
                      {chapter.summary}
                    </p>
                  )}

                  {/* Divider (except last) */}
                  {i < chapters.length - 1 && (
                    <div className="mt-6 border-b border-zinc-800/30" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Lightbulb size={18} className="text-amber-400" />
              Insights
              {item.insights.length > 0 && (
                <span className="text-[12px] text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded-full font-normal">
                  {item.insights.length}
                </span>
              )}
            </h2>
            {!addingInsight && (
              <button
                onClick={() => setAddingInsight(true)}
                className="flex items-center gap-1.5 text-[12px] text-amber-400/70 hover:text-amber-400 transition-colors"
              >
                <Plus size={13} />
                Add insight
              </button>
            )}
          </div>

          {/* Add insight input */}
          {addingInsight && (
            <div className="flex gap-2 mb-4">
              <input
                value={newInsight}
                onChange={e => setNewInsight(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addInsight()}
                placeholder="What's the key takeaway?"
                className="flex-1 px-4 py-2.5 bg-zinc-900/50 border border-amber-500/20 rounded-xl text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/40"
                autoFocus
              />
              <button
                onClick={addInsight}
                disabled={!newInsight.trim()}
                className="px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl hover:bg-amber-500/20 disabled:opacity-40 transition-colors"
              >
                <Send size={13} />
              </button>
              <button onClick={() => { setAddingInsight(false); setNewInsight('') }} className="px-2 text-zinc-600 hover:text-zinc-300">
                <X size={15} />
              </button>
            </div>
          )}

          {item.insights.length === 0 && !addingInsight ? (
            <div className="bg-zinc-900/30 border border-zinc-800/30 rounded-xl p-6 text-center">
              <Lightbulb size={24} className="text-zinc-800 mx-auto mb-2" />
              <p className="text-[13px] text-zinc-600">No insights yet. Discuss this to capture takeaways.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {item.insights.map(insight => (
                <div
                  key={insight.id}
                  className="flex gap-3 items-start bg-zinc-900/30 border border-amber-500/10 rounded-xl p-4 border-l-2 border-l-amber-500/30"
                >
                  <MessageSquare size={13} className="text-amber-400/60 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-zinc-200 leading-relaxed">{insight.content}</p>
                    <span className="text-[10px] text-zinc-600 mt-1 block">
                      {new Date(insight.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transcript toggle */}
        {item.videoMeta?.transcript && (
          <div className="mb-10">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="flex items-center gap-2 text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ChevronRight size={14} className={`transition-transform ${showTranscript ? 'rotate-90' : ''}`} />
              {showTranscript ? 'Hide transcript' : 'Show full transcript'}
              <span className="text-zinc-700">({Math.round(item.videoMeta.transcript.length / 5)} words)</span>
            </button>

            {showTranscript && (
              <div className="mt-4 bg-zinc-900/30 border border-zinc-800/30 rounded-xl p-5 max-h-[500px] overflow-y-auto">
                <p className="text-[13px] text-zinc-400 leading-relaxed whitespace-pre-wrap font-mono">
                  {item.videoMeta.transcript}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {item.notes && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold mb-3">Notes</h2>
            <div className="bg-zinc-900/30 border border-zinc-800/30 rounded-xl p-5">
              <p className="text-[14px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{item.notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
