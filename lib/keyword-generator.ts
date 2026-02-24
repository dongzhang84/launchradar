import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateKeywordsAndSubreddits(
  productDescription: string,
  targetCustomer: string
): Promise<{ keywords: string[]; subreddits: string[] }> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: `You are helping an indie hacker find their first customers on Reddit and Hacker News.

Product: ${productDescription}
Target customer: ${targetCustomer}

Generate:
1. 12-15 keywords/phrases that potential customers use when describing their PROBLEM
   (NOT solution keywords — e.g. 'juggling too many projects' not 'project management software')
   Include frustrated phrases: 'struggling with...', 'how do I...', 'overwhelmed by...'

2. 8-10 subreddit names (without r/) where these customers hang out and ask questions

Return JSON only: { "keywords": ["...", ...], "subreddits": ["...", ...] }`,
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
