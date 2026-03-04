import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(): Promise<NextResponse> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'anthropicApiKey' },
    })

    // Return a masked key for display purposes — never expose the full key
    const rawKey = setting?.value ?? null
    const maskedKey =
      rawKey && rawKey.length > 8
        ? `${rawKey.slice(0, 4)}${'*'.repeat(rawKey.length - 8)}${rawKey.slice(-4)}`
        : rawKey
        ? '********'
        : null

    return NextResponse.json({
      anthropicApiKey: maskedKey,
      hasKey: rawKey !== null,
    })
  } catch (err) {
    console.error('Settings GET error:', err)
    return NextResponse.json(
      { error: `Failed to fetch settings: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { anthropicApiKey?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { anthropicApiKey } = body

  if (!anthropicApiKey || typeof anthropicApiKey !== 'string' || anthropicApiKey.trim() === '') {
    return NextResponse.json(
      { error: 'Missing required field: anthropicApiKey' },
      { status: 400 }
    )
  }

  const trimmedKey = anthropicApiKey.trim()

  // Basic format validation — Anthropic keys start with "sk-ant-"
  if (!trimmedKey.startsWith('sk-ant-') && !trimmedKey.startsWith('sk-')) {
    return NextResponse.json(
      { error: 'Invalid API key format. Anthropic API keys start with "sk-ant-".' },
      { status: 400 }
    )
  }

  try {
    await prisma.setting.upsert({
      where: { key: 'anthropicApiKey' },
      update: { value: trimmedKey },
      create: { key: 'anthropicApiKey', value: trimmedKey },
    })

    return NextResponse.json({ saved: true })
  } catch (err) {
    console.error('Settings POST error:', err)
    return NextResponse.json(
      { error: `Failed to save settings: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
