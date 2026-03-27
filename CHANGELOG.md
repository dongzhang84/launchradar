# Changelog

All notable changes to LaunchRadar are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.3.0] — 2026-03-27

### Added
- **Inline suggested reply on opportunity cards** — the first AI-generated reply variation is now displayed directly on each card with a one-click Copy button and a "+N more variations in modal" hint; no need to open the modal to see a reply
- **Inline thread body preview** — the first 3 lines of the post body are shown on each card between the title and "Why relevant", giving context without leaving the dashboard
- **Reply generation during Scan Now** — `lib/refresh-opportunities.ts` now calls `generateReplies()` (GPT-4o) for all high/medium intent opportunities at scan time; low-intent posts keep `suggestedReplies: []` to limit API calls and stay within timeout
- **`hnFetchLimit` setting** — new `Int` field on `Profile` (default `50`); exposed as a number input (min 10, max 200) in the Keywords & Subreddits section of Settings; controls how many HN posts are fetched per scan

### Changed
- **Opportunity card title is now a clickable link** — clicking the title opens the source URL in a new tab directly; the separate "View Thread" button has been removed
- **Button label** updated from "Mark Replied" to "Mark as Replied"
- **OpenAI scoring parallelized** — `lib/scorer.ts` now runs all scoring batches with `Promise.all` instead of a sequential `for` loop; reduces scoring time from ~10–15 s to ~3–5 s for 30 posts
- **HN fetch reduced from 150 to 50 posts** (default) — cuts HN fetch time from ~3 s to ~1 s; configurable per user via `hnFetchLimit` setting

---

## [1.2.0] — 2026-03-25

### Added
- **Clear History** button in Settings (Danger Zone card) — shows an inline confirmation dialog before deleting all opportunities; displays "History cleared. Click Scan Now to find new opportunities." on success
- `DELETE /api/opportunities` — deletes all Opportunity records for the current user (session auth); returns `{ success: true, deleted: N }`

### Changed
- **Subreddit generation prompt** updated to target end-user communities instead of defaulting to generic founder/indie hacker subreddits; niche-specific subreddits are now preferred (e.g. `r/shopify` over `r/entrepreneur`); founder communities (`r/entrepreneur`, `r/startups`, `r/sideproject`, `r/indiehackers`) are only included when the product explicitly targets founders or developers
- **Reddit 404s are now silent** — `fetchSubredditPosts` no longer logs an error for nonexistent subreddits (HTTP 404); other non-2xx errors (403, 429, 5xx) still log as before

---

## [1.1.0] — 2026-03-24

### Added
- **Instant first scan** — onboarding now triggers a background `refreshOpportunitiesForUser` call immediately after saving the profile; results appear within 30–60 seconds without waiting for the daily cron
- `POST /api/opportunities/refresh` — on-demand scan endpoint authenticated via Supabase session; calls the shared refresh pipeline and returns `{ opportunitiesSaved: N }`; `maxDuration = 60` for Vercel
- `GET /api/opportunities/count` — lightweight polling endpoint returning `{ count: N }` for the current user
- **Scanning banner** — dashboard shows a blue "Scanning Reddit & HN…" banner when redirected with `?scanning=true`; polls `/api/opportunities/count` every 8 seconds and auto-refreshes the page once results arrive (or after 60 s)
- **Scan Now button** in Settings — triggers `/api/opportunities/refresh` and displays the count of new opportunities found
- `lib/refresh-opportunities.ts` — shared fetch/score/save pipeline extracted from the cron handler; used by both onboarding (fire-and-forget) and the on-demand refresh endpoint
- `NEXT_PUBLIC_REGISTRATION_OPEN` env var — gates new sign-ups; when `'false'`, `/auth/register` redirects to login, the register link is hidden on the login page, and landing page CTAs/pricing section are hidden

### Changed
- **Onboarding simplified** to a single textarea — user enters a product description only; the AI now infers the target customer automatically
- `lib/keyword-generator.ts` — removed `targetCustomer` parameter; the prompt instructs the model to infer the target audience from the product description
- `app/api/onboarding/route.ts` — replaced the two-step `generate-keywords` + `complete` flow with a single `save-and-scan` step; the legacy `generate-keywords` step is kept for the Settings re-generate button
- `app/auth/register/page.tsx` — converted to a server component wrapper that enforces the registration gate; the form itself moved to `RegisterForm.tsx` (client component)
- Landing page conditionally renders "Start Free Trial" CTAs and pricing section based on `NEXT_PUBLIC_REGISTRATION_OPEN`
- Stripe/subscription code disabled (block-commented) across `checkout/route.ts`, `webhook/route.ts`, and `BuyModal.tsx`; `BuyModal` exports a null-returning stub so existing imports compile

### Removed
- `targetCustomer` field removed from onboarding UI, Settings form, keyword generator call, and all Prisma selects (field still exists in schema)
- Subscription banner logic removed from dashboard server component (hardcoded to `banner={null}`)

---

## [0.8.0] — 2026-02-24

### Added
- Settings page with editable product description, target customer, keywords, and subreddits
- Re-generate Keywords button calls `/api/onboarding` to refresh keywords from updated product info
- Email preferences toggle and delivery time display
- Subscription status card with trial countdown and Upgrade to Pro button
- `PATCH /api/settings` route for persisting all settings fields

### Fixed
- Stats (opportunities found, replies made, skipped) now persist correctly on page refresh — counts are loaded server-side from Prisma rather than derived from client state

---

## [0.7.0] — 2026-02-24

### Added
- Stripe subscription flow at $19/month
- `POST /api/stripe/checkout` — creates Stripe Checkout Session with `profileId` in metadata and `customer_email` from Profile
- `POST /api/stripe/webhook` — handles `checkout.session.completed` (sets `subscriptionStatus: "active"`, saves `stripeCustomerId`) and `customer.subscription.deleted` (sets `subscriptionStatus: "canceled"`)
- `BuyModal` component (Shadcn Dialog) with feature list, animated loading spinner, and "Maybe later" dismiss link
- Upgrade Now button in dashboard trial/expired banners opens `BuyModal`
- Upgrade to Pro button in Settings page opens `BuyModal`
- `?upgraded=true` query param on return from Stripe shows success banner

### Fixed
- Webhook uses `request.text()` (not `request.json()`) to preserve raw body for Stripe signature verification
- Replaced "Stripe integration coming soon" placeholder in Settings with real `BuyModal`

---

## [0.6.0] — 2026-02-23

### Added
- Dashboard page with server-side data fetching (opportunities, stats, subscription status)
- `DashboardClient` — client component with filter tabs (All / High / Medium / Low intent), opportunity cards, and trial/expired/upgraded banners
- `OpportunityCard` — displays platform, subreddit, author, score, intent badge, reasoning, and action buttons
- `StatsBar` — shows opportunities found, replies made, and skipped counts
- `ReplyModal` — Shadcn Dialog showing suggested reply variations with "Mark as Replied" action
- `POST /api/opportunities/[id]/reply` — marks opportunity as replied in Prisma
- `POST /api/feedback` — records relevance feedback and dismisses opportunity
- Dismiss button on opportunity cards with optimistic UI update
- Header component with email display and settings/logout links

### Fixed
- Missing `/api/opportunities/[id]/reply` and `/api/feedback` routes that dashboard buttons depended on

---

## [0.5.0] — 2026-02-23

### Added
- `POST /api/cron/send-digests` — finds users with unsent opportunities, renders React Email template, sends via Resend
- `lib/digest.ts` — selects top opportunities per user, marks them as included in digest
- `lib/email-templates/digest.tsx` — React Email template with opportunity cards and reply CTAs
- `digestFrequency`, `emailEnabled`, and `digestTime` fields on Profile for per-user delivery preferences
- Vercel cron job configuration in `vercel.json` for daily digest at 08:00 UTC

---

## [0.4.0] — 2026-02-23

### Added
- OpenAI-powered opportunity scorer (`lib/scorer.ts`) — scores relevance 0–100, classifies intent as high/medium/low, generates reasoning and suggested reply variations
- Onboarding wizard (`app/onboarding/page.tsx`) — multi-step flow: product description → target customer → keyword review → completion
- `POST /api/onboarding` — handles `generate-keywords` step (calls OpenAI) and `complete` step (saves profile, sets `onboardingComplete: true`)
- `lib/keyword-generator.ts` — generates keywords and target subreddits from product description using OpenAI
- `suggestedReplies` stored as JSON on Opportunity model
- Redirect to `/onboarding` for users who have not completed onboarding

### Fixed
- Keyword matching switched from phrase-level to word-level matching — single-word keywords now correctly match within longer strings instead of requiring exact phrase presence

---

## [0.3.0] — 2026-02-22

### Added
- `POST /api/cron/fetch-posts` — fetches posts from Reddit and Hacker News, scores with OpenAI, stores in Opportunity table
- `lib/reddit.ts` — fetches posts from configured subreddits using Reddit's public `.json` API
- `lib/hn.ts` — fetches posts from Hacker News Algolia search API
- Upstash Redis deduplication — tracks seen `externalId` values to avoid re-processing posts
- `Opportunity` model in Prisma schema with full scoring fields

### Fixed
- Switched Reddit integration from OAuth to public `.json` API (`reddit.com/r/{sub}/new.json`) — OAuth credentials were unavailable in this environment
- Cron handler now limits to 30 posts per run with batch size of 10 to stay within Vercel's 10-second function timeout

---

## [0.2.0] — 2026-02-22

### Added
- Supabase email/password authentication with SSR cookie handling via `@supabase/ssr`
- Login (`/auth/login`) and Register (`/auth/register`) pages
- Next.js middleware protecting all routes except `/`, `/auth/*`, `/privacy`, `/terms`
- `Profile` model in Prisma with subscription fields (`stripeCustomerId`, `subscriptionStatus`, `trialEndsAt`, `currentPeriodEnd`)
- Prisma client singleton in `lib/db/client.ts` using `@prisma/adapter-pg` with SSL

### Fixed
- Prisma v7 requires explicit `PrismaPg` adapter — `new PrismaClient()` without an adapter throws at runtime; all instantiation goes through `lib/db/client.ts`
- `DATABASE_URL` must point to Supabase Transaction Pooler (port `6543`) — using the direct connection URL caused P1001 "Can't reach database server" errors in serverless functions

---

## [0.1.0] — 2026-02-17

### Added
- Next.js 16 project with App Router and TypeScript
- Tailwind CSS v4 with Shadcn UI components (Button, Card, Dialog, Input, Badge, Label, Textarea, DropdownMenu)
- Prisma ORM v7 with PostgreSQL via `@prisma/adapter-pg`
- Landing page (`app/page.tsx`) with hero, features, and pricing sections
- Privacy policy and Terms of Service pages
- `NEXT_PUBLIC_APP_URL` environment variable for base URL (not `NEXTAUTH_URL`)
