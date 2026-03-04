'use client'

import { useState, useCallback, useEffect } from 'react'
import { ReactFlow, Background, Controls, MiniMap, addEdge, useNodesState, useEdgesState, type Node, type Edge, type NodeMouseHandler } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import RootNode from './root-node'
import CategoryNode from './category-node'
import TweetNode from './tweet-node'

const nodeTypes = {
  root: RootNode,
  category: CategoryNode,
  tweet: TweetNode,
}

interface MindmapCanvasProps {
  initialNodes: Node[]
  initialEdges: Edge[]
}

function offsetTweetNodes(
  tweetNodes: Node[],
  categoryNode: Node
): Node[] {
  return tweetNodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(tweetNodes.length, 1) - Math.PI / 2
    const radius = 250
    return {
      ...n,
      position: {
        x: categoryNode.position.x + Math.round(radius * Math.cos(angle)),
        y: categoryNode.position.y + Math.round(radius * Math.sin(angle)),
      },
    }
  })
}

export default function MindmapCanvas({ initialNodes, initialEdges }: MindmapCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  const handleNodeClick: NodeMouseHandler = useCallback(async (_, node) => {
    if (node.type !== 'category') return

    const data = node.data as { slug: string; name: string; color: string; count: number }
    const { slug } = data

    if (expandedCategories.has(slug)) return

    try {
      const res = await fetch(`/api/mindmap?category=${slug}`)
      const { nodes: newNodes, edges: newEdges } = await res.json()

      const positioned = offsetTweetNodes(newNodes as Node[], node)

      setNodes((prev) => {
        const existingIds = new Set(prev.map((n) => n.id))
        const toAdd = positioned.filter((n) => !existingIds.has(n.id))
        return [...prev, ...toAdd]
      })

      setEdges((prev) => {
        const existingIds = new Set(prev.map((e) => e.id))
        const toAdd = (newEdges as Edge[]).filter((e) => !existingIds.has(e.id))
        return [...prev, ...toAdd]
      })

      setExpandedCategories((prev) => new Set([...prev, slug]))
    } catch (err) {
      console.error('Failed to expand category:', err)
    }
  }, [expandedCategories, setNodes, setEdges])

  const onConnect = useCallback(
    (params: Parameters<typeof addEdge>[0]) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={handleNodeClick}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      defaultEdgeOptions={{
        style: { stroke: '#3f3f46', strokeWidth: 1.5 },
        animated: false,
      }}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#27272a" gap={24} size={1} />
      <Controls className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden" />
      <MiniMap
        className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden"
        nodeColor={(n) => {
          if (n.type === 'root') return '#6366f1'
          if (n.type === 'category') {
            const d = n.data as { color?: string }
            return d.color ?? '#6366f1'
          }
          return '#3f3f46'
        }}
        maskColor="rgba(9,9,11,0.7)"
        position="bottom-right"
      />
    </ReactFlow>
  )
}
