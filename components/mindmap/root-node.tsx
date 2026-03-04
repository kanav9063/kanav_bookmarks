'use client'

import { type NodeProps } from '@xyflow/react'

interface RootNodeData {
  label: string
  count: number
  [key: string]: unknown
}

export default function RootNode({ data }: NodeProps) {
  const { label, count } = data as RootNodeData

  return (
    <div
      className="flex flex-col items-center justify-center rounded-full bg-indigo-600 border-2 border-indigo-400 shadow-2xl shadow-indigo-900/50 select-none"
      style={{ width: 120, height: 120 }}
    >
      <span className="text-white font-bold text-sm leading-tight text-center px-2">{label}</span>
      <span className="text-indigo-200 text-xs mt-1">{count} bookmarks</span>
    </div>
  )
}
