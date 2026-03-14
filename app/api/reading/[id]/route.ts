import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'


export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = body.title
    if (body.author !== undefined) data.author = body.author
    if (body.url !== undefined) data.url = body.url
    if (body.description !== undefined) data.description = body.description
    if (body.notes !== undefined) data.notes = body.notes
    if (body.coverImage !== undefined) data.coverImage = body.coverImage
    if (body.tags !== undefined) data.tags = JSON.stringify(body.tags)
    if (body.rating !== undefined) data.rating = body.rating
    if (body.status !== undefined) {
      data.status = body.status
      if (body.status === 'finished') data.finishedAt = new Date()
    }
    if (body.type !== undefined) data.type = body.type

    const item = await prisma.readingItem.update({ where: { id }, data })
    return NextResponse.json(item)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.readingItem.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
