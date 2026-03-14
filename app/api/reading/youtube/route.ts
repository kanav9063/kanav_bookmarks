import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import OpenAI from 'openai'

// Extract YouTube video ID from various URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// Fetch YouTube video metadata using oEmbed (no API key needed)
async function fetchVideoMeta(videoId: string) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    const res = await fetch(oembedUrl)
    if (!res.ok) return null
    const data = await res.json()
    return {
      title: data.title,
      channelName: data.author_name,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    }
  } catch {
    return null
  }
}

// Generate chapters/summary from transcript using OpenAI
async function generateChapters(transcript: string, title: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || !transcript) return '[]'
  
  try {
    const openai = new OpenAI({ apiKey })
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You extract key sections/chapters from a video transcript. Return a JSON array of objects with: time (approximate timestamp like "02:45"), title (short section heading), summary (1-2 sentence key insight). Extract 5-10 most important sections. Return ONLY valid JSON array.`,
        },
        {
          role: 'user',
          content: `Video title: "${title}"\n\nTranscript:\n${transcript.slice(0, 8000)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })
    const content = response.choices[0]?.message?.content?.trim() || '[]'
    // Clean markdown code blocks if present
    return content.replace(/^```json?\s*/, '').replace(/\s*```$/, '')
  } catch {
    return '[]'
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { url } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const videoId = extractVideoId(url)
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
    }

    // Check if already saved
    const existing = await prisma.videoMeta.findFirst({ where: { videoId } })
    if (existing) {
      return NextResponse.json({ error: 'Video already saved', existingId: existing.readingItemId }, { status: 409 })
    }

    // Fetch video metadata
    const meta = await fetchVideoMeta(videoId)
    if (!meta) {
      return NextResponse.json({ error: 'Could not fetch video metadata' }, { status: 404 })
    }

    // Fetch transcript using a public transcript API
    let transcript = ''
    try {
      // Try youtube-transcript API
      const transcriptRes = await fetch(`https://yt.lemnoslife.com/videos?part=transcript&id=${videoId}`)
      if (transcriptRes.ok) {
        const tData = await transcriptRes.json()
        const items = tData?.items?.[0]?.transcript?.content || []
        transcript = items.map((i: { text: string }) => i.text).join(' ')
      }
    } catch {
      // Transcript unavailable - that's ok
    }

    // Generate chapters if we have transcript
    let chapters = '[]'
    if (transcript.length > 100) {
      chapters = await generateChapters(transcript, meta.title)
    }

    // Create reading item + video meta
    const readingItem = await prisma.readingItem.create({
      data: {
        type: 'video',
        title: meta.title,
        author: meta.channelName,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        description: transcript ? transcript.slice(0, 300) + '...' : null,
        coverImage: meta.thumbnailUrl,
        status: 'want-to-read',
        seen: false,
        videoMeta: {
          create: {
            videoId,
            thumbnailUrl: meta.thumbnailUrl,
            channelName: meta.channelName,
            transcript: transcript || null,
            chapters,
          },
        },
      },
      include: { videoMeta: true },
    })

    return NextResponse.json(readingItem, { status: 201 })
  } catch (e) {
    console.error('YouTube save error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
