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

  return `You are evaluating Reddit/HN posts to find PRODUCT OPPORTUNITY SIGNALS for a founder researching this space.

Research context: ${productDescription}
Target users: ${targetCustomer}

Score each post 0-100 by signal strength:
90-100: Explicit product wish, sharp complaint about an existing tool, or clear unmet need
70-89: Strong friction / pain point or AI-discourse that maps to a product opportunity
50-69: Tangential background signal, useful for context but not a direct opportunity
0-49: Not a signal (pure theology debate, off-topic, political, etc.)

intentLevel: score >= 70 = high, score >= 50 = medium, below 50 = low

For the reasoning field, output ONE LINE in this exact format so it can be parsed later:
[TAG: <tag>] [PAY: yes|no] [CLERGY: yes|no] <one-sentence summary>

<tag> must be ONE of these (pick the single most relevant; use NONE if not a signal):
WISH-product, WISH-feature,
COMPLAINT-pricing, COMPLAINT-accuracy, COMPLAINT-shallow, COMPLAINT-pushy, COMPLAINT-memory, COMPLAINT-theology,
LIFE-grief, LIFE-addiction, LIFE-marriage, LIFE-discernment, LIFE-doubt, LIFE-loneliness,
AI-distrust, AI-using, AI-comparison,
NONE

PAY = "yes" if author explicitly expresses willingness to pay for a hypothetical solution.
CLERGY = "yes" if author identifies as pastor, priest, deacon, minister, or clergy.

Posts:
${JSON.stringify(postsWithAge)}

Return JSON: { "results": [ { "externalId": "...", "score": 0-100, "intentLevel": "high|medium|low", "reasoning": "[TAG: ...] [PAY: ...] [CLERGY: ...] summary" } ] }`
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

  const batches: PostToScore[][] = []
  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    batches.push(posts.slice(i, i + BATCH_SIZE))
  }

  const batchResults = await Promise.all(
    batches.map(async (batch, idx) => {
      try {
        return await scoreBatch(batch, productDescription, targetCustomer)
      } catch (err) {
        console.error(`[scorer] Batch ${idx + 1} failed:`, err)
        return batch.map((post) => ({
          externalId: post.externalId,
          score: 50,
          intentLevel: 'medium' as const,
          reasoning: 'scoring unavailable',
        }))
      }
    })
  )

  const allResults: ScorerResult[] = batchResults.flat()

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
