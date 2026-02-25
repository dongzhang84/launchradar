# LaunchRadar — Claude Code Guide

## Project Summary

LaunchRadar is a Next.js 16 SaaS app that monitors Reddit and Hacker News for high-intent conversations relevant to a user's product, scores them with OpenAI, and delivers a daily email digest of the best opportunities with AI-generated reply suggestions. Users sign up, complete an onboarding wizard to describe their product, and receive scored leads in their dashboard. Monetisation is a $19/month Stripe subscription after a free trial.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16 |
| Language | TypeScript | 5 |
| Database | PostgreSQL (Supabase) | — |
| ORM | Prisma + `@prisma/adapter-pg` | 7 |
| Auth | Supabase SSR (`@supabase/ssr`) | 0.8 |
| Payments | Stripe | 20 |
| Email | Resend + React Email | — |
| AI | OpenAI | — |
| Caching | Upstash Redis | — |
| UI | Shadcn + Tailwind CSS | v4 |
| Deployment | Vercel | — |

---

## Critical Gotchas

### 1. Prisma v7 — always use the adapter

Prisma v7 requires an explicit database adapter. **Never** call `new PrismaClient()` without one.

```ts
// CORRECT — lib/db/client.ts
import { PrismaPg } from '@prisma/adapter-pg'
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } })
export const prisma = new PrismaClient({ adapter })

// WRONG — will throw at runtime
export const prisma = new PrismaClient()
```

All database access goes through `lib/db/client.ts`. Never instantiate Prisma anywhere else.

### 2. DATABASE_URL must be the Supabase Transaction Pooler

Use the **Transaction Pooler** URL (port `6543`), not the direct connection URL (port `5432`). Serverless functions cannot hold open long-lived connections; direct URLs cause P1001 errors.

```
# CORRECT
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true

# WRONG — causes P1001 in Vercel/serverless
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
```

### 3. The user model is `Profile`, not `User`

Prisma schema has no `User` model. It is `Profile`. The `Profile.id` equals the Supabase `auth.users.id` (UUID used as CUID-style primary key).

```ts
// CORRECT
const profile = await prisma.profile.findUnique({ where: { id: user.id } })

// WRONG — model does not exist
const user = await prisma.user.findUnique(...)
```

### 4. Opportunity foreign key is `userId`, not `profileId`

The `Opportunity` model references `Profile` via the field `userId`.

```ts
// CORRECT
prisma.opportunity.findMany({ where: { userId: user.id } })

// WRONG — field does not exist
prisma.opportunity.findMany({ where: { profileId: user.id } })
```

### 5. Reddit uses the public `.json` API — no OAuth

Reddit OAuth credentials are not available. All Reddit fetching uses the public JSON endpoint:

```
https://www.reddit.com/r/{subreddit}/new.json?limit=25
```

Do not add OAuth flows or `snoowrap`/`reddit-api-client` dependencies.

### 6. Base URL env var is `NEXT_PUBLIC_APP_URL`

This project does not use NextAuth. The canonical base URL variable is:

```
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

Never reference `NEXTAUTH_URL` or `VERCEL_URL` for constructing absolute URLs.

### 7. Stripe webhook must use `request.text()`, not `request.json()`

The webhook handler must read the raw body to verify the Stripe signature. Using `request.json()` parses the body and breaks verification.

```ts
// CORRECT — app/api/stripe/webhook/route.ts
const body = await request.text()
stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
```

---

## Key File Locations

```
app/
  page.tsx                          Landing page (hero, pricing)
  layout.tsx                        Root layout + fonts
  dashboard/page.tsx                Dashboard — server component, fetches opportunities
  onboarding/page.tsx               Multi-step onboarding wizard
  settings/page.tsx                 Settings — server component
  auth/login/page.tsx               Supabase email/password login
  auth/register/page.tsx            Registration
  api/
    stripe/checkout/route.ts        POST — create Stripe Checkout Session
    stripe/webhook/route.ts         POST — handle Stripe events (raw body)
    cron/fetch-posts/route.ts       POST — scrape Reddit+HN, score with OpenAI, store
    cron/send-digests/route.ts      POST — send daily digest emails via Resend
    onboarding/route.ts             POST — generate keywords + complete onboarding
    settings/route.ts               PATCH — update profile settings
    feedback/route.ts               POST — record opportunity relevance feedback
    opportunities/[id]/reply/route.ts  POST — mark opportunity as replied

components/
  DashboardClient.tsx               Client: filter tabs, opportunity list, banners
  OpportunityCard.tsx               Individual opportunity with action buttons
  ReplyModal.tsx                    Shadcn Dialog with suggested reply variations
  BuyModal.tsx                      Shadcn Dialog for Stripe subscription checkout
  SettingsClient.tsx                Client: all settings forms
  StatsBar.tsx                      Opportunities / replies / skipped counters
  Header.tsx                        Top nav with email, settings link, logout

lib/
  db/client.ts                      Prisma singleton (always import from here)
  supabase/server.ts                createServerSupabaseClient() for Server Components/Routes
  supabase/client.ts                createBrowserSupabaseClient() for Client Components
  supabase/admin.ts                 Admin client (service role key)
  scorer.ts                         OpenAI scoring — relevance 0–100, intent level, replies
  keyword-generator.ts              OpenAI keyword + subreddit generation from product desc
  reddit.ts                         Reddit public .json API fetcher
  hn.ts                             HN Algolia API fetcher
  digest.ts                         Selects top opportunities for digest
  email-templates/digest.tsx        React Email digest template
  reply-generator.ts                OpenAI reply generation utility

prisma/
  schema.prisma                     Single source of truth for all models
```

---

## Database Models (quick reference)

**Profile** — one per user; `id` = Supabase auth UID
- Subscription: `stripeCustomerId`, `subscriptionStatus`, `trialEndsAt`, `currentPeriodEnd`
- Targeting: `keywords[]`, `subreddits[]`, `productDescription`, `targetCustomer`
- Prefs: `emailEnabled`, `digestTime` (UTC hour), `digestFrequency`

**Opportunity** — one per matched post; `userId` → Profile
- Source: `platform` (reddit/hn), `externalId`, `url`, `title`, `body`, `subreddit`, `author`
- Scoring: `relevanceScore` (0–100), `intentLevel` (high/medium/low), `reasoning`, `suggestedReplies` (JSON)
- State: `viewed`, `replied`, `dismissed`, `includedInDigest`

**Feedback** — one per (user, opportunity); records `isRelevant` boolean

---

## Testing Locally

```bash
# Trigger post fetching (requires CRON_SECRET in .env.local)
curl -X POST http://localhost:3000/api/cron/fetch-posts \
  -H "Authorization: Bearer $CRON_SECRET"

# Trigger digest sending
curl -X POST http://localhost:3000/api/cron/send-digests \
  -H "Authorization: Bearer $CRON_SECRET"

# Test Stripe checkout (must be logged in — needs session cookie)
curl -X POST http://localhost:3000/api/stripe/checkout \
  -H "Cookie: <paste session cookie from browser>"

# Forward Stripe webhooks locally
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## Environment Variables

```bash
# Database
DATABASE_URL=             # Supabase Transaction Pooler URL (port 6543)
DIRECT_URL=               # Supabase direct URL (port 5432) — used by Prisma migrate only

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=      # e.g. https://launchradar.app (no trailing slash)

# AI
OPENAI_API_KEY=

# Email
RESEND_API_KEY=
RESEND_FROM_EMAIL=        # e.g. digest@launchradar.app

# Payments
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=          # Price ID for $19/month subscription
STRIPE_WEBHOOK_SECRET=    # whsec_... from Stripe Dashboard or `stripe listen`

# Caching
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Cron protection
CRON_SECRET=              # Arbitrary secret; sent as Bearer token by Vercel Cron
```
