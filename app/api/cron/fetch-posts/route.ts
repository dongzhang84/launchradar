import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { fetchSubredditPosts, type RedditPost } from '@/lib/reddit'
import { fetchHNStories, type HNStory } from '@/lib/hn'

// Respected on Vercel Pro/Enterprise; Hobby plan caps at 10s regardless.
export const maxDuration = 60

interface NormalizedPost {
  externalId: string
  title: string
  body: string
  author: string
  score: number
  commentCount: number
  url: string
  postedAt: Date
  platform: string
  subreddit: string | null
}

function fromReddit(post: RedditPost): NormalizedPost {
  return { ...post, platform: 'reddit', subreddit: post.subreddit }
}

function fromHN(story: HNStory): NormalizedPost {
  return { ...story, platform: 'hn', subreddit: null }
}

function matchesKeywords(post: NormalizedPost, keywords: string[]): boolean {
  if (keywords.length === 0) return false
  const haystack = `${post.title} ${post.body}`.toLowerCase()
  return keywords.some((kw) => haystack.includes(kw.toLowerCase()))
}

export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Load all profiles (select only what we need)
  const profiles = await prisma.user.findMany({
    select: { id: true, keywords: true, subreddits: true },
  })

  // 2. Unique subreddits across all profiles
  const uniqueSubreddits = [...new Set(profiles.flatMap((p) => p.subreddits))]

  // 3. Fetch Reddit posts — one subreddit at a time, failures isolated
  const redditBySubreddit = new Map<string, NormalizedPost[]>()
  await Promise.all(
    uniqueSubreddits.map(async (subreddit) => {
      try {
        const posts = await fetchSubredditPosts(subreddit)
        redditBySubreddit.set(subreddit, posts.map(fromReddit))
      } catch {
        console.error(`[cron] Failed to fetch r/${subreddit}`)
        redditBySubreddit.set(subreddit, [])
      }
    })
  )

  // 4. Fetch HN stories
  let hnStories: NormalizedPost[] = []
  try {
    hnStories = (await fetchHNStories(150)).map(fromHN)
  } catch {
    console.error('[cron] Failed to fetch HN stories')
  }

  // 5. Match and save per profile
  let totalOpportunitiesSaved = 0

  for (const profile of profiles) {
    // Reddit: only posts from subreddits this profile tracks
    const profileRedditPosts = profile.subreddits.flatMap(
      (s) => redditBySubreddit.get(s) ?? []
    )
    const candidates = [...profileRedditPosts, ...hnStories]
    const matched = candidates.filter((post) =>
      matchesKeywords(post, profile.keywords)
    )

    if (matched.length === 0) continue

    try {
      const result = await prisma.opportunity.createMany({
        data: matched.map((post) => ({
          userId: profile.id,
          platform: post.platform,
          externalId: post.externalId,
          url: post.url,
          title: post.title,
          body: post.body || null,
          subreddit: post.subreddit,
          author: post.author,
          score: post.score,
          commentCount: post.commentCount,
          postedAt: post.postedAt,
          relevanceScore: 50,
          intentLevel: 'medium',
          reasoning: 'pending',
          suggestedReplies: [],
        })),
        skipDuplicates: true,
      })
      totalOpportunitiesSaved += result.count
    } catch (err) {
      console.error(`[cron] Failed to save opportunities for user ${profile.id}:`, err)
    }
  }

  return NextResponse.json({
    success: true,
    profilesProcessed: profiles.length,
    opportunitiesSaved: totalOpportunitiesSaved,
  })
}
