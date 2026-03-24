# LaunchRadar


Monitor Reddit and Hacker News for high-intent conversations where people are asking about problems your product solves. LaunchRadar scores each match with AI, surfaces the best opportunities in a dashboard, and emails you a daily digest with ready-to-use reply suggestions.

**Live demo:** https://launchradar-five.vercel.app

---

## How it works

1. **Onboarding** — describe your product and target customer
2. **Keyword generation** — OpenAI generates relevant keywords and subreddits to watch
3. **Daily fetch** — a cron job scrapes Reddit and Hacker News for new posts, scores each one 0–100 for relevance and tags intent (high / medium / low)
4. **Dashboard** — browse and filter opportunities; click through to reply on Reddit or HN
5. **Digest email** — receive a daily summary of the top opportunities with AI-generated reply suggestions

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Database | PostgreSQL via Supabase |
| ORM | Prisma v7 with `@prisma/adapter-pg` |
| Auth | Supabase SSR (`@supabase/ssr`) |
| AI | OpenAI (GPT-4o-mini for scoring, GPT-4o for keywords) |
| Payments | Stripe (hosted Checkout, $19/month) |
| Email | Resend + React Email |
| Caching | Upstash Redis (deduplication) |
| UI | Shadcn/ui + Tailwind CSS v4 |
| Hosting | Vercel (serverless + cron jobs) |

---

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works)
- An [OpenAI](https://platform.openai.com) API key
- A [Stripe](https://stripe.com) account (test mode is fine)
- A [Resend](https://resend.com) account (free tier works)
- An [Upstash Redis](https://upstash.com) database (free tier works)

---

## Local development

### 1. Clone and install

```bash
git clone https://github.com/your-username/launchradar.git
cd launchradar
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database → Connection string**
3. Copy the **Transaction Pooler** URL (port `6543`) — this is your `DATABASE_URL`
4. Copy the **Direct connection** URL (port `5432`) — this is your `DIRECT_URL` (used only for migrations)
5. From **Project Settings → API**, copy your `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`

> **Why Transaction Pooler?** Serverless functions can't hold persistent database connections. The Transaction Pooler (port 6543) handles connection management; the direct URL (port 5432) would cause `P1001` errors in production.

### 3. Set up Stripe

1. Create a product and price in the [Stripe Dashboard](https://dashboard.stripe.com) (or use test mode)
2. Set the price to **$19/month recurring** — copy the `price_...` ID as `STRIPE_PRICE_ID`
3. Copy your **Secret key** (`sk_test_...`) as `STRIPE_SECRET_KEY`
4. You'll add `STRIPE_WEBHOOK_SECRET` after setting up the webhook (step 7)

### 4. Set up Resend

1. Create an account at [resend.com](https://resend.com)
2. Copy your API key as `RESEND_API_KEY`
3. For `RESEND_FROM_EMAIL`, use `onboarding@resend.dev` until you verify a custom domain

### 5. Set up Upstash Redis

1. Create a Redis database at [upstash.com](https://upstash.com)
2. Copy the **REST URL** and **REST Token** as `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### 6. Configure environment variables

Copy the example file and fill in all values:

```bash
cp .env.example .env.local
```

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Database — MUST be Transaction Pooler URL (port 6543)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
# Direct URL (port 5432) — used only by `prisma migrate`
DIRECT_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...   # leave blank until step 7

# Cron authentication (any random secret)
CRON_SECRET=your-random-secret    # generate with: openssl rand -base64 32
```

### 7. Run database migrations

```bash
npx prisma migrate dev
```

### 8. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 9. Set up Stripe webhooks (local)

In a separate terminal:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the `whsec_...` secret that appears and set it as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

### 10. Test the cron jobs

```bash
# Fetch Reddit + HN posts, score them, store opportunities
curl -X POST http://localhost:3000/api/cron/fetch-posts \
  -H "Authorization: Bearer $CRON_SECRET"

# Send digest emails to all users with email enabled
curl -X POST http://localhost:3000/api/cron/send-digests \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Deployment (Vercel)

1. Push to GitHub and import the repo in [Vercel](https://vercel.com)
2. Set all environment variables in **Project Settings → Environment Variables** (use production Stripe keys and your live domain for `NEXT_PUBLIC_APP_URL`)
3. Add a Stripe webhook endpoint in the Stripe Dashboard pointing to `https://your-domain.com/api/stripe/webhook` with the `checkout.session.completed` and `customer.subscription.deleted` events. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`
4. Cron jobs are pre-configured in `vercel.json` to run daily at 08:00 UTC

---

## Project structure

```
app/
  page.tsx                    Landing page
  dashboard/page.tsx          Dashboard (server component)
  onboarding/page.tsx         Multi-step onboarding wizard
  settings/page.tsx           Settings page
  auth/login|register/        Supabase email/password auth
  api/
    cron/fetch-posts/         Scrapes Reddit + HN, scores with OpenAI, stores opportunities
    cron/send-digests/        Sends daily digest emails via Resend
    stripe/checkout/          Creates Stripe Checkout Session
    stripe/webhook/           Handles Stripe events (raw body — do not change to .json())
    onboarding/               Generates keywords + marks onboarding complete
    settings/                 PATCH profile settings
    feedback/                 Records opportunity relevance feedback
    opportunities/[id]/reply/ Marks opportunity as replied

components/
  DashboardClient.tsx         Filter tabs + opportunity feed
  OpportunityCard.tsx         Individual opportunity with action buttons
  ReplyModal.tsx              AI-suggested reply viewer
  BuyModal.tsx                Stripe subscription checkout modal
  SettingsClient.tsx          Settings forms
  StatsBar.tsx                Stats counters (found / replied / skipped)
  Header.tsx                  Top nav

lib/
  db/client.ts                Prisma singleton — always import from here
  supabase/server.ts          Server-side Supabase client
  supabase/client.ts          Browser Supabase client
  scorer.ts                   OpenAI relevance scoring (0–100 + intent + reply suggestions)
  keyword-generator.ts        OpenAI keyword + subreddit generation
  reddit.ts                   Reddit public .json API fetcher (no OAuth needed)
  hn.ts                       Hacker News Algolia API fetcher
  digest.ts                   Selects top opportunities for digest email
  email-templates/digest.tsx  React Email digest template

prisma/
  schema.prisma               Database schema (Profile, Opportunity, Feedback)
```

---

## Database schema

**Profile** — one per user; `id` matches the Supabase auth UID

**Opportunity** — one per matched post; `userId` → Profile; stores relevance score (0–100), intent level, AI reasoning, and suggested replies

**Feedback** — records thumbs-up/down on each opportunity for future model improvements

See [`prisma/schema.prisma`](./prisma/schema.prisma) for the full schema.

---

## Key implementation notes

- **No Reddit OAuth** — all Reddit fetching uses the public `.json` API (`reddit.com/r/{sub}/new.json`). No credentials required.
- **Prisma v7 requires an adapter** — always use `lib/db/client.ts`; never call `new PrismaClient()` without the `@prisma/adapter-pg` adapter.
- **Stripe webhook uses `request.text()`** — the raw body is required for signature verification; `request.json()` breaks this.
- **Auth model is `Profile`** — there is no `User` model in Prisma; the Supabase auth UID is used as the `Profile.id`.

---

## Contributing

Pull requests are welcome. For significant changes, open an issue first to discuss what you'd like to change.

1. Fork the repo and create a branch: `git checkout -b my-feature`
2. Make your changes and test locally
3. Open a pull request with a clear description of what changed and why

---

## License

MIT
