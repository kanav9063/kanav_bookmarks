'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, BookmarkX, ChevronLeft, ChevronRight } from 'lucide-react'
import * as Select from '@radix-ui/react-select'
import { ChevronDown } from 'lucide-react'
import BookmarkCard from '@/components/bookmark-card'
import type { BookmarkWithMedia, BookmarksResponse } from '@/lib/types'

const PAGE_SIZE = 24

interface Filters {
  q: string
  category: string
  mediaType: string
  sort: string
  page: number
}

const DEFAULT_FILTERS: Filters = {
  q: '',
  category: '',
  mediaType: '',
  sort: 'newest',
  page: 1,
}

function buildUrl(filters: Filters): string {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.category) params.set('category', filters.category)
  if (filters.mediaType) params.set('mediaType', filters.mediaType)
  params.set('page', String(filters.page))
  params.set('limit', String(PAGE_SIZE))
  return `/api/bookmarks?${params.toString()}`
}

function SelectMenu({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
  placeholder: string
}) {
  return (
    <Select.Root value={value || '_all'} onValueChange={(v) => onChange(v === '_all' ? '' : v)}>
      <Select.Trigger className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 hover:border-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors min-w-[140px]">
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <ChevronDown size={14} className="text-zinc-500 ml-auto" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
          <Select.Viewport className="p-1">
            <Select.Item value="_all" className="flex items-center px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 rounded cursor-pointer outline-none">
              <Select.ItemText>{placeholder}</Select.ItemText>
            </Select.Item>
            {options.map((opt) => (
              <Select.Item
                key={opt.value}
                value={opt.value}
                className="flex items-center px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 rounded cursor-pointer outline-none data-[highlighted]:bg-zinc-700"
              >
                <Select.ItemText>{opt.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

function Pagination({ page, total, limit, onChange }: {
  page: number
  total: number
  limit: number
  onChange: (p: number) => void
}) {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-3 mt-8">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={16} />
        Previous
      </button>
      <span className="text-sm text-zinc-500">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

export default function BookmarksPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [bookmarks, setBookmarks] = useState<BookmarkWithMedia[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchBookmarks = useCallback(async (f: Filters) => {
    setLoading(true)
    try {
      const res = await fetch(buildUrl(f))
      if (!res.ok) throw new Error('Failed to fetch')
      const data: BookmarksResponse = await res.json()
      setBookmarks(data.bookmarks)
      setTotal(data.total)
    } catch (err) {
      console.error(err)
      setBookmarks([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBookmarks(filters)
  }, [fetchBookmarks, filters])

  function updateSearch(q: string) {
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, q, page: 1 }))
    }, 300)
  }

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const mediaOptions = [
    { label: 'Photos', value: 'photo' },
    { label: 'Videos', value: 'video' },
  ]

  const sortOptions = [
    { label: 'Newest first', value: 'newest' },
    { label: 'Oldest first', value: 'oldest' },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Browse Bookmarks</h1>
        <p className="text-zinc-400 mt-1">{total > 0 ? `${total.toLocaleString()} bookmarks` : 'Search and filter your bookmarks'}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search bookmarks..."
            onChange={(e) => updateSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <SelectMenu
            value={filters.mediaType}
            onChange={(v) => updateFilter('mediaType', v)}
            options={mediaOptions}
            placeholder="All media"
          />
          <SelectMenu
            value={filters.sort}
            onChange={(v) => updateFilter('sort', v)}
            options={sortOptions}
            placeholder="Sort"
          />
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 h-48 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && bookmarks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookmarkX size={48} className="text-zinc-700 mb-4" />
          <p className="text-xl font-semibold text-zinc-400">No bookmarks found</p>
          <p className="text-zinc-600 mt-1 text-sm">Try adjusting your search or filters</p>
        </div>
      )}

      {!loading && bookmarks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {bookmarks.map((bookmark) => (
            <BookmarkCard key={bookmark.id} bookmark={bookmark} />
          ))}
        </div>
      )}

      <Pagination
        page={filters.page}
        total={total}
        limit={PAGE_SIZE}
        onChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
      />
    </div>
  )
}
