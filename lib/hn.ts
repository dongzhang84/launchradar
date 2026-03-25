export interface HNStory {
  externalId: string   // HN item id as string
  title: string
  body: string         // "text" field, HTML-stripped, or "" if null
  author: string       // "by" field
  score: number
  commentCount: number // "descendants" field, default 0
  url: string          // "https://news.ycombinator.com/item?id={id}"
  postedAt: Date       // from "time" field (unix timestamp * 1000)
}

interface HNItem {
  id: number
  type: string
  title?: string
  text?: string
  by?: string
  score?: number
  descendants?: number
  time?: number
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchItem(id: number): Promise<HNItem | null> {
  try {
    const response = await fetch(
      `https://hacker-news.firebaseio.com/v0/item/${id}.json`
    )
    if (!response.ok) return null
    return await response.json() as HNItem
  } catch {
    return null
  }
}

const BATCH_SIZE = 10

export async function fetchHNStories(limit: number = 100): Promise<HNStory[]> {
  let ids: number[]
  try {
    const response = await fetch(
      'https://hacker-news.firebaseio.com/v0/newstories.json'
    )
    if (!response.ok) {
      console.error(`[hn] Failed to fetch story IDs: ${response.status}`)
      return []
    }
    ids = await response.json() as number[]
  } catch {
    console.error('[hn] Network error fetching story IDs')
    return []
  }

  const targetIds = ids.slice(0, limit)
  const items: (HNItem | null)[] = []

  for (let i = 0; i < targetIds.length; i += BATCH_SIZE) {
    const batch = targetIds.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(batch.map(fetchItem))
    items.push(...results)
  }

  const cutoff = Date.now() / 1000 - 72 * 60 * 60

  return items
    .filter((item): item is HNItem =>
      item !== null &&
      item.type === 'story' &&
      (item.score ?? 0) >= 3 &&
      (item.time ?? 0) >= cutoff &&
      Boolean(item.title)
    )
    .map((item) => ({
      externalId: String(item.id),
      title: item.title!,
      body: item.text ? stripHtml(item.text) : '',
      author: item.by ?? '',
      score: item.score ?? 0,
      commentCount: item.descendants ?? 0,
      url: `https://news.ycombinator.com/item?id=${item.id}`,
      postedAt: new Date(item.time! * 1000),
    }))
}
