# LaunchRadar - Implementation Guide

**Status**: 🚧 In Progress  
**Repo**: github.com/[your-username]/LaunchRadar (private)  
**Last Updated**: February 17, 2026

---

## 📊 Project Overview

LaunchRadar finds Reddit & Hacker News discussions where people need your product. It sends indie hackers a daily digest of 3-5 high-intent opportunities with AI-generated reply suggestions. $29/mo.

**Stack**: Next.js 14 + Neon PostgreSQL + Prisma + OpenAI + Reddit API + HN API + Resend + Stripe + Vercel

---

## 🏗️ Architecture

### Tech Stack

**Frontend**:
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Shadcn/ui

**Backend**:
- Next.js API Routes (serverless)
- Neon PostgreSQL (serverless Postgres)
- Prisma ORM
- NextAuth.js v5 (email/password)
- Upstash Redis (rate limiting + caching)

**AI**:
- OpenAI GPT-4o-mini (relevance filtering, cheap)
- OpenAI GPT-4o (reply generation, quality)

**Data Sources**:
- Reddit API (official OAuth2)
- HN Firebase API (free, no limits)

**Services**:
- Resend (transactional email)
- Stripe (subscriptions)
- Vercel Cron (scheduled jobs)

**Monitoring**:
- Sentry (errors)
- PostHog (product analytics)

---

## 📁 Project Structure

```
launchradar/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts     # NextAuth handler
│   │   ├── onboarding/route.ts             # Save product + generate keywords
│   │   ├── opportunities/route.ts          # Fetch user's opportunities
│   │   ├── feedback/route.ts               # Mark relevant/not relevant
│   │   ├── digest/generate/route.ts        # Manual trigger (dev only)
│   │   ├── cron/
│   │   │   ├── fetch-posts/route.ts        # Cron: pull Reddit + HN every 30min
│   │   │   └── send-digests/route.ts       # Cron: send daily digest emails
│   │   └── stripe/
│   │       ├── checkout/route.ts
│   │       └── webhook/route.ts
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── onboarding/page.tsx                 # Setup wizard (Step 1-3)
│   ├── dashboard/page.tsx                  # Opportunity feed + stats
│   ├── settings/page.tsx                   # Edit keywords, subreddits, email prefs
│   ├── page.tsx                            # Landing page
│   └── layout.tsx
├── components/
│   ├── OnboardingWizard.tsx               # Multi-step setup form
│   ├── OpportunityCard.tsx                # Single opportunity display
│   ├── OpportunityFeed.tsx                # List of opportunities
│   ├── ReplyModal.tsx                     # View thread + suggested replies
│   ├── FeedbackButtons.tsx                # ✓ Replied / ✗ Not Relevant
│   ├── StatsBar.tsx                       # Weekly stats header
│   ├── BuyModal.tsx                       # Stripe checkout trigger
│   └── Header.tsx
├── lib/
│   ├── reddit.ts                          # Reddit API client
│   ├── hn.ts                              # HN Firebase API client
│   ├── scorer.ts                          # AI relevance scoring (GPT-4o-mini)
│   ├── reply-generator.ts                 # AI reply suggestions (GPT-4o)
│   ├── keyword-generator.ts               # AI keyword + subreddit extractor
│   ├── digest.ts                          # Digest selection + email send logic
│   ├── email-templates/
│   │   └── digest.tsx                     # React Email template
│   └── db/
│       ├── client.ts                      # Prisma client singleton
│       └── queries.ts                     # Common DB queries
├── prisma/
│   └── schema.prisma
├── emails/                                # React Email preview
├── .env.local
└── vercel.json                            # Cron job config
```

---

## 🗄️ Database Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                  String    @id @default(cuid())
  email               String    @unique
  name                String?
  password            String    // hashed
  createdAt           DateTime  @default(now())

  // Subscription
  stripeCustomerId    String?   @unique
  subscriptionStatus  String?   // trialing | active | canceled | past_due
  trialEndsAt         DateTime?
  currentPeriodEnd    DateTime?

  // Product info (set during onboarding)
  productDescription  String?
  targetCustomer      String?
  onboardingComplete  Boolean   @default(false)

  // Monitoring config
  keywords            String[]  @default([])
  subreddits          String[]  @default([])
  digestFrequency     String    @default("daily")
  emailEnabled        Boolean   @default(true)
  digestTime          Int       @default(8)  // Hour in user's timezone (8 = 8am)

  // Lifetime stats
  opportunitiesFound  Int       @default(0)
  repliesMade         Int       @default(0)
  conversions         Int       @default(0)

  opportunities       Opportunity[]
  feedback            Feedback[]
}

model Opportunity {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Source
  platform        String    // "reddit" | "hackernews"
  externalId      String    // Reddit fullname (t3_xxx) or HN item id
  url             String
  title           String
  body            String?
  subreddit       String?   // null for HN
  author          String
  commentCount    Int       @default(0)
  score           Int       @default(0)
  postedAt        DateTime

  // AI scoring
  relevanceScore  Int       // 0-100
  intentLevel     String    // "high" | "medium" | "low"
  reasoning       String    // Why it's relevant

  // Generated content
  suggestedReplies Json     // Array of {approach, text, pros, cons}

  // User actions
  includedInDigest Boolean  @default(false)
  viewed          Boolean   @default(false)
  replied         Boolean   @default(false)
  repliedAt       DateTime?
  dismissed       Boolean   @default(false)

  createdAt       DateTime  @default(now())

  feedback        Feedback[]

  @@unique([userId, externalId])  // No duplicates per user
  @@index([userId, relevanceScore])
  @@index([userId, createdAt])
}

model Feedback {
  id              String      @id @default(cuid())
  userId          String
  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  opportunityId   String
  opportunity     Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)

  isRelevant      Boolean
  reason          String?     // Why not relevant (free text or enum)

  createdAt       DateTime    @default(now())

  @@unique([userId, opportunityId])
}
```

---

## 🔑 Environment Variables

```bash
# .env.local

# --- Auth ---
NEXTAUTH_SECRET=                        # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# --- Database (Neon) ---
DATABASE_URL=                           # postgresql://...

# --- OpenAI (already have this) ---
OPENAI_API_KEY=sk-proj-...

# --- Reddit API ---
REDDIT_CLIENT_ID=                       # From reddit.com/prefs/apps
REDDIT_CLIENT_SECRET=
REDDIT_USER_AGENT=LaunchRadar/1.0 by u/[your-username]

# --- Upstash Redis ---
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# --- Resend (email) ---
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=digest@launchradar.com

# --- Stripe ---
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...              # Your $29/mo price ID

# --- Cron Security ---
CRON_SECRET=                           # openssl rand -base64 32

# --- Monitoring (optional, add later) ---
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
```

---

## 🔌 External Services Setup

### 1. Neon (Database)
1. Go to neon.tech → Create project "launchradar"
2. Copy connection string → `DATABASE_URL`
3. Neon free tier: 512MB, 1 compute, enough for MVP

### 2. Reddit API
1. Go to reddit.com/prefs/apps → "Create another app"
2. Type: **script**
3. Name: LaunchRadar
4. Redirect URI: `http://localhost:3000` (doesn't matter for script type)
5. Copy `client_id` (under app name) and `secret`
6. Auth method: Client Credentials (no user login needed — we're reading public posts)

### 3. Upstash Redis
1. Go to console.upstash.com → Create database
2. Region: US-East-1
3. Copy REST URL and Token
4. Free tier: 10K requests/day — enough for MVP

### 4. Resend
1. Go to resend.com → Create account
2. Add and verify your domain (or use `onboarding@resend.dev` for testing)
3. Create API key → `RESEND_API_KEY`
4. Free tier: 3K emails/month, enough for ~100 users

### 5. Stripe
1. Go to dashboard.stripe.com → Test mode
2. Products → Create product: "LaunchRadar Pro"
3. Price: $29/mo recurring
4. Copy Price ID → `STRIPE_PRICE_ID`
5. Webhooks → Add endpoint: `https://your-domain.com/api/stripe/webhook`
6. Events to listen: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

### 6. Vercel Cron
Add `vercel.json` to root:

```json
{
  "crons": [
    {
      "path": "/api/cron/fetch-posts",
      "schedule": "*/30 * * * *"
    },
    {
      "path": "/api/cron/send-digests",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Cron routes must verify the `CRON_SECRET` header to prevent unauthorized triggering.

---

## 📋 Build Phases

---

### Phase 1: Foundation (Week 1, Days 1-2)
**Goal**: Repo, auth, database, landing page working

**Checklist**:

```
□ Create private GitHub repo: LaunchRadar
□ npx create-next-app@latest launchradar --typescript --tailwind --app
□ Install dependencies:
    npx shadcn@latest init
    npm install prisma @prisma/client
    npm install next-auth@beta @auth/prisma-adapter
    npm install @upstash/redis
    npm install stripe
    npm install resend react-email @react-email/components

□ Set up Neon:
    npx prisma init
    (paste schema above into prisma/schema.prisma)
    npx prisma db push
    npx prisma generate

□ Set up NextAuth v5:
    Create auth.ts config (email/password with Prisma adapter)
    Create app/api/auth/[...nextauth]/route.ts
    Create app/auth/login/page.tsx
    Create app/auth/register/page.tsx

□ Build landing page (app/page.tsx):
    Hero section: "Stop scrolling Reddit for 5 hours. Find customers in 15 minutes."
    How it works: 3 steps
    Pricing: $29/mo, 7-day free trial
    FAQ: F5Bot comparison, Reddit bans, product types
    CTA: "Start Free Trial" → /auth/register

□ Push to GitHub
□ Connect to Vercel (import repo)
□ Add all env vars to Vercel
□ Confirm deploy works
```

---

### Phase 2: Reddit + HN Data Pipeline (Week 1, Days 3-4)
**Goal**: Can fetch and store posts from both platforms

**Reddit Client** (`lib/reddit.ts`):
```typescript
// Client Credentials flow - reads public posts, no user login
// POST to https://www.reddit.com/api/v1/access_token
// Then GET https://oauth.reddit.com/r/{subreddit}/new
// Rate limit: 100 req/min → respect with Upstash rate limiter
// Store access token in Redis, refresh when expired
```

**HN Client** (`lib/hn.ts`):
```typescript
// HN Firebase API: https://hacker-news.firebaseio.com/v0/
// GET /newstories.json → array of item IDs (newest 500)
// GET /item/{id}.json → post details
// Filter: only type="story", score > 5, comments > 0
// No auth, no rate limits
```

**Post Fetcher** (`app/api/cron/fetch-posts/route.ts`):
```typescript
// Triggered by Vercel Cron every 30min
// For each unique subreddit across all users → fetch new posts
// For HN → fetch latest stories
// Deduplicate via @@unique([userId, externalId])
// Only store posts from last 24 hours (older = low engagement)
```

**Checklist**:
```
□ Implement Reddit OAuth client credentials auth
□ Implement Reddit post fetcher (by subreddit + keyword filter)
□ Implement HN new stories fetcher
□ Add Upstash rate limiting wrapper
□ Add Redis caching for Reddit access token
□ Create cron route with CRON_SECRET verification
□ Test: manually call cron route, check DB for posts
□ Handle errors gracefully (Reddit API down, etc.)
```

---

### Phase 3: AI Scoring (Week 1, Day 5)
**Goal**: Posts get relevance scores via GPT-4o-mini

**Scorer** (`lib/scorer.ts`):
```typescript
// Input: post + user's productDescription + targetCustomer
// Model: gpt-4o-mini (fast + cheap: $0.15/1M tokens)
// Output: { score: 0-100, intentLevel: "high"|"medium"|"low", reasoning: string }
// Batch: score 20 posts per API call to save tokens
// Cache: store score in DB, never re-score same post for same user
```

**Prompt template**:
```
You are evaluating whether a Reddit/HN post is a good opportunity for a founder to promote their product.

Product: {productDescription}
Target customer: {targetCustomer}

Post title: {title}
Post body: {body}
Subreddit: {subreddit}
Post age: {ageHours} hours old
Comment count: {commentCount}

Score this opportunity from 0-100:
90-100: Person is explicitly asking for a solution like this product
70-89: Person describes a problem this product solves
50-69: Tangentially related discussion
0-49: Not relevant

Return JSON: { "score": number, "intentLevel": "high"|"medium"|"low", "reasoning": "one sentence" }
```

**Checklist**:
```
□ Implement scorer with JSON mode
□ Add batch processing (20 posts per call)
□ Add Redis caching (cache score for 48h, same post same user)
□ Wire into cron job: after fetching posts, score them
□ Test accuracy with 20 sample posts (aim for <20% false positives)
□ Save scores to Opportunity table
```

---

### Phase 4: Onboarding Flow (Week 2, Days 6-8)
**Goal**: New users can set up their product profile in 10 minutes

**Pages**:
- `app/onboarding/page.tsx` — 3-step wizard component

**Step 1**: What's your product? (textarea, 1-2 sentences)

**Step 2**: Who's your target customer? (textarea)

**Step 3**: Review AI-generated keywords + subreddits
- Call `app/api/onboarding/route.ts` → GPT-4o extracts keywords + subreddits
- User can check/uncheck each suggestion
- User can add custom keywords/subreddits
- Save → trigger first post fetch for this user

**Keyword Generator** (`lib/keyword-generator.ts`):
```typescript
// Model: gpt-4o (better quality for onboarding, one-time call)
// Prompt: generate 10-15 problem-focused keywords (NOT solution keywords)
//         + 5-10 relevant subreddits with reasoning
// Return JSON array
```

**Checklist**:
```
□ Build 3-step wizard UI with Shadcn components
□ Step 1: Product description form with character counter
□ Step 2: Target customer form
□ Step 3: AI keyword/subreddit suggestions with checkboxes
□ Implement keyword-generator.ts (GPT-4o)
□ POST /api/onboarding → save to User table + set onboardingComplete=true
□ After save: trigger async post fetch for new user
□ Redirect to /dashboard after completion
□ Guard: redirect to /onboarding if !user.onboardingComplete
□ Show 3 example past opportunities at end of onboarding
```

---

### Phase 5: Daily Digest (Week 2, Days 9-10)
**Goal**: Users receive a curated email every morning

**Digest Selection Logic** (`lib/digest.ts`):
```typescript
// 1. Query user's opportunities from last 24h where:
//    - relevanceScore > 70
//    - not dismissed
//    - post is < 12 hours old (still active)
// 2. Sort by: intentLevel (high first), then relevanceScore
// 3. Take top 5 max
// 4. Generate reply suggestions for each (GPT-4o)
// 5. Send email via Resend
// 6. Mark opportunities as includedInDigest=true
```

**Reply Generator** (`lib/reply-generator.ts`):
```typescript
// Model: gpt-4o (quality matters for user-facing text)
// For each opportunity: generate 3 reply approaches
//   1. Helpful: offer value + natural product mention
//   2. Educational: answer question, no product mention yet
//   3. Question-first: ask clarifying question to understand needs
// Each approach: { text, pros, cons, whenToUse }
// Store as JSON in Opportunity.suggestedReplies
```

**Email Template** (`lib/email-templates/digest.tsx`):
```
Subject: "🎯 {count} opportunities to find customers today"

For each opportunity:
- Intent badge (🔥🔥🔥 HIGH / 🔥🔥 MEDIUM / 🔥 LOW)
- Post title + subreddit + age
- Why it's relevant (AI reasoning)
- "Suggested reply" (first approach, truncated to 2 lines)
- [View on Reddit] [I Replied ✓] [Skip ✗] buttons (tracked links)

Footer: stats (opportunities found, replies made, conversions)
```

**Cron job** (`app/api/cron/send-digests/route.ts`):
```typescript
// Runs: 0 8 * * * (8am UTC)
// For each user with emailEnabled=true and subscriptionStatus=active|trialing:
//   → Run digest selection + send email
// Must complete in <60s (Vercel serverless limit)
// Batch: process users in parallel (Promise.allSettled)
```

**Checklist**:
```
□ Implement reply-generator.ts (3 variations, JSON output)
□ Build React Email template (preview with react-email)
□ Test email rendering in Gmail + Apple Mail
□ Implement digest selection logic
□ Implement send-digests cron route
□ Add tracked redirect links (/api/track/view?id=xxx → redirect to Reddit)
□ Test: manually trigger cron for 1 test user
□ Verify email arrives and links work
```

---

### Phase 6: Dashboard (Week 3, Days 11-12)
**Goal**: Users can see and act on their opportunities

**Dashboard** (`app/dashboard/page.tsx`):

```
Layout:
┌─────────────────────────────────────────────┐
│ Header: Logo | Dashboard | Settings | Credits│
├─────────────────────────────────────────────┤
│ Stats bar: Found: 18 | Replied: 5 | Won: 1  │
├─────────────────────────────────────────────┤
│ Filter tabs: All | High | Medium | Low       │
├─────────────────────────────────────────────┤
│ Opportunity cards (feed)                    │
│  ┌───────────────────────────────────────┐  │
│  │ 🔥🔥🔥 r/SideProject • 2 hours ago   │  │
│  │ "Looking for PM tool for solo founders"│  │
│  │ Why relevant: [AI reasoning]           │  │
│  │ [View + Reply] [Replied ✓] [Skip ✗]   │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Reply Modal** (`components/ReplyModal.tsx`):
```
- Opens when user clicks "View + Reply"
- Shows post title + body
- Shows 3 reply approaches with radio buttons
- Selected reply shown in editable textarea
- [Copy to Clipboard] button
- [Open Reddit in new tab] button
- [Mark as Replied] → updates DB, increments repliesMade
```

**Feedback** (`components/FeedbackButtons.tsx`):
```
"Skip ✗" → dropdown:
  - Wrong audience (not my ICP)
  - Too broad/generic
  - Too many comments already
  - Job posting, not discussion
  → Saves to Feedback table
  → Used for learning mode (v2)
```

**Checklist**:
```
□ Build dashboard page with server component data fetching
□ Opportunity card component (intent badge, title, subreddit, age)
□ Filter tabs (All / High / Medium / Low intent)
□ Reply modal with 3 variations + editable textarea
□ Copy to clipboard + open Reddit link
□ POST /api/opportunities/[id]/reply → set replied=true
□ Feedback buttons + dropdown
□ POST /api/feedback → save to Feedback table
□ Stats bar (query user stats from DB)
□ Empty state: "No opportunities yet — check back tomorrow"
□ Loading skeleton while fetching
```

---

### Phase 7: Payments (Week 3, Days 13-14)
**Goal**: Stripe subscription flow working end-to-end

**Trial Logic**:
- New users get 7-day free trial on register
- Set `trialEndsAt = now() + 7 days`
- Set `subscriptionStatus = "trialing"`
- After trial: prompt to upgrade, pause digests until paid

**Checkout Flow**:
1. User clicks "Upgrade" or "Start Trial"
2. POST `/api/stripe/checkout` → create Stripe Checkout Session
3. Redirect to Stripe hosted page
4. User pays → Stripe calls `/api/stripe/webhook`
5. Webhook: set `subscriptionStatus = "active"`, `currentPeriodEnd`

**Webhook Events**:
```typescript
// checkout.session.completed → link stripeCustomerId to user
// customer.subscription.updated → update subscriptionStatus
// customer.subscription.deleted → set subscriptionStatus = "canceled"
```

**Checklist**:
```
□ Set trialEndsAt on user registration (7 days)
□ Build /api/stripe/checkout route (create session)
□ Build /api/stripe/webhook route (verify signature, handle events)
□ Add BuyModal component (show $29/mo, "Start 7-day free trial")
□ Add upgrade prompt on dashboard when trial expired
□ Gate digest sending: only send to active|trialing users
□ Gate dashboard: show "Trial ended" banner with upgrade CTA
□ Test full flow with Stripe test cards
□ Test webhook with Stripe CLI: stripe listen --forward-to localhost:3000/api/stripe/webhook
□ Verify credits update in DB after payment
```

---

### Phase 8: Settings + Polish (Week 3, Days 15-16)
**Goal**: Users can edit their setup, product is stable

**Settings Page** (`app/settings/page.tsx`):
```
Sections:
1. Product Info
   - Edit productDescription (textarea)
   - Edit targetCustomer (textarea)
   - [Re-generate keywords] button

2. Keywords & Subreddits
   - Tag input for keywords (add/remove)
   - Tag input for subreddits (add/remove)
   - [Save changes]

3. Email Preferences
   - Toggle: email enabled/disabled
   - Digest time selector (8am / 12pm / 6pm)

4. Subscription
   - Current plan status + period end date
   - [Manage Subscription] → Stripe Customer Portal
   - [Cancel] link
```

**Stripe Customer Portal**:
```typescript
// POST /api/stripe/portal → create billing portal session
// User can cancel, update payment method, view invoices
```

**Polish Checklist**:
```
□ Settings page with all 4 sections
□ Stripe Customer Portal link
□ Add Sentry (5 min setup: npx @sentry/wizard@latest -i nextjs)
□ Add PostHog (5 min setup: npm install posthog-js)
□ Error boundaries on dashboard + onboarding
□ 404 page
□ Redirect / → /dashboard if logged in
□ Redirect /dashboard → /onboarding if !onboardingComplete
□ Mobile responsive check (iPhone Safari)
□ Meta tags: og:title, og:description, og:image for landing page
□ sitemap.xml + robots.txt
□ Privacy policy page (use a template)
□ Terms of service page
```

---

### Phase 9: Launch Prep (Weekend before launch)

```
□ Switch Stripe to live mode + update env vars on Vercel
□ Set up custom domain on Vercel (optional)
□ Verify cron jobs running in Vercel logs
□ Full end-to-end test on production:
    - Register new user
    - Complete onboarding
    - Manually trigger post fetch
    - Manually trigger digest
    - Verify email arrives
    - Test payment flow (Stripe live mode)
□ Record demo video (Loom, 90 seconds):
    - Show onboarding (30s)
    - Show digest email (30s)
    - Show dashboard + reply modal (30s)
□ Write Product Hunt tagline + description
□ Prepare 5 launch assets (screenshots)
□ Write Indie Hackers launch post
□ Write r/SideProject post (personal story angle)
□ Ask 5 beta users to be ready to upvote on launch day
```

---

## 🚀 Deployment

### Vercel Setup
Already have Vercel set up. When connecting repo:
1. Framework preset: Next.js
2. Build command: `npx prisma generate && next build`
3. Root directory: `/`
4. Add all env vars from `.env.local`
5. Enable Cron Jobs (requires Vercel Pro or Hobby with crons enabled)

### Database Migrations
```bash
# Initial push (dev)
npx prisma db push

# After schema changes (production)
npx prisma migrate deploy
```

### Cron Job Security
All cron routes must check:
```typescript
const authHeader = request.headers.get("authorization");
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response("Unauthorized", { status: 401 });
}
```
Vercel automatically adds this header when triggering cron jobs.

---

## 💰 Cost Summary

| Service | Free Tier | When to Upgrade |
|---------|-----------|-----------------|
| Vercel | Hobby (includes crons) | Pro at ~500 users |
| Neon | 512MB, 1 compute | Scale at ~500 users |
| Upstash Redis | 10K req/day | $10/mo at ~200 users |
| Resend | 3K emails/month | $20/mo at ~100 users |
| OpenAI | Pay per use | ~$25/mo at 100 users |
| Stripe | 2.9% + $0.30 | No fixed cost |
| Sentry | 5K errors/month | Likely never for MVP |
| PostHog | 1M events/month | Likely never for MVP |

**Total at 0-50 users: ~$0-10/mo (just OpenAI costs)**
**Total at 100 users: ~$188/mo**
**Revenue at 100 users: $2,900/mo**
**Margin: 93%**

---

## 🐛 Known Gotchas

### Reddit API
- Access token expires in 1 hour → store in Redis, auto-refresh
- Rate limit: 100 req/min → use Upstash rate limiter
- Use `oauth.reddit.com` not `www.reddit.com` for API calls after auth
- New posts endpoint: `/r/{subreddit}/new.json?limit=100`
- User-agent header is required: `LaunchRadar/1.0 by u/[username]`

### HN API
- `newstories.json` returns up to 500 IDs → batch fetch items 10 at a time
- Items can be null (deleted) → handle gracefully
- No pagination — just fetch newest 100-200 and filter

### OpenAI
- Always use `response_format: { type: "json_object" }` for scoring
- Add `json` to prompt when using json_object mode (required)
- GPT-4o-mini for scoring (fast, cheap), GPT-4o for replies (quality)
- Set `max_tokens` explicitly to avoid runaway costs

### Prisma + Neon
- Use connection pooling: `DATABASE_URL` should include `?pgbouncer=true&connection_limit=1` for serverless
- Neon also needs `DIRECT_URL` (without pooling) for migrations
- Run `npx prisma generate` in build command on Vercel

### NextAuth v5
- Different from v4 — use `auth.ts` config pattern, not `[...nextauth]` options export
- `@auth/prisma-adapter` for Prisma integration
- Password hashing: use `bcryptjs` (not `bcrypt` — native module issues on Vercel)

### Vercel Crons
- Max execution time: 60s for hobby, 800s for pro
- Only triggered by Vercel — test locally with direct HTTP call + CRON_SECRET header
- Logs available in Vercel dashboard → Functions → Cron

---

## 🧪 Testing Checklist

### Auth
- [ ] Register new user → redirected to /onboarding
- [ ] Login existing user → redirected to /dashboard
- [ ] Logout → redirected to /
- [ ] Access /dashboard without auth → redirected to /auth/login

### Onboarding
- [ ] Step 1-3 wizard flows correctly
- [ ] AI generates relevant keywords (test with "I built a Notion template for side projects")
- [ ] Can add/remove keywords and subreddits
- [ ] Save sets onboardingComplete=true

### Data Pipeline
- [ ] Cron fetch-posts runs without errors
- [ ] Posts appear in Opportunity table in DB
- [ ] Scoring runs and produces scores 0-100
- [ ] No duplicate posts (@@unique constraint works)

### Digest
- [ ] Send-digests cron sends email
- [ ] Email renders correctly (check Gmail, Apple Mail)
- [ ] Email links work (View on Reddit, reply tracking)
- [ ] Only high-intent posts (>70) included

### Dashboard
- [ ] Opportunities display correctly
- [ ] Filter tabs work
- [ ] Reply modal shows 3 approaches
- [ ] Copy to clipboard works
- [ ] "Replied" button updates DB
- [ ] Feedback dropdown saves to Feedback table

### Payments
- [ ] 7-day trial set on registration
- [ ] Checkout session creates (test card: 4242 4242 4242 4242)
- [ ] Webhook updates subscriptionStatus to "active"
- [ ] Digest paused for expired trials
- [ ] Stripe Customer Portal opens

---

## 📈 Key Metrics to Watch

**Week 1 (Beta, 10 users)**:
- Onboarding completion rate (target: >80%)
- Digest open rate (target: >60%)
- Opportunities clicked per user/week (target: >3)
- % marked "Not Relevant" (target: <20% = AI accuracy check)

**Week 4 (50 users)**:
- MRR (target: $1,450)
- Churn (target: <10%/month)
- NPS (target: >30)
- Support tickets/day (target: <5)

---

## 🔄 Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-17 | 1.0 | Initial guide |

---

**Built with**: Next.js 14, Neon, Prisma, NextAuth, OpenAI, Reddit API, Resend, Stripe, Vercel  
**Target build time**: 3 weeks (120 hours)  
**Break-even**: 7 paying customers
