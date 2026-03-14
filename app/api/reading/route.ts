import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  const where: Record<string, unknown> = {}
  if (type && type !== 'all') where.type = type
  if (status && status !== 'all') where.status = status
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { author: { contains: search } },
      { description: { contains: search } },
      { notes: { contains: search } },
    ]
  }

  const items = await prisma.readingItem.findMany({
    where,
    orderBy: { addedAt: 'desc' },
  })

  const stats = {
    total: await prisma.readingItem.count(),
    wantToRead: await prisma.readingItem.count({ where: { status: 'want-to-read' } }),
    reading: await prisma.readingItem.count({ where: { status: 'reading' } }),
    finished: await prisma.readingItem.count({ where: { status: 'finished' } }),
    books: await prisma.readingItem.count({ where: { type: 'book' } }),
    articles: await prisma.readingItem.count({ where: { type: 'article' } }),
  }

  return NextResponse.json({ items, stats })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, title, author, url, description, notes, coverImage, tags, rating, status } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const item = await prisma.readingItem.create({
      data: {
        type: type || 'article',
        title,
        author: author || null,
        url: url || null,
        description: description || null,
        notes: notes || null,
        coverImage: coverImage || null,
        tags: tags ? JSON.stringify(tags) : null,
        rating: rating || null,
        status: status || 'want-to-read',
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
