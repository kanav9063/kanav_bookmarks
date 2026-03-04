export interface ParsedMedia {
  type: 'photo' | 'video' | 'gif'
  url: string
  thumbnailUrl?: string
}

export interface ParsedBookmark {
  tweetId: string
  text: string
  authorHandle: string
  authorName: string
  tweetCreatedAt: Date | null
  hashtags: string[]
  urls: string[]
  media: ParsedMedia[]
  rawJson: string
}

interface TwitterMediaVariant {
  content_type?: string
  bitrate?: number
  url?: string
}

interface TwitterMediaEntity {
  type?: string
  media_url_https?: string
  media_url?: string
  video_info?: {
    variants?: TwitterMediaVariant[]
  }
}

interface TwitterUrlEntity {
  expanded_url?: string
  url?: string
}

interface TwitterHashtagEntity {
  text?: string
}

interface TwitterEntities {
  hashtags?: TwitterHashtagEntity[]
  urls?: TwitterUrlEntity[]
  media?: TwitterMediaEntity[]
}

interface TwitterUser {
  screen_name?: string
  name?: string
}

interface RawTweet {
  id_str?: string
  id?: string | number
  full_text?: string
  text?: string
  created_at?: string
  user?: TwitterUser
  entities?: TwitterEntities
  extended_entities?: {
    media?: TwitterMediaEntity[]
  }
  [key: string]: unknown
}

function extractTweetId(tweet: RawTweet): string | null {
  const raw = tweet.id_str ?? tweet.id
  if (raw == null) return null
  return String(raw)
}

function extractText(tweet: RawTweet): string {
  return tweet.full_text ?? tweet.text ?? ''
}

function extractAuthorHandle(tweet: RawTweet): string {
  return tweet.user?.screen_name ?? 'unknown'
}

function extractAuthorName(tweet: RawTweet): string {
  return tweet.user?.name ?? 'Unknown'
}

function extractCreatedAt(tweet: RawTweet): Date | null {
  if (!tweet.created_at) return null
  const parsed = new Date(tweet.created_at)
  return isNaN(parsed.getTime()) ? null : parsed
}

function extractHashtags(tweet: RawTweet): string[] {
  const tags = tweet.entities?.hashtags ?? []
  return tags
    .map((h) => h.text ?? '')
    .filter((t) => t.length > 0)
}

function extractUrls(tweet: RawTweet): string[] {
  const urlEntities = tweet.entities?.urls ?? []
  return urlEntities
    .map((u) => u.expanded_url ?? u.url ?? '')
    .filter((u) => u.length > 0)
}

function pickHighestBitrateVariant(variants: TwitterMediaVariant[]): string | null {
  const videoVariants = variants.filter(
    (v) => v.content_type === 'video/mp4' && v.url
  )
  if (videoVariants.length === 0) return null

  const sorted = [...videoVariants].sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))
  return sorted[0].url ?? null
}

function mediaTypeFromString(type: string | undefined): 'photo' | 'video' | 'gif' {
  if (type === 'video') return 'video'
  if (type === 'animated_gif') return 'gif'
  return 'photo'
}

function extractMedia(tweet: RawTweet): ParsedMedia[] {
  const mediaEntities =
    tweet.extended_entities?.media ??
    tweet.entities?.media ??
    []

  return mediaEntities
    .map((m): ParsedMedia | null => {
      const mediaType = mediaTypeFromString(m.type)
      const thumbnailUrl = m.media_url_https ?? m.media_url ?? undefined

      if (mediaType === 'video' || mediaType === 'gif') {
        const variants = m.video_info?.variants ?? []
        const url = pickHighestBitrateVariant(variants) ?? thumbnailUrl ?? ''
        if (!url) return null
        return { type: mediaType, url, thumbnailUrl }
      }

      const url = thumbnailUrl ?? ''
      if (!url) return null
      return { type: 'photo', url, thumbnailUrl }
    })
    .filter((m): m is ParsedMedia => m !== null)
}

function parseSingleTweet(tweet: RawTweet): ParsedBookmark | null {
  const tweetId = extractTweetId(tweet)
  if (!tweetId) return null

  return {
    tweetId,
    text: extractText(tweet),
    authorHandle: extractAuthorHandle(tweet),
    authorName: extractAuthorName(tweet),
    tweetCreatedAt: extractCreatedAt(tweet),
    hashtags: extractHashtags(tweet),
    urls: extractUrls(tweet),
    media: extractMedia(tweet),
    rawJson: JSON.stringify(tweet),
  }
}

function normalizeTweetArray(parsed: unknown): RawTweet[] {
  if (Array.isArray(parsed)) {
    return parsed as RawTweet[]
  }

  if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>

    // twitter-web-exporter wraps in a top-level key
    for (const key of Object.keys(obj)) {
      const val = obj[key]
      if (Array.isArray(val)) {
        return val as RawTweet[]
      }
    }
  }

  return []
}

export function parseBookmarksJson(jsonString: string): ParsedBookmark[] {
  if (!jsonString || jsonString.trim() === '') {
    throw new Error('Empty JSON string provided')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch (err) {
    throw new Error(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`)
  }

  const tweets = normalizeTweetArray(parsed)

  const results: ParsedBookmark[] = []
  for (const tweet of tweets) {
    const bookmark = parseSingleTweet(tweet)
    if (bookmark !== null) {
      results.push(bookmark)
    }
  }

  return results
}
