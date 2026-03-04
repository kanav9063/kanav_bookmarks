'use client'

import { type NodeProps } from '@xyflow/react'

interface CategoryNodeData {
  name: string
  slug: string
  color: string
  count: number
  description?: string
  [key: string]: unknown
}

interface CategoryNodeProps extends NodeProps {
  onExpand?: (slug: string) => void
}

export default function CategoryNode({ data }: CategoryNodeProps) {
  const { name, color, count } = data as CategoryNodeData

  return (
    <div
      className="flex flex-col items-center justify-center rounded-full border-2 select-none cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-lg"
      style={{
        width: 90,
        height: 90,
        backgroundColor: `${color}22`,
        borderColor: color,
        boxShadow: `0 0 20px ${color}33`,
      }}
    >
      <span
        className="text-xs font-semibold text-center px-2 leading-tight"
        style={{ color }}
      >
        {name}
      </span>
      <span className="text-xs mt-0.5" style={{ color: `${color}99` }}>
        {count}
      </span>
    </div>
  )
}
