'use client'

import { ExternalLink, Download } from 'lucide-react'
import type { BookmarkWithMedia } from '@/lib/types'

interface BookmarkCardProps {
  bookmark: BookmarkWithMedia
}

function truncateText(text: string, maxLength: number): { truncated: string; wasTruncated: boolean } {
  if (text.length <= maxLength) return { truncated: text, wasTruncated: false }
  return { truncated: text.slice(0, maxLength), wasTruncated: true }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function MediaPreview({ url }: { url: string }) {
  return (
    <div className="mt-3 rounded-lg overflow-hidden border border-zinc-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Tweet media"
        className="w-full max-h-48 object-cover"
        loading="lazy"
      />
    </div>
  )
}

function CategoryChips({ categories }: { categories: BookmarkWithMedia['categories'] }) {
  if (categories.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {categories.map((cat) => (
        <span
          key={cat.id}
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: `${cat.color}22`, color: cat.color, border: `1px solid ${cat.color}44` }}
        >
          {cat.name}
        </span>
      ))}
    </div>
  )
}

function CardActions({
  tweetUrl,
  hasMedia,
  onDownload,
}: {
  tweetUrl: string
  hasMedia: boolean
  onDownload: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      {hasMedia && (
        <button
          onClick={onDownload}
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          title="Download media"
        >
          <Download size={14} />
        </button>
      )}
      <a
        href={tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        title="Open tweet"
      >
        <ExternalLink size={14} />
      </a>
    </div>
  )
}

export default function BookmarkCard({ bookmark }: BookmarkCardProps) {
  const { truncated, wasTruncated } = truncateText(bookmark.text, 120)
  const firstImage = bookmark.mediaItems.find((m) => m.type === 'photo')
  const tweetUrl = `https://twitter.com/${bookmark.authorHandle}/status/${bookmark.tweetId}`
  const hasMedia = bookmark.mediaItems.length > 0

  function handleDownload() {
    fetch(`/api/export?type=zip&bookmarkId=${bookmark.id}`)
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `bookmark-${bookmark.tweetId}.zip`
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch(console.error)
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-all flex flex-col gap-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-100 truncate">{bookmark.authorName}</p>
          <p className="text-xs text-zinc-500 truncate">@{bookmark.authorHandle}</p>
        </div>
      </div>

      <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
        {truncated}
        {wasTruncated && (
          <span className="text-zinc-500">
            ...{' '}
            <a href={tweetUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
              more
            </a>
          </span>
        )}
      </p>

      {firstImage && <MediaPreview url={firstImage.url} />}

      <CategoryChips categories={bookmark.categories} />

      <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          {formatDate(bookmark.tweetCreatedAt ?? bookmark.importedAt ?? null)}
        </span>
        <CardActions tweetUrl={tweetUrl} hasMedia={hasMedia} onDownload={handleDownload} />
      </div>
    </div>
  )
}
