'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BookOpen, ExternalLink, ArrowRight, Book, FileText, Newspaper, Headphones, GraduationCap } from 'lucide-react'

interface ReadingItem {
  id: string
  type: string
  title: string
  author: string | null
  url: string | null
  status: string
  addedAt: string
}

const TYPE_ICON_STYLES: Record<string, { bg: string; text: string }> = {
  article: { bg: 'bg-gradient-to-br from-blue-500/20 to-blue-600/10', text: 'text-blue-400' },
  book: { bg: 'bg-gradient-to-br from-violet-500/20 to-violet-600/10', text: 'text-violet-400' },
  paper: { bg: 'bg-gradient-to-br from-indigo-500/20 to-indigo-600/10', text: 'text-indigo-400' },
  newsletter: { bg: 'bg-gradient-to-br from-amber-500/20 to-amber-600/10', text: 'text-amber-400' },
  podcast: { bg: 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10', text: 'text-emerald-400' },
}

function TypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'book': return <Book size={14} />
    case 'paper': return <GraduationCap size={14} />
    case 'newsletter': return <Newspaper size={14} />
    case 'podcast': return <Headphones size={14} />
    default: return <FileText size={14} />
  }
}

export default function ContinueReadingSection() {
  const [items, setItems] = useState<ReadingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reading?status=reading&limit=3')
      .then(r => r.json())
      .then(data => {
        setItems(data.items || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading || items.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium mb-0.5">In Progress</p>
          <h2 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
            <BookOpen size={18} className="text-amber-400" />
            Continue Reading
          </h2>
        </div>
        <Link
          href="/reading?status=reading"
          className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
        >
          View all
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map(item => {
          const typeStyle = TYPE_ICON_STYLES[item.type] || { bg: 'bg-zinc-800/50', text: 'text-zinc-400' }
          return (
            <div
              key={item.id}
              className="bg-zinc-900/50 border border-zinc-800/30 rounded-xl p-3.5 hover:border-amber-500/20 hover:bg-zinc-900/70 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-200 group"
            >
              <div className="flex items-start gap-2.5">
                <div className={`p-2 rounded-lg shrink-0 ${typeStyle.bg} ${typeStyle.text}`}>
                  <TypeIcon type={item.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="text-[13px] font-medium text-zinc-200 leading-snug line-clamp-2 group-hover:text-zinc-100 transition-colors">
                      {item.title}
                    </h3>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-zinc-700 hover:text-blue-400 transition-colors mt-0.5"
                      >
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  {item.author && (
                    <p className="text-[11px] text-zinc-600 mt-0.5">by {item.author}</p>
                  )}
                  {/* Progress bar (decorative, amber) */}
                  <div className="mt-2 h-0.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-amber-500/50 rounded-full w-1/3" />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
