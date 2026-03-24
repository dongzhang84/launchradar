import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateKeywordsAndSubreddits(
  productDescription: string
): Promise<{ keywords: string[]; subreddits: string[] }> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: `You are helping an indie hacker find their first customers on Reddit and Hacker News.

Product: ${productDescription}

Based on this product, infer who the target customer is and generate:
1. 12-15 keywords/phrases that potential customers use when describing their PROBLEM
   (NOT solution keywords — focus on pain, frustration, struggle)
   Include phrases like: 'struggling with...', 'how do I...', 'overwhelmed by...', 'can't figure out...'

2. 8-10 subreddit names (without r/) where these customers hang out

Return JSON only: { "keywords": ["..."], "subreddits": ["..."] }`,
      },
    ],
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw) as { keywords?: string[]; subreddits?: string[] }

  return {
    keywords: parsed.keywords ?? [],
    subreddits: parsed.subreddits ?? [],
  }
}
