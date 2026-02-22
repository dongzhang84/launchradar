# LaunchRadar - Implementation Guide

**Status**: 🚧 In Progress  
**Repo**: github.com/[your-username]/launchradar (private)  
**Last Updated**: February 22, 2026

---

## 📊 Project Overview

LaunchRadar finds Reddit & Hacker News discussions where people need your product. It sends indie hackers a daily digest of 3-5 high-intent opportunities with AI-generated reply suggestions. $29/mo.

**Stack**: Next.js 14 + Supabase (Auth + PostgreSQL) + Prisma + OpenAI + Reddit API + HN API + Resend + Stripe + Vercel

---

## 🏗️ Architecture

**Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS, Shadcn/ui  
**Backend**: Next.js API Routes, Supabase Auth, Prisma ORM, Upstash Redis  
**AI**: OpenAI GPT-4o-mini (scoring), GPT-4o (reply generation)  
**Data**: Reddit API (OAuth2), HN Firebase API  
**Services**: Resend (email), Stripe (subscriptions), Vercel Cron  

---

## 📁 Project Structure

```
launchradar/
├── app/
│   ├── api/
│   │   ├── onboarding/route.ts
│   │   ├── opportunities/[id]/reply/route.ts
│   │   ├── feedback/route.ts
│   │   ├── settings/route.ts
│   │   ├── track/replied/route.ts
│   │   ├── cron/
│   │   │   ├── fetch-posts/route.ts
│   │   │   └── send-digests/route.ts
│   │   └── stripe/
│   │       ├── checkout/route.ts
│   │       ├── portal/route.ts
│   │       └── webhook/route.ts
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── callback/route.ts
│   ├── onboarding/page.tsx
│   ├── dashboard/page.tsx
│   ├── settings/page.tsx
│   ├── privacy/page.tsx
│   ├── terms/page.tsx
│   ├── not-found.tsx
│   ├── page.tsx
│   └── layout.tsx
├── components/
│   ├── OnboardingWizard.tsx
│   ├── OpportunityCard.tsx
│   ├── ReplyModal.tsx
│   ├── FeedbackButtons.tsx
│   ├── StatsBar.tsx
│   ├── BuyModal.tsx
│   └── Header.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── admin.ts
│   ├── db/
│   │   └── client.ts
│   ├── reddit.ts
│   ├── hn.ts
│   ├── scorer.ts
│   ├── reply-generator.ts
│   ├── keyword-generator.ts
│   ├── digest.ts
│   └── email-templates/
│       └── digest.tsx
├── prisma/
│   └── schema.prisma
├── middleware.ts
├── vercel.json
└── .env.local
```

---

## 🗄️ Database Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model Profile {
  id                  String    @id
  email               String    @unique

  stripeCustomerId    String?   @unique
  subscriptionStatus  String?   // trialing | active | canceled | past_due
  trialEndsAt         DateTime?
  currentPeriodEnd    DateTime?

  productDescription  String?
  targetCustomer      String?
  onboardingComplete  Boolean   @default(false)

  keywords            String[]  @default([])
  subreddits          String[]  @default([])
  emailEnabled        Boolean   @default(true)
  digestTime          Int       @default(8)

  opportunitiesFound  Int       @default(0)
  repliesMade         Int       @default(0)
  conversions         Int       @default(0)

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  opportunities       Opportunity[]
  feedback            Feedback[]
}

model Opportunity {
  id               String    @id @default(cuid())
  profileId        String
  profile          Profile   @relation(fields: [profileId], references: [id], onDelete: Cascade)

  platform         String
  externalId       String
  url              String
  title            String
  body             String?
  subreddit        String?
  author           String
  commentCount     Int       @default(0)
  score            Int       @default(0)
  postedAt         DateTime

  relevanceScore   Int
  intentLevel      String
  reasoning        String
  suggestedReplies Json

  includedInDigest Boolean   @default(false)
  viewed           Boolean   @default(false)
  replied          Boolean   @default(false)
  repliedAt        DateTime?
  dismissed        Boolean   @default(false)

  createdAt        DateTime  @default(now())
  feedback         Feedback[]

  @@unique([profileId, externalId])
  @@index([profileId, relevanceScore])
  @@index([profileId, createdAt])
}

model Feedback {
  id            String      @id @default(cuid())
  profileId     String
  profile       Profile     @relation(fields: [profileId], references: [id], onDelete: Cascade)
  opportunityId String
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)

  isRelevant    Boolean
  reason        String?

  createdAt     DateTime    @default(now())

  @@unique([profileId, opportunityId])
}
```

---

## 🔑 Environment Variables

```bash
# .env.local

NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres

OPENAI_API_KEY=sk-proj-...

REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER_AGENT=LaunchRadar/1.0 by u/[your-username]

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=digest@launchradar.com

STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

CRON_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

---

## 📋 Build Phases

---

### Phase 1: Foundation ✅ DONE

- GitHub repo ✅
- Next.js 14 initialized ✅
- Dependencies installed ✅
- Supabase project created ✅
- Prisma schema pushed ✅
- Supabase Auth + login/register pages ✅

---

### Phase 2: Supabase Clients + Prisma Singleton + Route Protection

**Goal**: Proper Supabase client setup, create Profile on register, protect routes.

**CC Prompt 2A — Supabase clients + Prisma singleton:**

```
I'm building LaunchRadar with Next.js 14 App Router and Supabase Auth.
I already have @supabase/supabase-js and @supabase/ssr installed.
I have a Prisma schema already set up with a Profile model.

Create these 4 files:

1. lib/supabase/client.ts
   - Browser client using createBrowserClient from @supabase/ssr
   - Uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
   - Export a createClient function

2. lib/supabase/server.ts
   - Server component client using createServerClient from @supabase/ssr
   - Reads cookies from next/headers
   - Export a createServerSupabaseClient function

3. lib/supabase/admin.ts
   - Admin client using createClient from @supabase/supabase-js
   - Uses NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
   - Bypasses RLS
   - Export as named export: supabaseAdmin

4. lib/db/client.ts
   - Prisma client singleton (handles Next.js hot reload in dev)
   - Use the standard global pattern: global.__prisma || new PrismaClient()
   - Export as: export const prisma = ...
```

---

**CC Prompt 2B — Middleware for route protection:**

```
Create middleware.ts in the root of the LaunchRadar project.

It should:
1. Refresh the Supabase session on every request using createServerClient from @supabase/ssr
2. Protect these routes — redirect to /auth/login if no session:
   /dashboard, /onboarding, /settings
3. If user is logged in and visits /auth/login or /auth/register → redirect to /dashboard
4. Public routes (no auth check): /, /auth/login, /auth/register, /auth/callback, /api/*

Export config with matcher that excludes _next/static, _next/image, favicon.ico.
```

---

**CC Prompt 2C — Update register page to create Profile:**

```
Update app/auth/register/page.tsx in LaunchRadar.

After successful supabase.auth.signUp({ email, password }):
1. Create a Profile row in the database using Prisma with:
   - id: the Supabase user.id
   - email: the user's email
   - subscriptionStatus: "trialing"
   - trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
2. Redirect to /onboarding

The Profile model fields relevant here:
  id String @id
  email String @unique
  subscriptionStatus String?
  trialEndsAt DateTime?
  onboardingComplete Boolean @default(false)

Use prisma from lib/db/client.ts.
Do the Profile creation server-side (API route or server action).
Handle errors — if Profile creation fails, still redirect to /onboarding.
```

**Test after Phase 2**: Register → check Supabase Auth dashboard for user + Profile table for matching row. Visit `/dashboard` without logging in → should redirect to `/auth/login`.

---

### Phase 3: Reddit + HN Data Pipeline

**Goal**: Fetch posts from Reddit and HN, store in Opportunity table.

**Before starting**:
- Set up Upstash Redis at console.upstash.com → Create database → copy REST URL + Token → add to `.env.local`
- Set up Reddit API at reddit.com/prefs/apps → Create app → Type: **script** → Name: LaunchRadar → Redirect URI: `http://localhost:3000` → copy client_id + secret → add to `.env.local`

---

**CC Prompt 3A — Reddit client:**

```
Create lib/reddit.ts for LaunchRadar.

This fetches new posts from Reddit subreddits using the official Reddit API
with Client Credentials flow (no user login, just reading public posts).

Install if needed: @upstash/redis

Export these two functions:

1. getRedditAccessToken(): Promise<string>
   - POST to https://www.reddit.com/api/v1/access_token
   - Use basic auth with REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET
   - Body: grant_type=client_credentials
   - Cache the token in Upstash Redis with key "reddit_access_token" and 55 minute TTL
   - If cached token exists, return it without calling the API again
   - Upstash credentials: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN

2. fetchSubredditPosts(subreddit: string, accessToken: string): Promise<RedditPost[]>
   - GET https://oauth.reddit.com/r/{subreddit}/new?limit=100
   - Headers: Authorization: "Bearer {token}", User-Agent: process.env.REDDIT_USER_AGENT
   - Filter out: posts older than 24 hours, stickied posts, posts with empty selftext
   - Return typed array

Export this interface:
interface RedditPost {
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
```

---

**CC Prompt 3B — HN client:**

```
Create lib/hn.ts for LaunchRadar.

This fetches new stories from Hacker News using their public Firebase API.
No auth, no rate limits.

Export:
fetchHNStories(limit: number = 100): Promise<HNStory[]>

Logic:
- GET https://hacker-news.firebaseio.com/v0/newstories.json → array of IDs
- Take the first {limit} IDs
- Batch fetch: 10 items at a time using Promise.all
  GET https://hacker-news.firebaseio.com/v0/item/{id}.json for each
- Filter out: null items (deleted), type !== "story", score < 3,
  items older than 24 hours, items with no title

Export this interface:
interface HNStory {
  externalId: string   // HN item id as string, e.g. "12345678"
  title: string
  body: string         // "text" field (strip HTML tags) or "" if null
  author: string       // "by" field
  score: number
  commentCount: number // "descendants" field, default 0
  url: string          // "https://news.ycombinator.com/item?id={id}"
  postedAt: Date       // from "time" field (unix timestamp * 1000)
}
```

---

**CC Prompt 3C — Cron: fetch-posts (with placeholder scorer):**

```
Create app/api/cron/fetch-posts/route.ts for LaunchRadar.

This runs every 30 minutes triggered by Vercel Cron.

Logic:
1. Verify: check Authorization header equals "Bearer " + process.env.CRON_SECRET
   Return 401 if wrong.

2. Get all Profiles from DB using Prisma (select id, keywords, subreddits fields only).

3. Collect all unique subreddits across all profiles.

4. Fetch posts from each subreddit using getRedditAccessToken() and fetchSubredditPosts()
   from lib/reddit.ts. Wrap each in try/catch so one failure doesn't stop others.

5. Fetch HN stories using fetchHNStories(150) from lib/hn.ts.

6. For each profile:
   a. Filter posts where title or body contains any of the profile's keywords
      (case-insensitive, partial match is fine)
   b. For now, save each matching post to Opportunity table using Prisma createMany
      with skipDuplicates: true (@@unique([profileId, externalId]) handles deduplication)
   c. Use placeholder scoring: relevanceScore: 50, intentLevel: "medium", 
      reasoning: "pending scoring", suggestedReplies: []

7. Return Response with JSON: { success: true, profilesProcessed: N, opportunitiesSaved: N }

Use prisma from lib/db/client.ts.
Log errors to console.
```

**Test after Phase 3**: Generate CRON_SECRET with `openssl rand -base64 32`, add to `.env.local`. Then manually call: `curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/fetch-posts`. Check Supabase table for saved Opportunity rows.

---

### Phase 4: AI Scoring

**Goal**: Replace placeholder scorer with real GPT-4o-mini scoring.

---

**CC Prompt 4 — AI scorer + wire into cron:**

```
Create lib/scorer.ts for LaunchRadar and update the fetch-posts cron to use it.

Install if needed: openai

lib/scorer.ts — export:
scorePosts(
  posts: PostToScore[],
  productDescription: string,
  targetCustomer: string
): Promise<ScoredPost[]>

Interfaces:
interface PostToScore {
  externalId: string
  title: string
  body: string
  subreddit: string | null
  postedAt: Date
  commentCount: number
}

interface ScoredPost extends PostToScore {
  relevanceScore: number
  intentLevel: "high" | "medium" | "low"
  reasoning: string
}

Implementation:
- Use openai package, model: gpt-4o-mini
- Process posts in batches of 20
- Use response_format: { type: "json_object" }
- Calculate ageHours for each post

Use this exact prompt:
"You are evaluating Reddit/HN posts to find customer acquisition opportunities for a founder.

Product: {productDescription}
Target customer: {targetCustomer}

Score each post 0-100:
90-100: Person is explicitly asking for a tool/solution like this product
70-89: Person describes a problem this product directly solves
50-69: Tangentially related, could become a customer
0-49: Not relevant

intentLevel: score >= 70 = high, score >= 50 = medium, below 50 = low

Posts:
{JSON.stringify(posts.map(p => ({ externalId: p.externalId, title: p.title, body: p.body?.slice(0,500), subreddit: p.subreddit, ageHours, commentCount: p.commentCount })))}

Return JSON: { \"results\": [ { \"externalId\": \"...\", \"score\": 0-100, \"intentLevel\": \"high|medium|low\", \"reasoning\": \"one sentence max\" } ] }"

Also update app/api/cron/fetch-posts/route.ts:
- After filtering posts for a profile, call scorePosts() before saving
- Only save posts with relevanceScore >= 40 (filter noise early)
- Save the real score, intentLevel, and reasoning to each Opportunity row
```

---

### Phase 5: Onboarding Flow

**Goal**: New users describe their product and get AI-generated keywords in 10 minutes.

---

**CC Prompt 5A — Keyword generator:**

```
Create lib/keyword-generator.ts for LaunchRadar.

Export:
generateKeywordsAndSubreddits(
  productDescription: string,
  targetCustomer: string
): Promise<{ keywords: string[], subreddits: string[] }>

Use OpenAI gpt-4o with response_format: { type: "json_object" }

Use this prompt:
"You are helping an indie hacker find their first customers on Reddit and Hacker News.

Product: {productDescription}
Target customer: {targetCustomer}

Generate:
1. 12-15 keywords/phrases that potential customers use when describing their PROBLEM
   (NOT solution keywords — e.g. 'juggling too many projects' not 'project management software')
   Include frustrated phrases: 'struggling with...', 'how do I...', 'overwhelmed by...'

2. 8-10 subreddit names (without r/) where these customers hang out and ask questions

Return JSON only: { \"keywords\": [\"...\", ...], \"subreddits\": [\"...\", ...] }"
```

---

**CC Prompt 5B — Onboarding API route:**

```
Create app/api/onboarding/route.ts for LaunchRadar (POST handler).

The request body has a "step" field:

If step === "generate-keywords":
  Body also has: { productDescription: string, targetCustomer: string }
  - Get current user from Supabase session
  - Call generateKeywordsAndSubreddits() from lib/keyword-generator.ts
  - Return: { keywords: string[], subreddits: string[] }

If step === "save":
  Body also has: { productDescription, targetCustomer, keywords: string[], subreddits: string[] }
  - Get current user from Supabase session
  - Update Profile in DB via Prisma:
    productDescription, targetCustomer, keywords, subreddits, onboardingComplete: true
  - Return: { success: true }

Get user session using createServerClient from @supabase/ssr and cookies from next/headers.
```

---

**CC Prompt 5C — Onboarding page (3-step wizard):**

```
Create app/onboarding/page.tsx for LaunchRadar.

This is a client component ("use client") with a 3-step wizard.

State: currentStep (1|2|3), productDescription, targetCustomer,
       keywords (string[]), subreddits (string[]), loading (boolean)

Step 1 — "What does your product do?"
  - Textarea for productDescription
  - Placeholder: "I built a tool that helps indie hackers find their first customers on Reddit by..."
  - Character counter
  - [Next →] button, disabled if empty

Step 2 — "Who is your target customer?"
  - Textarea for targetCustomer
  - Placeholder: "Indie hackers and solo founders who just launched a product and need their first 10 customers"
  - [← Back] and [Generate Keywords →] buttons
  - On [Generate Keywords →]: set loading=true, POST /api/onboarding {step: "generate-keywords", productDescription, targetCustomer}
    Set keywords + subreddits from response. Move to step 3.
  - Show spinner while loading.

Step 3 — "Review your monitoring setup"
  - Section "Keywords": each keyword as a removable badge (× to remove)
    Text input below to add custom keywords (press Enter)
  - Section "Subreddits": same pattern, show with "r/" prefix in UI
  - [← Back] and [Start Monitoring →] buttons
  - On [Start Monitoring →]: POST /api/onboarding {step: "save", productDescription, targetCustomer, keywords, subreddits}
    On success: window.location.href = "/dashboard"

Progress indicator at top: "Step 1 of 3" etc.
Use Shadcn: Card, Button, Textarea, Badge, Input.
```

---

### Phase 6: Daily Digest Email

**Goal**: Users receive a curated email every morning with 3-5 opportunities.

**Before starting**: Set up Resend at resend.com → create account → get API key → add to `.env.local`.

---

**CC Prompt 6A — Reply generator:**

```
Create lib/reply-generator.ts for LaunchRadar.

Export:
generateReplies(
  post: { title: string, body: string, subreddit: string | null },
  profile: { productDescription: string, targetCustomer: string }
): Promise<ReplyVariation[]>

interface ReplyVariation {
  approach: "helpful" | "educational" | "question"
  label: string
  text: string
  pros: string
  cons: string
}

Use gpt-4o with response_format: { type: "json_object" }

Use this prompt:
"Generate 3 reply approaches for a founder responding to this Reddit/HN post.

Product: {productDescription}
Target customer: {targetCustomer}
Post title: {title}
Post body (first 600 chars): {body}
Subreddit: {subreddit || 'Hacker News'}

Approach 1 - helpful: Offer genuine value first, mention the product naturally only if it fits
Approach 2 - educational: Answer the question helpfully with no product mention (build rapport)
Approach 3 - question: Ask a clarifying question to understand their needs better

Rules for all replies:
- Sound like a real Reddit comment, not marketing copy
- 2-4 sentences max
- No exclamation points, no emojis, casual tone
- Never start with 'Great question!'

Return JSON: { \"replies\": [ { \"approach\": \"helpful|educational|question\", \"label\": \"short label\", \"text\": \"the reply\", \"pros\": \"one sentence\", \"cons\": \"one sentence\" } ] }"
```

---

**CC Prompt 6B — Digest email template:**

```
Create lib/email-templates/digest.tsx for LaunchRadar using React Email.
I have react-email and @react-email/components installed.

Props interface:
interface DigestEmailProps {
  opportunities: Array<{
    id: string
    title: string
    subreddit: string | null
    platform: "reddit" | "hackernews"
    url: string
    intentLevel: "high" | "medium" | "low"
    reasoning: string
    postedAt: Date
    commentCount: number
    firstReplyText: string
  }>
  stats: {
    opportunitiesFound: number
    repliesMade: number
    conversions: number
  }
  baseUrl: string
}

Design — clean, minimal, Gmail-compatible:
- Header: "LaunchRadar" in dark text, thin gray border below
- For each opportunity:
  - Intent line: "🔥🔥🔥 HIGH INTENT" or "🔥🔥 MEDIUM INTENT"
  - Title as bold link to the Reddit/HN URL
  - Source: "r/{subreddit}" or "Hacker News" · {N} hours ago · {N} comments
  - "Why relevant:" + reasoning in gray italic
  - Gray box with firstReplyText truncated at 200 chars
  - Two links: "View Thread →" and "Mark as Replied ✓"
    Mark as Replied links to: {baseUrl}/api/track/replied?id={opportunity.id}
  - Divider between opportunities
- Footer: stats + "Manage email preferences" link to {baseUrl}/settings

Export default DigestEmail component.
```

---

**CC Prompt 6C — Digest logic + send-digests cron:**

```
Create two files for LaunchRadar:

1. lib/digest.ts
Export: sendDailyDigest(profileId: string): Promise<{ sent: boolean, count: number }>

Logic:
- Query Opportunity table for this profile where:
  relevanceScore > 70 AND dismissed = false AND includedInDigest = false
  AND postedAt > new Date(Date.now() - 12 * 60 * 60 * 1000)
  ORDER BY intentLevel (high first), then relevanceScore DESC
  LIMIT 5
- If 0 opportunities: return { sent: false, count: 0 }
- For each opportunity: call generateReplies() from lib/reply-generator.ts
  Update Opportunity.suggestedReplies in DB
- Get profile email from DB
- Send via Resend:
  from: process.env.RESEND_FROM_EMAIL
  to: profile email
  subject: "🎯 {N} opportunit{y/ies} to find customers today"
  react: <DigestEmail opportunities={...} stats={...} baseUrl={process.env.NEXTAUTH_URL} />
- Mark all included opportunities: includedInDigest = true
- Increment profile.opportunitiesFound += N
- Return { sent: true, count: N }

2. app/api/cron/send-digests/route.ts
- Verify Authorization header = "Bearer " + process.env.CRON_SECRET → 401 if wrong
- Get all profiles where:
  emailEnabled = true AND subscriptionStatus IN ("active", "trialing")
  AND (trialEndsAt IS NULL OR trialEndsAt > now())
- Run sendDailyDigest(profile.id) for each using Promise.allSettled
- Return { success: true, sent: N, skipped: M, failed: F }

Use Resend package and Prisma from lib/db/client.ts.
```

**Test after Phase 6**: Manually call `curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/send-digests`. Check your inbox.

---

### Phase 7: Dashboard

**Goal**: Users can see opportunities and generate replies.

---

**CC Prompt 7A — Dashboard page + opportunity cards:**

```
Create the dashboard for LaunchRadar.

1. app/dashboard/page.tsx (server component)
- Get Supabase session. If no user: redirect to /auth/login.
- Fetch Profile from DB (stats, subscriptionStatus, trialEndsAt, onboardingComplete)
- If !onboardingComplete: redirect to /onboarding
- Fetch Opportunities: ORDER BY createdAt DESC, LIMIT 50
- Pass data to client components
- Banners (shown above content):
  If subscriptionStatus = "trialing":
    Yellow banner: "Free trial — {X} days remaining · [Upgrade Now]"
  If trial expired and status != "active":
    Red banner: "Your trial has ended · [Upgrade Now]"
  If URL has ?upgraded=true query param:
    Green banner: "🎉 Welcome to LaunchRadar Pro!"

2. components/StatsBar.tsx
- Three stats: "Found: {N}" | "Replied: {N}" | "Won: {N}"

3. components/OpportunityCard.tsx (client component)
Props: opportunity + onReplied callback + onDismissed callback

Shows:
- Intent badge: "🔥🔥🔥 HIGH" (red) | "🔥🔥 MEDIUM" (orange) | "🔥 LOW" (yellow)
- "r/{subreddit}" or "Hacker News" · {N} hours ago · {N} comments
- Title (2-line clamp)
- "Why relevant: {reasoning}" in gray
- Three buttons:
  [View + Reply] → opens ReplyModal
  [Replied ✓] → POST /api/opportunities/{id}/reply → calls onReplied → button turns green
  [Skip ✗] → inline dropdown with reasons:
    "Wrong audience" | "Too broad" | "Too many comments" | "Job posting" | "Other"
    On select: POST /api/feedback {opportunityId, isRelevant: false, reason}
    Then calls onDismissed → card fades out with animation

Filter tabs above cards: All | High | Medium | Low (client-side filter, no refetch)
Empty state: "No opportunities yet. Your first digest arrives tomorrow morning."

Use Shadcn: Card, Badge, Button, DropdownMenu.
```

---

**CC Prompt 7B — Reply modal:**

```
Create components/ReplyModal.tsx for LaunchRadar.

Props:
- opportunity: { id, title, body, url, subreddit, platform, suggestedReplies: ReplyVariation[] }
- isOpen: boolean
- onClose: () => void
- onReplied: () => void

ReplyVariation: { approach: string, label: string, text: string, pros: string, cons: string }

Modal layout using Shadcn Dialog:

Section 1 — Post context:
- Title in bold
- Body text in gray (max 5 lines, "Show more" toggle if longer)
- "Open original thread →" link (opens new tab)

Section 2 — Choose approach:
- 3 radio options (one per approach, show label)
- Below selected: "✓ {pros}" and "⚠ {cons}" in small gray text

Section 3 — Your reply:
- Textarea pre-filled with selected approach's text, user can edit
- Character count below (e.g. "143 chars")

Buttons at bottom:
- [Copy Reply] → copies to clipboard → changes to "Copied! ✓" for 2 seconds
- [Open Reddit / HN] → window.open(opportunity.url, '_blank')
- [Mark as Replied] → POST /api/opportunities/{id}/reply → close modal → call onReplied()
```

---

**CC Prompt 7C — API routes for dashboard actions:**

```
Create three API routes for LaunchRadar:

1. app/api/opportunities/[id]/reply/route.ts (POST)
- Get user from Supabase session
- Verify opportunity belongs to this user's profile
- Update: Opportunity.replied = true, Opportunity.repliedAt = new Date()
- Increment Profile.repliesMade by 1
- Return: { success: true }

2. app/api/feedback/route.ts (POST)
- Body: { opportunityId: string, isRelevant: boolean, reason?: string }
- Get user from Supabase session
- Verify opportunity belongs to this user
- Upsert Feedback row
- If isRelevant === false: also set Opportunity.dismissed = true
- Return: { success: true }

3. app/api/track/replied/route.ts (GET)
- Query param: id (opportunityId)
- This is the email link — no auth needed
- Update Opportunity.replied = true
- Redirect to /dashboard
```

---

### Phase 8: Stripe Payments

**Goal**: $29/mo subscription, same pattern as ai-video-assistant.

**Before starting**: dashboard.stripe.com → Products → Add product → Name: "LaunchRadar Pro" → Price: $29/mo recurring → copy Price ID to `.env.local`.

---

**CC Prompt 8A — Stripe checkout + webhook:**

```
Add Stripe subscription payment to LaunchRadar.
I have the stripe npm package installed.

Create app/api/stripe/checkout/route.ts (POST):
- Get user from Supabase session + Profile from DB
- Create Stripe Checkout Session:
  mode: "subscription"
  line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }]
  If profile.stripeCustomerId exists: customer: profile.stripeCustomerId
  Else: customer_email: profile.email
  success_url: process.env.NEXTAUTH_URL + "/dashboard?upgraded=true"
  cancel_url: process.env.NEXTAUTH_URL + "/dashboard"
  metadata: { profileId: profile.id }
- Return: { url: session.url }

Create app/api/stripe/webhook/route.ts (POST):
- Get raw body using request.text() — NOT request.json() (required for signature verification)
- Verify Stripe signature using STRIPE_WEBHOOK_SECRET
- Handle:

  checkout.session.completed:
  → Find Profile by metadata.profileId
  → Update: stripeCustomerId = session.customer

  customer.subscription.updated:
  → Find Profile by stripeCustomerId
  → Update: subscriptionStatus = subscription.status,
    currentPeriodEnd = new Date(subscription.current_period_end * 1000)

  customer.subscription.deleted:
  → Find Profile by stripeCustomerId
  → Update: subscriptionStatus = "canceled"

- Return 200 for all handled events.

Use prisma from lib/db/client.ts.
```

---

**CC Prompt 8B — Buy modal + upgrade banners:**

```
Add payment UI to LaunchRadar.

1. Create components/BuyModal.tsx (client component)
Props: isOpen, onClose

Content:
- Title: "LaunchRadar Pro"
- Price: "$29 / month"
- Features:
  ✓ Daily digest of 3-5 high-intent opportunities
  ✓ AI-powered relevance filtering
  ✓ 3 reply suggestions per opportunity
  ✓ Reddit + Hacker News monitoring
  ✓ Cancel anytime
- [Start Subscription] button:
  POST /api/stripe/checkout → get { url } → window.location.href = url
  Show loading spinner while waiting.
- [Maybe later] text link → onClose()

2. Update app/dashboard/page.tsx:
- Import BuyModal, wire up [Upgrade Now] buttons in the trial/expired banners to open it
- Days remaining calculation: Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000)

Use Shadcn Dialog.
```

---

### Phase 9: Settings + Polish

---

**CC Prompt 9A — Settings page:**

```
Create app/settings/page.tsx for LaunchRadar.

Fetch current profile data server-side. Pass to client form sections.

4 sections:

1. Product Info
- Textarea: productDescription (pre-filled, editable)
- Textarea: targetCustomer (pre-filled, editable)
- [Re-generate Keywords] → POST /api/onboarding {step: "generate-keywords", ...}
  → update keywords/subreddits sections without page reload
- [Save] → PATCH /api/settings {productDescription, targetCustomer}

2. Keywords & Subreddits
- Keywords as removable tags (× to remove each)
- Text input to add new keyword (press Enter)
- Same for subreddits (show "r/" prefix in UI)
- [Save Changes] → PATCH /api/settings {keywords, subreddits}

3. Email Preferences
- Toggle: "Daily digest emails" (emailEnabled)
- Select time: "6 AM UTC" | "8 AM UTC" | "12 PM UTC" | "6 PM UTC" (maps to digestTime: 6|8|12|18)
- [Save] → PATCH /api/settings {emailEnabled, digestTime}

4. Subscription
- Status badge: "Active" (green) | "Trial (X days left)" (yellow) | "Canceled" (red)
- If active: "Renews {currentPeriodEnd}"
- [Manage Subscription] → POST /api/stripe/portal → redirect to Stripe portal
- [Upgrade] if trialing/canceled → opens BuyModal

Create app/api/stripe/portal/route.ts (POST):
- Get user + profile from Supabase session
- Create Stripe billing portal session:
  customer: profile.stripeCustomerId
  return_url: process.env.NEXTAUTH_URL + "/settings"
- Return: { url: portalSession.url }

Create app/api/settings/route.ts (PATCH):
- Get user from Supabase session
- Accept any subset of: { productDescription, targetCustomer, keywords,
  subreddits, emailEnabled, digestTime }
- Update Profile in DB
- Return: { success: true }
```

---

**CC Prompt 9B — Final polish + landing page:**

```
Final polish for LaunchRadar before launch.

1. Create vercel.json in project root:
{
  "crons": [
    { "path": "/api/cron/fetch-posts", "schedule": "*/30 * * * *" },
    { "path": "/api/cron/send-digests", "schedule": "0 8 * * *" }
  ]
}

2. Update app/layout.tsx:
title: "LaunchRadar — Find your first customers on Reddit & HN"
description: "Stop scrolling Reddit for hours. Get a daily digest of 3-5 discussions where people need your product."
Add og:title, og:description, og:type="website"

3. Create app/not-found.tsx:
Simple 404 page with "Page not found" and link to /dashboard.

4. Create app/privacy/page.tsx and app/terms/page.tsx:
Placeholder text pages. Link both in landing page footer.

5. Build app/page.tsx (landing page):
Server component — if user already logged in, redirect to /dashboard.

Content:
- Hero:
  H1: "Stop scrolling Reddit for hours. Find customers in 15 minutes."
  Subheading: "LaunchRadar monitors Reddit & HN and sends you 3-5 high-intent leads daily — with suggested replies."
  CTA: [Start Free Trial →] → /auth/register
  Note: "7-day free trial · No credit card required"

- How it works (3 steps):
  1. Describe your product (2 min setup)
  2. AI monitors Reddit + HN (fully automated)
  3. Get a daily digest of who to talk to

- Pricing:
  $29 / month
  7-day free trial · Cancel anytime
  [Start Free Trial →]

- FAQ:
  Q: How is this different from F5Bot?
  A: F5Bot sends 100+ alerts per day. LaunchRadar uses AI to filter down to 3-5 high-intent discussions.
  Q: Will I get banned from Reddit?
  A: No. We find threads for you — you reply manually in your own voice.
  Q: What products work best?
  A: B2B SaaS, tools, and services for indie hackers and developers.

- Footer: Privacy · Terms · Made by [your name]
```

---

### Phase 10: Launch Prep

```
□ Run: openssl rand -base64 32 → add result to .env.local as CRON_SECRET
□ npm run build — fix all TypeScript errors before deploying
□ Switch Stripe to live mode in dashboard.stripe.com
□ Add all .env.local vars to Vercel dashboard
□ Set Vercel build command: npx prisma generate && next build
□ Deploy and do full end-to-end test on production URL:
    Register → onboarding → manually curl fetch-posts → manually curl send-digests
    → verify email arrives → test Stripe payment
□ Verify cron jobs: Vercel dashboard → Functions → Cron
□ Record Loom demo (90 seconds):
    0-30s: onboarding wizard
    30-60s: digest email
    60-90s: dashboard + reply modal
□ Write Product Hunt page
□ Write Indie Hackers "Show IH" post
□ Write r/SideProject post (personal story angle)
□ Ask 5 beta users to upvote on launch day
```

---

## 🚀 Deployment

**Build command**: `npx prisma generate && next build`

**vercel.json** (create in root):
```json
{
  "crons": [
    { "path": "/api/cron/fetch-posts", "schedule": "*/30 * * * *" },
    { "path": "/api/cron/send-digests", "schedule": "0 8 * * *" }
  ]
}
```

**Cron security** — all cron routes check:
```typescript
if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response("Unauthorized", { status: 401 });
}
```

---

## 💰 Cost Summary

| Service | Free Tier | Upgrade When |
|---------|-----------|--------------|
| Vercel | Hobby (crons included) | ~500 users |
| Supabase | 500MB, 50K MAU | $25/mo at scale |
| Upstash Redis | 10K req/day | $10/mo at ~200 users |
| Resend | 3K emails/mo | $20/mo at ~100 users |
| OpenAI | Pay per use | ~$25/mo at 100 users |
| Stripe | 2.9% + $0.30/tx | No fixed cost |

**Break-even: 7 paying users**

---

## 🐛 Known Gotchas

**Supabase**: Use `createBrowserClient` from `@supabase/ssr` in client components. Use `supabaseAdmin` with service role key in API routes (bypasses RLS).

**Reddit API**: Token expires 1hr → cache in Upstash Redis with 55min TTL. Use `oauth.reddit.com` after auth (not `www.reddit.com`). User-Agent header required or you get 429s.

**HN API**: Only fetch newest 100-200 IDs. Items can return null (deleted) → handle gracefully.

**OpenAI**: Always include the word "json" in prompt when using `response_format: { type: "json_object" }`. GPT-4o-mini for scoring, GPT-4o for reply generation.

**Prisma on Vercel**: `DATABASE_URL` needs `?pgbouncer=true&connection_limit=1`. Build command must include `npx prisma generate`.

**Stripe webhook**: Use `request.text()` not `request.json()` before signature verification.

---

## 🔄 Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-17 | 1.0 | Initial guide |
| 2026-02-22 | 1.1 | Switched to Supabase Auth. Removed NextAuth. User → Profile. |
| 2026-02-22 | 1.2 | Embedded CC prompts directly into each phase. |
