import { prisma } from '@/lib/db/client'
import { fetchSubredditPosts, type RedditPost } from '@/lib/reddit'
import { fetchHNStories, type HNStory } from '@/lib/hn'
import { scorePosts, type PostToScore } from '@/lib/scorer'
import { generateReplies } from '@/lib/reply-generator'

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
  return keywords.some((kw) => {
    const phrase = kw.toLowerCase()
    if (haystack.includes(phrase)) return true
    const words = phrase.split(/\s+/).filter((w) => w.length > 4)
    return words.some((word) => haystack.includes(word))
  })
}

export async function refreshOpportunitiesForUser(userId: string): Promise<number> {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { keywords: true, subreddits: true, productDescription: true, targetCustomer: true, hnFetchLimit: true },
  })

  if (!profile || profile.keywords.length === 0) {
    console.log(`[refresh] User ${userId} — no keywords, skipping`)
    return 0
  }

  console.log(`[refresh] User ${userId} — keywords: [${profile.keywords.join(', ')}]`)
  console.log(`[refresh] User ${userId} — subreddits: [${profile.subreddits.join(', ')}]`)

  // Fetch Reddit posts for each of the user's subreddits
  const redditPosts: NormalizedPost[] = []
  await Promise.all(
    profile.subreddits.map(async (subreddit) => {
      try {
        const posts = await fetchSubredditPosts(subreddit)
        redditPosts.push(...posts.map(fromReddit))
        console.log(`[refresh] r/${subreddit}: fetched ${posts.length} post(s)`)
      } catch {
        console.error(`[refresh] Failed to fetch r/${subreddit}`)
      }
    })
  )

  // Fetch HN stories
  let hnStories: NormalizedPost[] = []
  try {
    hnStories = (await fetchHNStories(profile.hnFetchLimit)).map(fromHN)
    console.log(`[refresh] HN: fetched ${hnStories.length} story(ies)`)
  } catch {
    console.error('[refresh] Failed to fetch HN stories')
  }

  const candidates = [...redditPosts, ...hnStories]
  const matched = candidates.filter((post) => matchesKeywords(post, profile.keywords))

  console.log(`[refresh] User ${userId} — candidates: ${candidates.length}, matched: ${matched.length}`)

  if (matched.length === 0) return 0

  // Cap at 30 most recent
  const capped = matched
    .sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime())
    .slice(0, 30)

  const postsToScore: PostToScore[] = capped.map((post) => ({
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
    console.error(`[refresh] Scoring failed for user ${userId}:`, err)
    return []
  })

  scored = scored.filter((p) => p.relevanceScore >= 40)
  console.log(`[refresh] User ${userId} — scored (relevance>=40): ${scored.length}`)

  if (scored.length === 0) return 0

  const metaMap = new Map(capped.map((p) => [p.externalId, p]))

  // Generate replies in parallel for high/medium intent posts only
  const repliesMap = new Map<string, object[]>()
  await Promise.all(
    scored
      .filter((p) => p.intentLevel === 'high' || p.intentLevel === 'medium')
      .map(async (p) => {
        const meta = metaMap.get(p.externalId)!
        try {
          const replies = await generateReplies(
            { title: p.title, body: p.body ?? '', subreddit: meta.subreddit },
            { productDescription: profile.productDescription ?? '', targetCustomer: profile.targetCustomer ?? '' }
          )
          repliesMap.set(p.externalId, replies as object[])
        } catch {
          console.error(`[refresh] Failed to generate replies for ${p.externalId}`)
        }
      })
  )

  const result = await prisma.opportunity.createMany({
    data: scored.map((p) => {
      const meta = metaMap.get(p.externalId)!
      return {
        userId,
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
        suggestedReplies: repliesMap.get(p.externalId) ?? [],
      }
    }),
    skipDuplicates: true,
  })

  const duplicates = scored.length - result.count
  console.log(`[refresh] User ${userId} — saved ${result.count} new opportunity(ies) (${duplicates} skipped as duplicates)`)
  return result.count
}
