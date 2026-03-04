import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface MindMapNode {
  id: string
  type: string
  data: Record<string, unknown>
  position: { x: number; y: number }
}

interface MindMapEdge {
  id: string
  source: string
  target: string
}

interface MindMapResponse {
  nodes: MindMapNode[]
  edges: MindMapEdge[]
}

const ROOT_POSITION = { x: 0, y: 0 }
const CATEGORY_RADIUS = 400
const TWEET_RADIUS = 250

function categoryPosition(index: number, total: number): { x: number; y: number } {
  const angle = (2 * Math.PI * index) / total - Math.PI / 2
  return {
    x: Math.round(ROOT_POSITION.x + CATEGORY_RADIUS * Math.cos(angle)),
    y: Math.round(ROOT_POSITION.y + CATEGORY_RADIUS * Math.sin(angle)),
  }
}

function tweetPosition(
  categoryPosition: { x: number; y: number },
  index: number,
  total: number
): { x: number; y: number } {
  const angle = (2 * Math.PI * index) / Math.max(total, 1) - Math.PI / 2
  return {
    x: Math.round(categoryPosition.x + TWEET_RADIUS * Math.cos(angle)),
    y: Math.round(categoryPosition.y + TWEET_RADIUS * Math.sin(angle)),
  }
}

async function getBaseGraph(): Promise<MindMapResponse> {
  const [totalBookmarks, categories] = await Promise.all([
    prisma.bookmark.count(),
    prisma.category.findMany({
      include: {
        _count: { select: { bookmarks: true } },
      },
      orderBy: { bookmarks: { _count: 'desc' } },
    }),
  ])

  const rootNode: MindMapNode = {
    id: 'root',
    type: 'root',
    data: { label: 'My Bookmarks', count: totalBookmarks },
    position: ROOT_POSITION,
  }

  const categoryNodes: MindMapNode[] = categories.map((cat, index) => ({
    id: `cat-${cat.slug}`,
    type: 'category',
    data: {
      name: cat.name,
      slug: cat.slug,
      color: cat.color,
      count: cat._count.bookmarks,
      description: cat.description,
    },
    position: categoryPosition(index, categories.length),
  }))

  const categoryEdges: MindMapEdge[] = categories.map((cat) => ({
    id: `edge-root-cat-${cat.slug}`,
    source: 'root',
    target: `cat-${cat.slug}`,
  }))

  return {
    nodes: [rootNode, ...categoryNodes],
    edges: categoryEdges,
  }
}

async function getCategoryTweetNodes(categorySlug: string): Promise<MindMapResponse> {
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
    include: {
      _count: { select: { bookmarks: true } },
    },
  })

  if (!category) {
    return { nodes: [], edges: [] }
  }

  const bookmarks = await prisma.bookmark.findMany({
    where: {
      categories: {
        some: { category: { slug: categorySlug } },
      },
    },
    select: {
      id: true,
      tweetId: true,
      text: true,
      authorHandle: true,
      authorName: true,
    },
    take: 50, // Limit tweet nodes to avoid huge graphs
  })

  const catNodeId = `cat-${categorySlug}`
  const catPos = { x: 0, y: 0 } // Position relative to the category

  const tweetNodes: MindMapNode[] = bookmarks.map((bookmark, index) => {
    const truncatedText =
      bookmark.text.length > 100
        ? bookmark.text.slice(0, 97) + '...'
        : bookmark.text

    return {
      id: `tweet-${bookmark.tweetId}`,
      type: 'tweet',
      data: {
        tweetId: bookmark.tweetId,
        text: truncatedText,
        authorHandle: bookmark.authorHandle,
        authorName: bookmark.authorName,
        tweetUrl: `https://twitter.com/${bookmark.authorHandle}/status/${bookmark.tweetId}`,
      },
      position: tweetPosition(catPos, index, bookmarks.length),
    }
  })

  const tweetEdges: MindMapEdge[] = bookmarks.map((bookmark) => ({
    id: `edge-${catNodeId}-tweet-${bookmark.tweetId}`,
    source: catNodeId,
    target: `tweet-${bookmark.tweetId}`,
  }))

  return {
    nodes: tweetNodes,
    edges: tweetEdges,
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const categorySlug = searchParams.get('category')

  try {
    if (categorySlug) {
      const data = await getCategoryTweetNodes(categorySlug)
      return NextResponse.json(data)
    }

    const data = await getBaseGraph()
    return NextResponse.json(data)
  } catch (err) {
    console.error('Mindmap fetch error:', err)
    return NextResponse.json(
      { error: `Failed to build mindmap: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
