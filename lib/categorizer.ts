import Anthropic from '@anthropic-ai/sdk'
import prisma from '@/lib/db'

const BATCH_SIZE = 20

const DEFAULT_CATEGORIES = [
  {
    name: 'Funny Memes',
    slug: 'funny-memes',
    color: '#f59e0b',
    description: 'Memes, humor, jokes, funny content',
    isAiGenerated: false,
  },
  {
    name: 'AI Resources',
    slug: 'ai-resources',
    color: '#8b5cf6',
    description: 'AI tools, machine learning, LLMs, ChatGPT, prompts',
    isAiGenerated: false,
  },
  {
    name: 'Dev Tools',
    slug: 'dev-tools',
    color: '#06b6d4',
    description: 'Programming, coding tools, GitHub, software development',
    isAiGenerated: false,
  },
  {
    name: 'Design',
    slug: 'design',
    color: '#ec4899',
    description: 'UI/UX, design tools, visual design, creative work',
    isAiGenerated: false,
  },
  {
    name: 'Finance & Crypto',
    slug: 'finance-crypto',
    color: '#10b981',
    description: 'Finance, crypto, trading, investing, DeFi',
    isAiGenerated: false,
  },
  {
    name: 'Productivity',
    slug: 'productivity',
    color: '#f97316',
    description: 'Productivity tips, life hacks, time management',
    isAiGenerated: false,
  },
  {
    name: 'News',
    slug: 'news',
    color: '#6366f1',
    description: 'News, current events, threads, essays',
    isAiGenerated: false,
  },
  {
    name: 'General',
    slug: 'general',
    color: '#64748b',
    description: "Other content that doesn't fit above categories",
    isAiGenerated: false,
  },
] as const

const CATEGORY_SLUGS = DEFAULT_CATEGORIES.map((c) => c.slug)

interface CategorizationResult {
  tweetId: string
  categories: string[]
  confidence: number
}

export async function seedDefaultCategories(): Promise<void> {
  const existing = await prisma.category.findMany({
    select: { slug: true },
  })
  const existingSlugs = new Set(existing.map((c) => c.slug))

  const toCreate = DEFAULT_CATEGORIES.filter((c) => !existingSlugs.has(c.slug))

  if (toCreate.length === 0) return

  for (const cat of toCreate) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat },
    })
  }
}

async function getApiKey(overrideKey?: string): Promise<string> {
  if (overrideKey && overrideKey.trim() !== '') {
    return overrideKey.trim()
  }

  const setting = await prisma.setting.findUnique({
    where: { key: 'anthropicApiKey' },
  })

  if (setting?.value && setting.value.trim() !== '') {
    return setting.value.trim()
  }

  const envKey = process.env.ANTHROPIC_API_KEY
  if (envKey && envKey.trim() !== '') {
    return envKey.trim()
  }

  throw new Error(
    'No Anthropic API key found. Provide it via the settings page, ANTHROPIC_API_KEY env var, or the API request.'
  )
}

function buildCategorizationPrompt(
  bookmarks: { tweetId: string; text: string }[]
): string {
  const validSlugs = CATEGORY_SLUGS.join(', ')
  const tweetData = JSON.stringify(
    bookmarks.map((b) => ({ id: b.tweetId, text: b.text }))
  )

  return `Categorize each tweet into 1-2 of these categories: ${validSlugs}.

Return ONLY a JSON array like: [{"tweetId": "123", "categories": ["ai-resources"], "confidence": 0.9}]

Tweets:
${tweetData}`
}

function parseCategorizationResponse(text: string): CategorizationResult[] {
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('No JSON array found in Claude response')
  }

  const parsed = JSON.parse(jsonMatch[0])

  if (!Array.isArray(parsed)) {
    throw new Error('Claude response is not an array')
  }

  return parsed.map((item): CategorizationResult => {
    const tweetId = String(item.tweetId ?? '')
    const categories = Array.isArray(item.categories)
      ? item.categories
          .map((c: unknown) => String(c))
          .filter((c: string) => (CATEGORY_SLUGS as readonly string[]).includes(c))
      : []
    const confidence =
      typeof item.confidence === 'number'
        ? Math.min(1, Math.max(0, item.confidence))
        : 0.8

    return { tweetId, categories, confidence }
  })
}

export async function categorizeBatch(
  bookmarks: { tweetId: string; text: string }[],
  apiKey: string
): Promise<CategorizationResult[]> {
  if (bookmarks.length === 0) return []

  const client = new Anthropic({ apiKey })

  const prompt = buildCategorizationPrompt(bookmarks)

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text content in Claude response')
  }

  return parseCategorizationResponse(textBlock.text)
}

async function writeCategoryResults(results: CategorizationResult[]): Promise<void> {
  if (results.length === 0) return

  const categories = await prisma.category.findMany({
    select: { id: true, slug: true },
  })
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]))

  for (const result of results) {
    if (!result.tweetId || result.categories.length === 0) continue

    const bookmark = await prisma.bookmark.findUnique({
      where: { tweetId: result.tweetId },
      select: { id: true },
    })

    if (!bookmark) continue

    for (const slug of result.categories) {
      const categoryId = categoryBySlug.get(slug)
      if (!categoryId) continue

      await prisma.bookmarkCategory.upsert({
        where: {
          bookmarkId_categoryId: {
            bookmarkId: bookmark.id,
            categoryId,
          },
        },
        update: { confidence: result.confidence },
        create: {
          bookmarkId: bookmark.id,
          categoryId,
          confidence: result.confidence,
        },
      })
    }
  }
}

export async function categorizeAll(
  bookmarkIds: string[],
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  await seedDefaultCategories()

  const apiKey = await getApiKey()

  let bookmarksQuery
  if (bookmarkIds.length > 0) {
    bookmarksQuery = await prisma.bookmark.findMany({
      where: { id: { in: bookmarkIds } },
      select: { id: true, tweetId: true, text: true },
    })
  } else {
    // Load all uncategorized bookmarks
    bookmarksQuery = await prisma.bookmark.findMany({
      where: {
        categories: { none: {} },
      },
      select: { id: true, tweetId: true, text: true },
    })
  }

  const total = bookmarksQuery.length
  let done = 0

  for (let i = 0; i < bookmarksQuery.length; i += BATCH_SIZE) {
    const batch = bookmarksQuery.slice(i, i + BATCH_SIZE).map((b) => ({
      tweetId: b.tweetId,
      text: b.text,
    }))

    try {
      const results = await categorizeBatch(batch, apiKey)
      await writeCategoryResults(results)
    } catch (err) {
      console.error(`Error categorizing batch at index ${i}:`, err)
    }

    done = Math.min(i + BATCH_SIZE, total)
    onProgress?.(done, total)
  }
}
