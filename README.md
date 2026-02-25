# LaunchRadar

Monitor Reddit and Hacker News for people asking about problems your product solves. Get a daily digest of scored, high-intent conversations with AI-generated reply suggestions.

## What it does

1. You describe your product and target customer during onboarding
2. LaunchRadar generates relevant keywords and subreddits to watch
3. A daily cron fetches new posts, scores them with OpenAI (0–100 relevance, high/medium/low intent), and stores the best ones
4. You get a daily email digest with reply suggestions, or browse opportunities in the dashboard
5. Click through to reply directly on Reddit or HN

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Supabase** — auth + PostgreSQL
- **Prisma v7** — ORM with `@prisma/adapter-pg`
- **OpenAI** — scoring and reply generation
- **Stripe** — $19/month subscription
- **Resend + React Email** — digest emails
- **Upstash Redis** — deduplication
- **Vercel** — hosting + cron jobs

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

Copy `.env` to `.env.local` and fill in all values:

```bash
cp .env .env.local
```

See the full list of required variables in [`CLAUDE.md`](./CLAUDE.md#environment-variables).

> **Database URL:** Use the Supabase **Transaction Pooler** URL (port 6543), not the direct connection. Serverless functions can't hold persistent connections.

### 3. Run database migrations

```bash
npx prisma migrate dev
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Test the cron jobs manually

```bash
# Fetch and score new posts
curl -X POST http://localhost:3000/api/cron/fetch-posts \
  -H "Authorization: Bearer $CRON_SECRET"

# Send digest emails
curl -X POST http://localhost:3000/api/cron/send-digests \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 6. Test Stripe webhooks locally

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Deployment

Deployed on Vercel. Cron jobs are configured in `vercel.json` and run daily at 08:00 UTC.

Set all environment variables in the Vercel project dashboard before deploying. Add the Stripe webhook endpoint (`/api/stripe/webhook`) in the Stripe Dashboard and copy the signing secret to `STRIPE_WEBHOOK_SECRET`.

## Project structure

```
app/                    Pages and API routes (Next.js App Router)
  api/
    cron/               fetch-posts, send-digests
    stripe/             checkout, webhook
    onboarding/         keyword generation + profile completion
    settings/           profile settings PATCH
    feedback/           opportunity relevance feedback
    opportunities/      mark as replied
components/             React components
  BuyModal.tsx          Stripe checkout modal
  DashboardClient.tsx   Opportunity feed with filters
  ReplyModal.tsx        Suggested reply viewer
  SettingsClient.tsx    Settings forms
lib/
  db/client.ts          Prisma singleton (always import from here)
  scorer.ts             OpenAI relevance scoring
  reddit.ts             Reddit public .json API
  hn.ts                 Hacker News Algolia API
  digest.ts             Email digest logic
prisma/
  schema.prisma         Database schema
```

For a full file map and critical gotchas, see [`CLAUDE.md`](./CLAUDE.md).
For version history, see [`CHANGELOG.md`](./CHANGELOG.md).
