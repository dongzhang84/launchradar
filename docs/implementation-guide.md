# LaunchRadar - Implementation Guide

**Status**: ✅ Phases 1-9 Complete  
**Live URL**: https://launchradar-five.vercel.app  
**Last Updated**: February 24, 2026

---

## 📊 Project Overview

LaunchRadar finds Reddit & Hacker News discussions where people need your product. It sends indie hackers a daily digest of high-intent opportunities. $19/mo.

**Stack**: Next.js 14 + Supabase (Auth + PostgreSQL) + Prisma + OpenAI + Reddit public API + HN API + Resend + Stripe + Vercel

---

## 🏗️ Architecture

**Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS, Shadcn/ui  
**Backend**: Next.js API Routes, Supabase Auth, Prisma ORM (v7 with @prisma/adapter-pg), Upstash Redis  
**AI**: OpenAI GPT-4o-mini (scoring), GPT-4o (keyword generation)  
**Data**: Reddit public .json API (no auth needed), HN Firebase API  
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
│   │   ├── cron/
│   │   │   ├── fetch-posts/route.ts
│   │   │   └── send-digests/route.ts
│   │   └── stripe/
│   │       ├── checkout/route.ts
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
│   ├── DashboardClient.tsx
│   ├── Header.tsx
│   ├── OpportunityCard.tsx
│   ├── ReplyModal.tsx
│   ├── StatsBar.tsx
│   ├── BuyModal.tsx
│   └── SettingsClient.tsx
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
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Profile {
  id                  String    @id
  email               String    @unique
  name                String?
  password            String?

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

  opportunities       Opportunity[]
  feedback            Feedback[]
}

model Opportunity {
  id               String    @id @default(cuid())
  userId           String
  profile          Profile   @relation(fields: [userId], references: [id], onDelete: Cascade)

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

  @@unique([userId, externalId])
  @@index([userId, relevanceScore])
  @@index([userId, createdAt])
}

model Feedback {
  id            String      @id @default(cuid())
  userId        String
  profile       Profile     @relation(fields: [userId], references: [id], onDelete: Cascade)
  opportunityId String
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)

  isRelevant    Boolean
  reason        String?

  createdAt     DateTime    @default(now())

  @@unique([userId, opportunityId])
}
```

---

## 🔑 Environment Variables

```bash
# .env.local

NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# IMPORTANT: Use the Supabase Transaction Pooler URL (port 6543) for both local and Vercel
# Get this from: Supabase Dashboard → Connect button → Transaction pooler
DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres

OPENAI_API_KEY=sk-proj-...

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev  # use this until you have a verified domain

STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...  # from Stripe Dashboard → Webhooks (leave empty until configured)

CRON_SECRET=  # generate with: openssl rand -base64 32
NEXT_PUBLIC_APP_URL=http://localhost:3000  # https://launchradar-five.vercel.app in production
```

> **Note**: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is NOT needed — we use Stripe-hosted Checkout, not a custom payment form. `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` are NOT needed — we use Reddit's public .json API.

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

### Phase 2: Supabase Clients + Prisma Singleton + Route Protection ✅ DONE

**Goal**: Proper Supabase client setup, create Profile on register, protect routes.

---

**CC Prompt 2A — Supabase clients + Prisma singleton:**

```
I'm building LaunchRadar with Next.js 14 App Router and Supabase Auth.
I already have @supabase/supabase-js and @supabase/ssr installed.
I have a Prisma v7 schema already set up with a Profile model.

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

4. lib/db/client.ts (Prisma v7 with adapter — IMPORTANT)
   - Prisma v7 no longer accepts empty constructor or datasourceUrl option
   - Must use @prisma/adapter-pg and pg packages
   - Install if needed: @prisma/adapter-pg pg @types/pg
   
   Use this exact pattern:
   import { PrismaClient } from '@prisma/client'
   import { PrismaPg } from '@prisma/adapter-pg'
   
   const adapter = new PrismaPg({
     connectionString: process.env.DATABASE_URL!,
     ssl: { rejectUnauthorized: false },
   })
   
   declare global { var __prisma: PrismaClient | undefined }
   export const prisma = global.__prisma ?? new PrismaClient({ adapter })
   if (process.env.NODE_ENV !== 'production') { global.__prisma = prisma }
   
   The ssl: { rejectUnauthorized: false } is required for Supabase connections from Vercel.
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
1. Create a Profile row in the database using Prisma upsert (not create, to handle edge cases):
   - id: the Supabase user.id
   - email: the user's email
   - subscriptionStatus: "trialing"
   - trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
2. Redirect to /onboarding

Use prisma from lib/db/client.ts.
Do the Profile creation server-side (API route or server action).
Handle errors — if Profile creation fails, still redirect to /onboarding.
Use upsert instead of create so re-registering the same email doesn't crash.
```

**Test after Phase 2**: Register → check Supabase Auth dashboard for user + Profile table for matching row. Visit `/dashboard` without logging in → should redirect to `/auth/login`.

> ⚠️ **Supabase note**: Email confirmation is enabled by default. For development, disable it: Supabase Dashboard → Authentication → Providers → Email → disable "Confirm email".

---

### Phase 3: Reddit + HN Data Pipeline ✅ DONE

**Goal**: Fetch posts from Reddit and HN, store in Opportunity table.

**Before starting**:
- Set up Upstash Redis at console.upstash.com → Create database → copy REST URL + Token → add to `.env.local`

> ⚠️ **Reddit API note**: Reddit locked down API access in late 2025. New developers cannot self-serve credentials. **Workaround**: Use Reddit's public `.json` endpoints — no auth needed, works fine for MVP. No need for `REDDIT_CLIENT_ID` or `REDDIT_CLIENT_SECRET`.

---

**CC Prompt 3A — Reddit client (public .json API, no auth):**

```
Create lib/reddit.ts for LaunchRadar.

This fetches new posts from Reddit subreddits using Reddit's PUBLIC .json API.
No OAuth, no API keys needed — Reddit allows unauthenticated reads from public .json endpoints.

Install if needed: @upstash/redis

Export:
fetchSubredditPosts(subreddit: string): Promise<RedditPost[]>

Logic:
- GET https://www.reddit.com/r/{subreddit}/new.json?limit=100
- Headers: User-Agent: "LaunchRadar/1.0"
- Rate limit: 10 requests/minute — add 100ms delay between calls if needed
- Filter out: posts older than 24 hours, stickied posts, [removed] and [deleted] body text
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

**CC Prompt 3C — Cron: fetch-posts:**

```
Create app/api/cron/fetch-posts/route.ts for LaunchRadar.

This runs daily triggered by Vercel Cron (Hobby plan only supports daily crons).

Logic:
1. Verify: check Authorization header equals "Bearer " + process.env.CRON_SECRET
   Return 401 if wrong.

2. Get all Profiles from DB using Prisma (select id, keywords, subreddits fields only).
   Log: [cron] Loaded {N} profile(s). Unique subreddits: [...]

3. Collect all unique subreddits across all profiles.

4. Fetch posts from each subreddit using fetchSubredditPosts() from lib/reddit.ts.
   Log: [cron] r/{subreddit}: fetched {N} post(s)
   Wrap each in try/catch so one failure doesn't stop others.

5. Fetch HN stories using fetchHNStories(150) from lib/hn.ts.
   Log: [cron] HN: fetched {N} story(ies)

6. For each profile:
   a. Filter posts where title or body contains any keyword from the profile's keywords array.
      IMPORTANT keyword matching fix: split each keyword phrase into individual words,
      match if ANY word with length > 4 chars appears in the post title or body (case-insensitive).
      Example: "struggling to find first customers" should match posts containing "struggling",
      "customers", "finding" etc. — NOT require the full phrase to match exactly.
   b. Log: [cron] Profile {id} — candidates: {total}, keyword-matched: {N}
   c. IMPORTANT: Limit to max 30 most recent matched posts before scoring (prevents timeout)
   d. Call scorePosts() from lib/scorer.ts (see Phase 4)
   e. Save only posts with relevanceScore >= 40 to Opportunity table using Prisma createMany
      with skipDuplicates: true (@@unique([userId, externalId]) handles deduplication)

7. Log: [cron] Done — totalOpportunitiesSaved: {N}
8. Return: { success: true, profilesProcessed: N, opportunitiesSaved: N }

Use prisma from lib/db/client.ts.
```

**Test after Phase 3**: Generate CRON_SECRET with `openssl rand -base64 32`, add to `.env.local`. Then manually call:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/fetch-posts
```
Should return `{"success":true,"profilesProcessed":1,"opportunitiesSaved":N}` where N > 0.

> ⚠️ **Vercel Hobby cron note**: Hobby plan only runs crons once daily (not every 30 min). Set schedule to `"0 1 * * *"` (1am UTC). Upgrade to Pro for higher frequency.

---

### Phase 4: AI Scoring ✅ DONE

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
- Process posts in batches of 10 (NOT 20 — smaller batches prevent timeout)
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

In app/api/cron/fetch-posts/route.ts:
- After keyword matching, take the 30 most recent posts (to prevent OpenAI timeout)
- Call scorePosts() and only save posts with relevanceScore >= 40
```

---

### Phase 5: Onboarding Flow ✅ DONE

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
  - UPSERT (not update) Profile in DB via Prisma — use upsert in case Profile row is missing:
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

### Phase 6: Daily Digest Email ✅ DONE

**Goal**: Users receive a curated email every morning with opportunities.

**Before starting**: Set up Resend at resend.com → create account → get API key → add to `.env.local`. Use `onboarding@resend.dev` as FROM email for testing (no domain verification needed).

---

**CC Prompt 6A — Digest email template:**

```
Create lib/email-templates/digest.tsx for LaunchRadar using React Email.
Install if needed: react-email @react-email/components resend

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
  }>
  baseUrl: string
}

Design — clean, minimal, Gmail-compatible:
- Header: "LaunchRadar" in dark text, thin gray border below
- For each opportunity:
  - Intent badge: "🔥🔥🔥 HIGH INTENT" or "🔥🔥 MEDIUM INTENT" or "🔥 LOW INTENT"
  - Title as bold link to the Reddit/HN URL
  - Source: "r/{subreddit}" or "Hacker News" · {N} comments
  - "Why relevant:" + reasoning in gray italic
  - Two links: "View Thread →" and "Mark as Replied ✓"
  - Divider between opportunities
- Footer: "Manage email preferences" link to {baseUrl}/settings

Export default DigestEmail component.
```

---

**CC Prompt 6B — Digest logic + send-digests cron:**

```
Create two files for LaunchRadar:

1. lib/digest.ts
Export: sendDailyDigest(profileId: string): Promise<{ sent: boolean, count: number }>

Logic:
- Query Opportunity table for this profile where:
  relevanceScore > 70 AND dismissed = false AND includedInDigest = false
  AND postedAt > new Date(Date.now() - 12 * 60 * 60 * 1000)
  ORDER BY relevanceScore DESC
  LIMIT 5
  Note: sort in memory by intentLevel (high → medium → low) after fetching,
  since Prisma sorts "high|low|medium" alphabetically which is wrong order.
- If 0 opportunities: return { sent: false, count: 0 }
- Get profile email from DB
- Send via Resend:
  from: process.env.RESEND_FROM_EMAIL
  to: profile email
  subject: "🎯 {N} opportunit{y/ies} to find customers today"
  react: <DigestEmail opportunities={...} baseUrl={process.env.NEXT_PUBLIC_APP_URL} />
- Mark all included opportunities: includedInDigest = true
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

**Test after Phase 6**: Manually call:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/send-digests
```
Check your inbox for the digest email.

---

### Phase 7: Dashboard ✅ DONE

**Goal**: Users can see opportunities and interact with them.

---

**CC Prompt 7A — Dashboard page + opportunity cards:**

```
Create the dashboard for LaunchRadar.

1. app/dashboard/page.tsx (server component)
- Get Supabase session. If no user: redirect to /auth/login.
- Fetch Profile from DB (subscriptionStatus, trialEndsAt, onboardingComplete)
- If !onboardingComplete: redirect to /onboarding
- Fetch Opportunities (dismissed: false) ORDER BY createdAt DESC, LIMIT 50
- Count queries for stats:
  totalFound = count all opportunities for this user
  totalReplied = count where replied = true
  totalSkipped = count where dismissed = true
- Pass data to DashboardClient component
- Banners:
  If subscriptionStatus = "trialing": yellow banner "Free trial — {X} days remaining · [Upgrade Now]"
  If trial expired and status != "active": red banner "Your trial has ended · [Upgrade Now]"
  If URL has ?upgraded=true: green banner "🎉 Welcome to LaunchRadar Pro!"

2. components/StatsBar.tsx
- Three stats: "Found: {totalFound}" | "Replied: {totalReplied}" | "Skipped: {totalSkipped}"
- Initialize from server-passed values (not 0) so stats survive page refresh

3. components/OpportunityCard.tsx (client component)
- Intent badge: "🔥🔥🔥 HIGH" (red) | "🔥🔥 MEDIUM" (orange) | "🔥 LOW" (yellow)
- "r/{subreddit}" or "Hacker News" · {N} hours ago · {N} comments
- Title (2-line clamp)
- "Why relevant: {reasoning}" in gray
- Buttons:
  [View Thread] → opens ReplyModal
  [Replied ✓] → POST /api/opportunities/{id}/reply → button turns green
  [Skip ✗] → POST /api/feedback {opportunityId, isRelevant: false} → card fades out

Filter tabs: All | 🔥🔥🔥 High | 🔥🔥 Medium | 🔥 Low (client-side)
Empty state: "No opportunities yet. Your first digest arrives tomorrow morning."

Use Shadcn: Card, Badge, Button.
```

---

**CC Prompt 7B — Reply modal (simplified):**

```
Create components/ReplyModal.tsx for LaunchRadar.

Props:
- opportunity: { id, title, body, url, subreddit, platform }
- isOpen: boolean
- onClose: () => void
- onReplied: () => void

Modal layout using Shadcn Dialog:

Section 1 — Post context:
- Title in bold
- Body text in gray (max 5 lines, "Show more" toggle if longer)
- "Open original thread →" link (opens new tab)

Bottom button:
- [Mark as Replied ✓] → POST /api/opportunities/{id}/reply → close modal → call onReplied()

Note: No AI reply generation in modal. The modal just shows the post and lets users
mark it replied after they've gone to Reddit/HN to reply manually.
```

---

**CC Prompt 7C — API routes for dashboard actions:**

```
Create two API routes for LaunchRadar:

1. app/api/opportunities/[id]/reply/route.ts (POST)
- Get user from Supabase session → 401 if not authenticated
- Update Opportunity: replied = true, repliedAt = new Date()
  Use updateMany with { id, userId: user.id } so users can only update their own records
- Return: { success: true }

2. app/api/feedback/route.ts (POST)
- Body: { opportunityId: string, isRelevant: boolean, reason?: string }
- Get user from Supabase session → 401 if not authenticated
- Run two writes in parallel:
  - updateMany Opportunity: dismissed = true (where id = opportunityId AND userId = user.id)
  - upsert Feedback row (handles re-dismiss gracefully)
- Return: { success: true }

IMPORTANT: These routes are critical — without them, all "Mark as Replied" and "Skip"
clicks hit 404 and changes are lost on page refresh.
```

---

**CC Prompt 7D — Header with navigation:**

```
Create components/Header.tsx for LaunchRadar (client component).

Layout:
- Left: "LaunchRadar" text logo (link to /dashboard)
- Center: navigation links — "Dashboard" → /dashboard, "Settings" → /settings
- Right: user email + [Log out] button

Log out: call supabase.auth.signOut() from createBrowserClient(@supabase/ssr),
then redirect to /

Import Header in app/dashboard/page.tsx and app/settings/page.tsx.
```

---

### Phase 8: Stripe Payments ✅ DONE

**Goal**: $19/mo subscription.

**Before starting**:
- Stripe Dashboard → Test mode → Products → Add product → "LaunchRadar Pro" → $19.00/mo recurring → copy Price ID
- Developers → API Keys → copy Secret key
- Add to `.env.local` and Vercel:
  - `STRIPE_SECRET_KEY=sk_test_...`
  - `STRIPE_PRICE_ID=price_...`

> **Note**: Only `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID` are needed. We use Stripe-hosted Checkout so no publishable key is required.

---

**CC Prompt 8A — Stripe checkout + webhook:**

```
Add Stripe subscription payment to LaunchRadar.
Install if needed: stripe

1. Create app/api/stripe/checkout/route.ts (POST):
- Get user from Supabase session + Profile email from Prisma
- Create Stripe Checkout Session:
  mode: "subscription"
  line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }]
  customer_email: profile.email
  success_url: process.env.NEXT_PUBLIC_APP_URL + "/dashboard?upgraded=true"
  cancel_url: process.env.NEXT_PUBLIC_APP_URL + "/dashboard"
  metadata: { profileId: profile.id }
- Return: { url: session.url }

2. Create app/api/stripe/webhook/route.ts (POST):
- Get raw body using request.text() — NOT request.json() (required for signature verification)
- Verify Stripe signature using STRIPE_WEBHOOK_SECRET
- Handle checkout.session.completed:
  → Find Profile by metadata.profileId
  → Update: subscriptionStatus = "active"
- Return 200

Use prisma from lib/db/client.ts.
```

---

**CC Prompt 8B — BuyModal + wire up Upgrade buttons:**

```
Create components/BuyModal.tsx (client component, Shadcn Dialog):

Props: isOpen, onClose

Content:
- Title: "LaunchRadar Pro — $19 / month"
- Features list:
  ✓ Daily digest of high-intent opportunities
  ✓ AI relevance filtering
  ✓ Reddit + HN monitoring
  ✓ Cancel anytime
- [Start Subscription] button:
  POST /api/stripe/checkout → get { url } → window.location.href = url
  Show loading state while waiting
- [Maybe later] text link → onClose()

Wire up in:
- app/dashboard/page.tsx: [Upgrade Now] button in trial/expired banners → open BuyModal
- app/settings/page.tsx (SettingsClient): [Upgrade to Pro] button → open BuyModal
  (not a placeholder — must call real /api/stripe/checkout)
```

**Test Stripe locally**:
```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
The CLI gives you a temporary `STRIPE_WEBHOOK_SECRET` — add to `.env.local` for local testing.

Test payment: card `4242 4242 4242 4242`, any future date, any 3-digit CVV.

**Configure production webhook**:
Stripe Dashboard → Developers → Webhooks → Add endpoint → URL: `https://launchradar-five.vercel.app/api/stripe/webhook` → select `checkout.session.completed` → copy signing secret → add to Vercel Environment Variables as `STRIPE_WEBHOOK_SECRET`.

---

### Phase 9: Settings + Polish ✅ DONE

---

**CC Prompt 9A — Settings page:**

```
Create app/settings/page.tsx for LaunchRadar.

Fetch current profile data server-side. Pass to SettingsClient component.

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
- Delivery time fixed at "8:00 UTC"
- [Save] → PATCH /api/settings {emailEnabled}

4. Subscription
- Status badge: "Trial — X days left" (yellow) | "Active" (green) | "Canceled" (red)
- [Upgrade to Pro] if trialing → opens BuyModal (must use real Stripe checkout)

Create app/api/settings/route.ts (PATCH):
- Get user from Supabase session
- Accept any subset of: { productDescription, targetCustomer, keywords, subreddits, emailEnabled }
- Update Profile in DB with Prisma
- Return: { success: true }
```

---

**CC Prompt 9B — Final polish + landing page:**

```
Final polish for LaunchRadar.

1. Update app/layout.tsx:
- title: "LaunchRadar — Find your first customers on Reddit & HN"
- description: "Stop scrolling Reddit for hours. Get a daily digest of discussions where people need your product."
- Add og:title, og:description, og:type="website"

2. Create app/not-found.tsx:
- Simple 404 page with "Page not found" and link back to /dashboard

3. Create app/privacy/page.tsx and app/terms/page.tsx:
- Simple placeholder text pages

4. Update app/page.tsx (landing page):
- Server component: if user already logged in, redirect to /dashboard
- Hero: "Stop scrolling Reddit for hours. Find customers in 15 minutes."
- How it works (3 steps): Describe product → AI monitors Reddit + HN → Get daily digest
- Pricing: $19/month, 7-day free trial, Cancel anytime
- FAQ:
  Q: How is this different from F5Bot?
  A: F5Bot sends 100+ alerts. LaunchRadar uses AI to filter to the highest-intent discussions.
  Q: Will I get banned from Reddit?
  A: No. We find threads for you — you reply manually in your own voice.
- Footer: Privacy · Terms
```

---

### Phase 10: Launch Prep

```
□ npm run build — fix all TypeScript errors
□ Verify all env vars in Vercel dashboard
□ Test full flow on production: Register → onboarding → manually curl fetch-posts
  → check dashboard shows opportunities → test Stripe payment → verify subscriptionStatus = "active"
□ Switch Stripe to live mode:
  - Create new product in Stripe Live mode → new STRIPE_PRICE_ID
  - Copy live STRIPE_SECRET_KEY
  - Update these in Vercel Environment Variables
  - Configure new production webhook in Stripe Live mode → new STRIPE_WEBHOOK_SECRET
□ Verify cron jobs: Vercel dashboard → Functions → Cron
□ Record Loom demo (90 seconds):
    0-30s: onboarding wizard
    30-60s: dashboard with opportunities
    60-90s: viewing a thread + marking replied
□ Write Product Hunt page
□ Write r/SideProject post (personal story angle)
□ Ask 5 beta users to upvote on launch day
```

---

## 🚀 Deployment

**Build command**: `npx prisma generate && next build`

**vercel.json** (Hobby plan — daily only):
```json
{
  "crons": [
    { "path": "/api/cron/fetch-posts", "schedule": "0 1 * * *" },
    { "path": "/api/cron/send-digests", "schedule": "0 8 * * *" }
  ]
}
```

**Cron security** — all cron routes check:
```typescript
if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response("Unauthorized", { status: 401 })
}
```

---

## 💰 Cost Summary

| Service | Free Tier | Upgrade When |
|---------|-----------|--------------|
| Vercel | Hobby (daily crons) | Pro ($20/mo) for 30-min crons |
| Supabase | 500MB, 50K MAU | $25/mo at scale |
| Upstash Redis | 10K req/day | $10/mo at ~200 users |
| Resend | 3K emails/mo | $20/mo at ~100 users |
| OpenAI | Pay per use | ~$10-25/mo at 100 users |
| Stripe | 2.9% + $0.30/tx | No fixed cost |

**Break-even: ~6 paying users at $19/mo**

---

## 🐛 Known Gotchas & Fixes

**Prisma v7 on Vercel**: Must use `@prisma/adapter-pg` — Prisma v7 no longer accepts empty constructor. Pattern:
```typescript
import { PrismaPg } from '@prisma/adapter-pg'
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
})
export const prisma = new PrismaClient({ adapter })
```

**Supabase connection from Vercel (P1001 error)**: Use the **Transaction Pooler URL (port 6543)**, NOT the direct connection (port 5432). Direct connections time out on serverless. Get pooler URL from: Supabase Dashboard → Connect button → Transaction pooler tab. Use this URL in both local `.env.local` AND Vercel.

**Reddit API locked down (Nov 2025)**: New developers can't get API credentials. Use public `.json` endpoints instead: `https://www.reddit.com/r/{subreddit}/new.json?limit=100`. No auth required. 10 req/min limit — sufficient for MVP.

**Keyword matching**: Don't match full phrases — they never appear verbatim in posts. Split each keyword into individual words and match if ANY significant word (length > 4) appears in the post title/body.

**Cron timeout with too many posts**: 288 matched posts → 15+ OpenAI calls → timeout. Limit to 30 posts per profile before scoring. Use batch size of 10 (not 20) in scorer.ts.

**Stats reset on refresh**: Dashboard stats must be initialized from server-side DB counts, not from 0. Use `useState(serverValue)` not `useState(0)`.

**API routes missing = silent failures**: `/api/opportunities/[id]/reply` and `/api/feedback` must exist. Without them, all card actions hit 404, errors are swallowed by try/catch, and changes are lost on refresh.

**Supabase Profile upsert**: Use `upsert` not `update` in onboarding save. If Profile row doesn't exist (registration edge case), `update` throws P2025.

**Stripe webhook**: Use `request.text()` not `request.json()` before signature verification.

**Email confirmation**: Supabase enables email confirmation by default. For development: Authentication → Providers → Email → disable "Confirm email".

**intentLevel sort**: Prisma sorts "high|low|medium" alphabetically (h→l→m). Sort in memory after fetching: high → medium → low.

**Supabase RLS**: LaunchRadar uses Prisma + service role key (server-side only), so RLS is not required for security. All tables are UNRESTRICTED — this is fine for MVP since the client never has direct DB access.

---

## 🔄 Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-17 | 1.0 | Initial guide |
| 2026-02-22 | 1.1 | Switched to Supabase Auth. Removed NextAuth. |
| 2026-02-22 | 1.2 | Embedded CC prompts into each phase. |
| 2026-02-24 | 2.0 | Major update: price $29→$19, Prisma v7 adapter fix, Supabase pooler URL, Reddit public API, keyword matching fix, cron timeout fix, simplified reply modal (no AI generation), stats fix, missing API routes added, Stripe simplified (no publishable key needed), all phases 1-9 marked complete |
