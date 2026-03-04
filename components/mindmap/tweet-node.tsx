'use client'

import { type NodeProps } from '@xyflow/react'
import { ExternalLink } from 'lucide-react'

interface TweetNodeData {
  tweetId: string
  text: string
  authorHandle: string
  authorName: string
  tweetUrl: string
  [key: string]: unknown
}

export default function TweetNode({ data }: NodeProps) {
  const { text, authorHandle, tweetUrl } = data as TweetNodeData
  const truncated = text.length > 50 ? text.slice(0, 50) + '...' : text

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 shadow-lg select-none w-44">
      <p className="text-xs text-zinc-300 leading-relaxed">{truncated}</p>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-zinc-500">@{authorHandle}</span>
        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 hover:text-indigo-400 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={10} />
        </a>
      </div>
    </div>
  )
}
