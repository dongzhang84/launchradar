import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { fetchSubredditPosts, type RedditPost } from '@/lib/reddit'
import { fetchHNStories, type HNStory } from '@/lib/hn'
import { scorePosts, type PostToScore } from '@/lib/scorer'

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
  const profiles = await prisma.profile.findMany({
    select: { id: true, keywords: true, subreddits: true, productDescription: true, targetCustomer: true },
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

    const postsToScore: PostToScore[] = matched.map((post) => ({
      externalId: post.externalId,
      title: post.title,
      body: post.body,
      subreddit: post.subreddit,
      postedAt: post.postedAt,
      commentCount: post.commentCount,
    }))

    let scored = await scorePosts(
      postsToScore,
      profile.productDescription ?? '',
      profile.targetCustomer ?? ''
    ).catch((err) => {
      console.error(`[cron] Scoring failed for user ${profile.id}:`, err)
      return []
    })

    scored = scored.filter((p) => p.relevanceScore >= 40)
    if (scored.length === 0) continue

    // Re-attach the fields scorer doesn't return (author, url, score, platform)
    const metaMap = new Map(matched.map((p) => [p.externalId, p]))

    try {
      const result = await prisma.opportunity.createMany({
        data: scored.map((p) => {
          const meta = metaMap.get(p.externalId)!
          return {
            userId: profile.id,
            platform: meta.platform,
            externalId: p.externalId,
            url: meta.url,
            title: p.title,
            body: p.body || null,
            subreddit: p.subreddit,
            author: meta.author,
            score: meta.score,
            commentCount: p.commentCount,
            postedAt: p.postedAt,
            relevanceScore: p.relevanceScore,
            intentLevel: p.intentLevel,
            reasoning: p.reasoning,
            suggestedReplies: [],
          }
        }),
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
