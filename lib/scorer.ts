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

  return `You are evaluating Reddit posts to find PRODUCT OPPORTUNITY SIGNALS for a founder researching the Christian AI app market (Bible apps, prayer apps, AI faith tools).

Research context: ${productDescription}
Target users: ${targetCustomer}

CRITICAL FRAMING: We are NOT building a pastoral counseling service and we are NOT looking for people to comfort. We are looking for PRODUCT FEEDBACK. The only posts that matter are ones where the author:
(a) explicitly asks for / wishes for an app, tool, or AI product, OR
(b) complains about a specific existing app/tool (Hallow, YouVersion, Bible Chat, Pray.com, Glorify, Magisterium, Logos, Olive Tree, Faithlife, Creed, ChatGPT/Claude when used for spiritual purposes), OR
(c) compares Christian AI tools or recommends one over another, OR
(d) describes a concrete workflow that an app could solve (e.g. "I keep losing track of my Bible reading streak").

Posts that are pure personal struggle (grief, suicidal thoughts, doubt, loneliness, marriage problems, addiction, asking for prayer) WITHOUT any reference to an app/tool/product gap must score BELOW 40. Posts that are pure theology debate, denominational arguments, or political posts must score BELOW 40.

Score each post 0-100:
90-100: Explicit product wish ("I wish there was an app that..."), sharp named complaint about a specific tool, or direct recommendation/comparison request between Christian apps
70-89: Strong indirect product gap — author describes using ChatGPT/Claude for faith with specific friction, OR mentions a workflow that maps to an obvious product opportunity
50-69: Casual mention of an existing product with mild evaluation; AI-in-faith discussion with weak product angle
0-49: Pure spiritual struggle / theology debate / off-topic / political / no product or tool angle

intentLevel: score >= 70 = high, score >= 50 = medium, below 50 = low

For the reasoning field, output ONE LINE in this exact format so it can be parsed later:
[TAG: <tag>] [PAY: yes|no] [CLERGY: yes|no] <one-sentence summary>

<tag> must be ONE of these (use NONE if score < 50):
WISH-product, WISH-feature,
COMPLAINT-pricing, COMPLAINT-accuracy, COMPLAINT-shallow, COMPLAINT-pushy, COMPLAINT-memory, COMPLAINT-theology,
AI-distrust, AI-using, AI-comparison,
NONE

Note: LIFE-* tags are not used. A post about grief or doubt alone is not a product signal — only score it high if the author explicitly ties it to needing an app or tool.

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
