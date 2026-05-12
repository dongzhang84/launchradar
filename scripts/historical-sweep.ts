// Historical sweep — uses Reddit's search API to pull posts from the last
// month that mention specific product names / wish phrases across the
// monitored subreddits, then scores them with the existing scorer.
//
// Usage: npx tsx scripts/historical-sweep.ts <email> [--time=month|year]
//
// Run this once to backfill historical signals after switching directions.
// The daily cron is enough afterwards.

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const SUBREDDITS = [
  'Christianity', 'Catholicism', 'Reformed', 'TrueChristian',
  'OrthodoxChristianity', 'Christian', 'ChristianApologetics',
  'ChristianMysticism', 'exchristian', 'AcademicBiblical',
  'Bible', 'Prayer',
]

// Search queries kept narrow — these are phrases that strongly suggest a
// product signal. Broader keywords (e.g. plain "Bible") would flood with
// noise and waste LLM calls.
const SEARCH_QUERIES = [
  'Hallow',
  'YouVersion',
  'Bible Chat',
  'Pray.com',
  'Glorify app',
  'Magisterium',
  'Olive Tree',
  'Logos Bible',
  'Bible app',
  'prayer app',
  'Christian app',
  'wish there was an app',
  'recommend an app',
  'looking for an app',
  'ChatGPT Bible',
  'ChatGPT prayer',
  'Christian AI',
  'Catholic AI',
  'AI Bible',
]

interface RedditSearchPost {
  externalId: string
  title: string
  body: string
  subreddit: string
  author: string
  score: number
  commentCount: number
  url: string
  postedAt: Date
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function searchSubreddit(
  sub: string,
  query: string,
  timeRange: string
): Promise<RedditSearchPost[]> {
  const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=top&t=${timeRange}&limit=25`
  let response: Response
  try {
    response = await fetch(url, { headers: { 'User-Agent': 'LaunchRadar/1.0' } })
  } catch {
    return []
  }
  if (!response.ok) return []
  let json: unknown
  try {
    json = await response.json()
  } catch {
    return []
  }
  const listing = json as {
    data?: { children?: Array<{ data: {
      id: string
      title: string
      selftext: string
      subreddit: string
      author: string
      score: number
      num_comments: number
      permalink: string
      created_utc: number
      stickied: boolean
    } }> }
  }
  const children = listing.data?.children ?? []
  return children
    .map((c) => c.data)
    .filter((p) => !p.stickied && p.selftext !== '[removed]' && p.selftext !== '[deleted]')
    .map((p) => ({
      externalId: `t3_${p.id}`,
      title: p.title,
      body: p.selftext ?? '',
      subreddit: p.subreddit,
      author: p.author,
      score: p.score,
      commentCount: p.num_comments,
      url: `https://reddit.com${p.permalink}`,
      postedAt: new Date(p.created_utc * 1000),
    }))
}

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: npx tsx scripts/historical-sweep.ts <email> [--time=month|year]')
    process.exit(1)
  }

  const timeArg = process.argv.find((a) => a.startsWith('--time='))
  const timeRange = timeArg?.split('=')[1] ?? 'month'

  const { prisma } = await import('../lib/db/client')
  const { scorePosts } = await import('../lib/scorer')
  type PostToScore = import('../lib/scorer').PostToScore

  const profile = await prisma.profile.findUnique({ where: { email } })
  if (!profile) {
    console.error(`No profile found for ${email}`)
    process.exit(1)
  }

  console.log(`Historical sweep for ${email} (time=${timeRange})`)
  console.log(`Searching ${SUBREDDITS.length} subreddits × ${SEARCH_QUERIES.length} queries = ${SUBREDDITS.length * SEARCH_QUERIES.length} requests`)

  const allPosts = new Map<string, RedditSearchPost>()
  let reqCount = 0
  for (const sub of SUBREDDITS) {
    for (const query of SEARCH_QUERIES) {
      const posts = await searchSubreddit(sub, query, timeRange)
      for (const p of posts) {
        if (!allPosts.has(p.externalId)) allPosts.set(p.externalId, p)
      }
      reqCount++
      if (reqCount % 10 === 0) {
        console.log(`  ${reqCount} requests done, ${allPosts.size} unique posts so far`)
      }
      await sleep(1100) // ~55 req/min, below Reddit's unauth limit
    }
  }

  console.log(`\nFetched ${allPosts.size} unique posts across all searches.`)

  // Filter out ones already in DB
  const existingIds = await prisma.opportunity.findMany({
    where: { userId: profile.id, externalId: { in: [...allPosts.keys()] } },
    select: { externalId: true },
  })
  const existingSet = new Set(existingIds.map((o) => o.externalId))
  const newPosts = [...allPosts.values()].filter((p) => !existingSet.has(p.externalId))
  console.log(`${newPosts.length} are new (not already saved).`)

  if (newPosts.length === 0) {
    await prisma.$disconnect()
    return
  }

  // Score in batches via the existing scorer (it internally batches by 10)
  const postsToScore: PostToScore[] = newPosts.map((p) => ({
    externalId: p.externalId,
    title: p.title,
    body: p.body,
    subreddit: p.subreddit,
    postedAt: p.postedAt,
    commentCount: p.commentCount,
  }))

  console.log(`\nScoring ${postsToScore.length} posts...`)
  const scored = await scorePosts(
    postsToScore,
    profile.productDescription ?? '',
    profile.targetCustomer ?? ''
  )

  const passing = scored.filter((p) => p.relevanceScore >= 50)
  console.log(`Scored ${scored.length} posts, ${passing.length} passing >=50.`)

  if (passing.length === 0) {
    await prisma.$disconnect()
    return
  }

  const metaMap = new Map(newPosts.map((p) => [p.externalId, p]))
  const result = await prisma.opportunity.createMany({
    data: passing.map((p) => {
      const meta = metaMap.get(p.externalId)!
      return {
        userId: profile.id,
        platform: 'reddit',
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
  console.log(`\nSaved ${result.count} new opportunity(ies) from historical sweep.`)

  // Score distribution summary
  const buckets = {
    '90+': passing.filter((p) => p.relevanceScore >= 90).length,
    '70-89': passing.filter((p) => p.relevanceScore >= 70 && p.relevanceScore < 90).length,
    '50-69': passing.filter((p) => p.relevanceScore >= 50 && p.relevanceScore < 70).length,
  }
  console.log(`  Score distribution: 90+:${buckets['90+']}  70-89:${buckets['70-89']}  50-69:${buckets['50-69']}`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
