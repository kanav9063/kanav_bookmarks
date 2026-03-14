import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const item = await prisma.readingItem.findUnique({
    where: { id },
    include: {
      videoMeta: true,
      insights: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(item)
}
