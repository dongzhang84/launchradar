export interface RedditPost {
  externalId: string   // "t3_{id}"
  title: string
  body: string         // selftext
  subreddit: string
  author: string
  score: number
  commentCount: number // num_comments
  url: string          // "https://reddit.com" + permalink
  postedAt: Date       // from created_utc (unix timestamp)
}

export async function fetchSubredditPosts(subreddit: string): Promise<RedditPost[]> {
  let response: Response
  try {
    response = await fetch(
      `https://www.reddit.com/r/${subreddit}/new.json?limit=100`,
      { headers: { 'User-Agent': 'LaunchRadar/1.0' } }
    )
  } catch {
    console.error(`[reddit] Network error fetching r/${subreddit}`)
    return []
  }

  if (!response.ok) {
    if (response.status !== 404) {
      console.error(`[reddit] r/${subreddit} returned ${response.status}`)
    }
    return []
  }

  let json: unknown
  try {
    json = await response.json()
  } catch {
    console.error(`[reddit] Failed to parse response for r/${subreddit}`)
    return []
  }

  const listing = json as {
    data: {
      children: Array<{
        data: {
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
        }
      }>
    }
  }

  const cutoff = Date.now() / 1000 - 24 * 60 * 60

  return listing.data.children
    .map((child) => child.data)
    .filter((post) =>
      post.created_utc >= cutoff &&
      !post.stickied &&
      post.selftext.trim() !== '' &&
      post.selftext !== '[removed]' &&
      post.selftext !== '[deleted]'
    )
    .map((post) => ({
      externalId: `t3_${post.id}`,
      title: post.title,
      body: post.selftext,
      subreddit: post.subreddit,
      author: post.author,
      score: post.score,
      commentCount: post.num_comments,
      url: `https://reddit.com${post.permalink}`,
      postedAt: new Date(post.created_utc * 1000),
    }))
}
