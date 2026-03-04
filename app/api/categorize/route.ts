import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { categorizeAll } from '@/lib/categorizer'

interface CategorizationState {
  status: 'idle' | 'running'
  done: number
  total: number
}

// In-memory state for progress tracking across requests
const globalState = globalThis as unknown as {
  categorizationState: CategorizationState
}

if (!globalState.categorizationState) {
  globalState.categorizationState = { status: 'idle', done: 0, total: 0 }
}

function getState(): CategorizationState {
  return { ...globalState.categorizationState }
}

function setState(update: Partial<CategorizationState>): void {
  globalState.categorizationState = {
    ...globalState.categorizationState,
    ...update,
  }
}

export async function GET(): Promise<NextResponse> {
  const state = getState()
  return NextResponse.json({
    status: state.status,
    progress: {
      done: state.done,
      total: state.total,
    },
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (getState().status === 'running') {
    return NextResponse.json(
      { error: 'Categorization is already running' },
      { status: 409 }
    )
  }

  let body: { bookmarkIds?: string[]; apiKey?: string } = {}
  try {
    const text = await request.text()
    if (text.trim()) {
      body = JSON.parse(text)
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { bookmarkIds = [], apiKey } = body

  // Save the API key if provided
  if (apiKey && typeof apiKey === 'string' && apiKey.trim() !== '') {
    await prisma.setting.upsert({
      where: { key: 'anthropicApiKey' },
      update: { value: apiKey.trim() },
      create: { key: 'anthropicApiKey', value: apiKey.trim() },
    })
  }

  // Determine total count for the progress indicator
  let total = 0
  try {
    if (bookmarkIds.length > 0) {
      total = bookmarkIds.length
    } else {
      total = await prisma.bookmark.count({
        where: { categories: { none: {} } },
      })
    }
  } catch {
    total = 0
  }

  setState({ status: 'running', done: 0, total })

  // Run categorization in the background (fire and forget)
  void categorizeAll(
    bookmarkIds,
    (done, runTotal) => {
      setState({ done, total: runTotal })
    }
  )
    .then(() => {
      setState({ status: 'idle', done: total, total })
    })
    .catch((err) => {
      console.error('Categorization error:', err)
      setState({ status: 'idle' })
    })

  return NextResponse.json({ status: 'started', total })
}
