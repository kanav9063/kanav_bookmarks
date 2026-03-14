'use client'
import InsightsPanel from "@/components/insights-panel"

import { useState, useEffect, useCallback } from 'react'
import {
  BookOpen, Plus, ExternalLink, Star, Search, X, Check,
  Book, FileText, Newspaper, Headphones, GraduationCap, PlayCircle,
  Edit2, Trash2, Link as LinkIcon
} from 'lucide-react'

interface ReadingItem {
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
}

interface Stats {
  total: number
  wantToRead: number
  reading: number
  finished: number
  books: number
  articles: number
}

const TYPE_OPTIONS = [
  { value: 'article', label: 'Article', icon: FileText },
  { value: 'book', label: 'Book', icon: Book },
  { value: 'paper', label: 'Paper', icon: GraduationCap },
  { value: 'newsletter', label: 'Newsletter', icon: Newspaper },
  { value: 'podcast', label: 'Podcast', icon: Headphones },
  { value: 'video', label: 'Video', icon: PlayCircle },
]

const STATUS_OPTIONS = [
  { value: 'want-to-read', label: 'Want to Read', color: 'text-blue-400 bg-blue-500/15 border-blue-500/30' },
  { value: 'reading', label: 'Reading', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
  { value: 'finished', label: 'Finished', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
]

// Type icon with colored gradient background
const TYPE_ICON_STYLES: Record<string, { bg: string; text: string }> = {
  article: { bg: 'bg-gradient-to-br from-blue-500/20 to-blue-600/10', text: 'text-blue-400' },
  book: { bg: 'bg-gradient-to-br from-violet-500/20 to-violet-600/10', text: 'text-violet-400' },
  paper: { bg: 'bg-gradient-to-br from-indigo-500/20 to-indigo-600/10', text: 'text-indigo-400' },
  newsletter: { bg: 'bg-gradient-to-br from-amber-500/20 to-amber-600/10', text: 'text-amber-400' },
  podcast: { bg: 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10', text: 'text-emerald-400' },
}

const READ_TIME: Record<string, string> = {
  article: '~5 min read',
  book: '~8h read',
  paper: '~15 min read',
  newsletter: '~3 min read',
  podcast: '~45 min listen',
}

function TypeIcon({ type, size = 14 }: { type: string; size?: number }) {
  const opt = TYPE_OPTIONS.find(t => t.value === type)
  const Icon = opt?.icon || FileText
  return <Icon size={size} />
}

function StatusBadge({ status }: { status: string }) {
  const opt = STATUS_OPTIONS.find(s => s.value === status)
  const isReading = status === 'reading'
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${opt?.color || 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
      {isReading && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 animate-pulse" />
      )}
      {opt?.label || status}
    </span>
  )
}

function StarRating({ rating, onRate, readonly = false }: { rating: number | null; onRate?: (r: number) => void; readonly?: boolean }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const display = hovered ?? rating ?? 0
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            onClick={() => !readonly && onRate?.(i === rating ? 0 : i)}
            onMouseEnter={() => !readonly && setHovered(i)}
            onMouseLeave={() => !readonly && setHovered(null)}
            disabled={readonly}
            className={`${readonly ? '' : 'cursor-pointer hover:scale-110'} transition-transform ${
              !readonly && hovered !== null && i <= hovered ? 'drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]' : ''
            }`}
          >
            <Star
              size={16}
              className={i <= display ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}
            />
          </button>
        ))}
      </div>
      {(rating || 0) > 0 && (
        <span className="text-[11px] text-zinc-500 ml-0.5">{rating}/5</span>
      )}
    </div>
  )
}

function AddItemModal({ onClose, onAdd }: { onClose: () => void; onAdd: (item: Partial<ReadingItem>) => void }) {
  const [type, setType] = useState('article')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('want-to-read')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onAdd({ type, title: title.trim(), author: author.trim() || null, url: url.trim() || null, description: description.trim() || null, status })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-xl mx-4 p-6 max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/50" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">Add to Reading List</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-800 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type selector */}
          <div>
            <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-semibold mb-2">Content Type</p>
            <div className="flex gap-2 flex-wrap">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                    type === opt.value
                      ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                      : 'bg-zinc-800/50 border-zinc-700/40 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <opt.icon size={12} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-zinc-800/50" />

          {/* Details section */}
          <div>
            <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-semibold mb-3">Details</p>
            <div className="space-y-3">
              <input
                placeholder="Title *"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-800/50 border border-zinc-700/40 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/40 transition-colors"
                autoFocus
              />
              <input
                placeholder="Author"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-800/50 border border-zinc-700/40 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/40 transition-colors"
              />
              {/* URL with link icon prefix */}
              <div className="relative">
                <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  placeholder="URL (optional)"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-zinc-800/50 border border-zinc-700/40 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/40 transition-colors"
                />
              </div>
              <textarea
                placeholder="Why you want to read this..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 bg-zinc-800/50 border border-zinc-700/40 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/40 resize-none transition-colors"
              />
            </div>
          </div>

          <div className="border-t border-zinc-800/50" />

          {/* Status */}
          <div>
            <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-semibold mb-2">Status</p>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                    status === opt.value ? opt.color : 'bg-zinc-800/50 border-zinc-700/40 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-blue-500/20"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ItemCard({ item, onUpdate, onDelete }: { item: ReadingItem; onUpdate: (id: string, data: Partial<ReadingItem>) => void; onDelete: (id: string) => void }) {
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState(item.notes || '')
  const [editingNotes, setEditingNotes] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)

  const tags: string[] = item.tags ? JSON.parse(item.tags) : []
  const typeStyle = TYPE_ICON_STYLES[item.type] || { bg: 'bg-zinc-800/50', text: 'text-zinc-400' }
  const readTime = READ_TIME[item.type] || ''

  return (
    <div className="group bg-zinc-900/40 border border-zinc-800/30 rounded-xl p-4 hover:border-zinc-700/40 hover:bg-zinc-900/60 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200">
      <div className="flex items-start gap-3">
        {/* Type icon with colored gradient background */}
        <div className={`mt-0.5 p-2.5 rounded-xl ${typeStyle.bg} ${typeStyle.text} shrink-0`}>
          <TypeIcon type={item.type} size={16} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Title + link */}
          <div className="flex items-start gap-2">
            <h3 className="text-[14px] font-medium text-zinc-100 leading-snug flex-1">
              {item.url ? (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                  {item.title}
                  <ExternalLink size={11} className="inline ml-1.5 opacity-40" />
                </a>
              ) : item.title}
            </h3>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onDelete(item.id)} className="p-1 text-zinc-600 hover:text-red-400 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Author + read time */}
          <div className="flex items-center gap-2 mt-0.5">
            {item.author && (
              <p className="text-[12px] text-zinc-500">by {item.author}</p>
            )}
            {readTime && (
              <span className="text-[11px] text-zinc-600">{readTime}</span>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-[12px] text-zinc-500 mt-1.5 line-clamp-2">{item.description}</p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            {/* Status dropdown */}
            <div className="relative">
              <button onClick={() => setStatusOpen(!statusOpen)}>
                <StatusBadge status={item.status} />
              </button>
              {statusOpen && (
                <div className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg py-1 z-10 min-w-[140px] shadow-lg shadow-black/30">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { onUpdate(item.id, { status: opt.value }); setStatusOpen(false) }}
                      className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-zinc-700/50 ${
                        item.status === opt.value ? 'text-blue-400' : 'text-zinc-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <StarRating rating={item.rating} onRate={r => onUpdate(item.id, { rating: r || null })} />

            {/* Notes toggle */}
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1"
            >
              <Edit2 size={10} />
              {item.notes ? 'Notes' : 'Add notes'}
            </button>

            {/* Date */}
            <span className="text-[11px] text-zinc-700 ml-auto">
              {new Date(item.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-zinc-800/50 border border-zinc-700/30 rounded-full text-[10px] text-zinc-500">{tag}</span>
              ))}
            </div>
          )}

          {/* Notes section */}
          {showNotes && (
            <div className="mt-3 pt-3 border-t border-zinc-800/50">
              {editingNotes ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/40 rounded-lg text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/40 resize-none"
                    placeholder="Your thoughts..."
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setNotes(item.notes || ''); setEditingNotes(false) }} className="text-[11px] text-zinc-500 hover:text-zinc-300">Cancel</button>
                    <button onClick={() => { onUpdate(item.id, { notes }); setEditingNotes(false) }} className="text-[11px] text-blue-400 hover:text-blue-300 font-medium">Save</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => setEditingNotes(true)} className="cursor-pointer border-l-2 border-yellow-500/40 pl-3">
                  {notes ? (
                    <p className="text-[12px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{notes}</p>
                  ) : (
                    <p className="text-[12px] text-zinc-600 italic">Click to add notes...</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Insights wrapped with amber tint */}
          <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl mt-3 p-3">
            <InsightsPanel readingItemId={item.id} compact />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReadingPage() {
  const [items, setItems] = useState<ReadingItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterType !== 'all') params.set('type', filterType)
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (search) params.set('search', search)
    const res = await fetch(`/api/reading?${params}`)
    const data = await res.json()
    setItems(data.items)
    setStats(data.stats)
    setLoading(false)
  }, [filterType, filterStatus, search])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function handleAdd(item: Partial<ReadingItem>) {
    await fetch('/api/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
    setShowAdd(false)
    fetchItems()
  }

  async function handleUpdate(id: string, data: Partial<ReadingItem>) {
    await fetch(`/api/reading/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    fetchItems()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this item?')) return
    await fetch(`/api/reading/${id}`, { method: 'DELETE' })
    fetchItems()
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-14 lg:pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-violet-500/20 rounded-xl">
                <BookOpen size={20} className="text-blue-400" />
              </div>
              Reading List
            </h1>
            <p className="text-sm text-zinc-500 mt-1.5">Articles, books, and stuff worth reading</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        {/* Stats */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total', value: stats.total, color: 'text-zinc-300', borderColor: 'border-l-zinc-500', gradient: 'from-zinc-500/10' },
              { label: 'Want to Read', value: stats.wantToRead, color: 'text-blue-400', borderColor: 'border-l-blue-500', gradient: 'from-blue-500/10' },
              { label: 'Reading', value: stats.reading, color: 'text-amber-400', borderColor: 'border-l-amber-500', gradient: 'from-amber-500/10' },
              { label: 'Finished', value: stats.finished, color: 'text-emerald-400', borderColor: 'border-l-emerald-500', gradient: 'from-emerald-500/10' },
            ].map(s => (
              <div key={s.label} className={`bg-gradient-to-r ${s.gradient} to-transparent border border-zinc-800/30 border-l-2 ${s.borderColor} rounded-xl p-3.5 text-center`}>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[11px] text-zinc-500 mt-1 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              placeholder="Search reading list..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-zinc-900/50 border border-zinc-800/50 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/40"
            />
          </div>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 bg-zinc-900/50 border border-zinc-800/50 rounded-lg text-sm text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="all">All types</option>
            {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}s</option>)}
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-zinc-900/50 border border-zinc-800/50 rounded-lg text-sm text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Items list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-zinc-800 rounded w-2/3 mb-2" />
                <div className="h-3 bg-zinc-800/50 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen size={48} className="text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-500 text-sm">
              {stats?.total === 0 ? 'Your reading list is empty. Add something!' : 'No items match your filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <ItemCard key={item.id} item={item} onUpdate={handleUpdate} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAdd && <AddItemModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
    </div>
  )
}
