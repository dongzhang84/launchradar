import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const BATCH_SIZE = 10

export interface PostToScore {
  externalId: string
  title: string
  body: string
  subreddit: string | null
  postedAt: Date
  commentCount: number
}

export interface ScoredPost extends PostToScore {
  relevanceScore: number
  intentLevel: 'high' | 'medium' | 'low'
  reasoning: string
}

interface ScorerResult {
  externalId: string
  score: number
  intentLevel: 'high' | 'medium' | 'low'
  reasoning: string
}

function buildPrompt(
  posts: PostToScore[],
  productDescription: string,
  targetCustomer: string
): string {
  const now = Date.now()
  const postsWithAge = posts.map((p) => ({
    externalId: p.externalId,
    title: p.title,
    body: p.body,
    subreddit: p.subreddit,
    commentCount: p.commentCount,
    ageHours: Math.round((now - p.postedAt.getTime()) / (1000 * 60 * 60)),
  }))

  return `You are evaluating Reddit/HN posts to find customer acquisition opportunities for a founder.

Product: ${productDescription}
Target customer: ${targetCustomer}

Score each post 0-100:
90-100: Person is explicitly asking for a tool/solution like this product
70-89: Person describes a problem this product directly solves
50-69: Tangentially related, could become a customer
0-49: Not relevant

intentLevel: score >= 70 = high, score >= 50 = medium, below 50 = low

Posts:
${JSON.stringify(postsWithAge)}

Return JSON: { "results": [ { "externalId": "...", "score": 0-100, "intentLevel": "high|medium|low", "reasoning": "one sentence max" } ] }`
}

async function scoreBatch(
  batch: PostToScore[],
  productDescription: string,
  targetCustomer: string
): Promise<ScorerResult[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: buildPrompt(batch, productDescription, targetCustomer),
      },
    ],
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw) as { results?: ScorerResult[] }
  return parsed.results ?? []
}

export async function scorePosts(
  posts: PostToScore[],
  productDescription: string,
  targetCustomer: string
): Promise<ScoredPost[]> {
  if (posts.length === 0) return []

  const allResults: ScorerResult[] = []

  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE)
    try {
      const results = await scoreBatch(batch, productDescription, targetCustomer)
      allResults.push(...results)
    } catch (err) {
      console.error(`[scorer] Batch ${i / BATCH_SIZE + 1} failed:`, err)
      // Fall back to a neutral score so the batch isn't silently dropped
      for (const post of batch) {
        allResults.push({
          externalId: post.externalId,
          score: 50,
          intentLevel: 'medium',
          reasoning: 'scoring unavailable',
        })
      }
    }
  }

  // Join scores back onto original posts by externalId
  const scoreMap = new Map(allResults.map((r) => [r.externalId, r]))

  return posts.flatMap((post) => {
    const result = scoreMap.get(post.externalId)
    if (!result) return []
    return [
      {
        ...post,
        relevanceScore: result.score,
        intentLevel: result.intentLevel,
        reasoning: result.reasoning,
      },
    ]
  })
}
