import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface ReplyVariation {
  approach: 'helpful' | 'educational' | 'question'
  label: string
  text: string
  pros: string
  cons: string
}

export async function generateReplies(
  post: { title: string; body: string; subreddit: string | null },
  profile: { productDescription: string; targetCustomer: string }
): Promise<ReplyVariation[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: `Generate 3 reply approaches for a founder responding to this Reddit/HN post.

Product: ${profile.productDescription}
Target customer: ${profile.targetCustomer}
Post title: ${post.title}
Post body (first 600 chars): ${post.body.slice(0, 600)}
Subreddit: ${post.subreddit ?? 'Hacker News'}

Approach 1 - helpful: Offer genuine value first, mention the product naturally only if it fits
Approach 2 - educational: Answer the question helpfully with no product mention
Approach 3 - question: Ask a clarifying question to understand their needs better

Rules:
- Sound like a real Reddit comment, not marketing copy
- 2-4 sentences max
- No exclamation points, no emojis, casual tone

Return JSON: { "replies": [ { "approach": "helpful|educational|question", "label": "short label", "text": "the reply", "pros": "one sentence", "cons": "one sentence" } ] }`,
      },
    ],
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw) as { replies?: ReplyVariation[] }
  return parsed.replies ?? []
}
