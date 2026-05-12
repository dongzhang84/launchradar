// One-shot script to switch LaunchRadar to a new monitoring direction.
//
// Usage: npx tsx scripts/update-direction.ts <email>
//
// To switch directions later, edit the constants below and re-run.
// Deletes stale opportunities from the previous direction, updates the
// profile fields the scorer/cron read from, then triggers an immediate scan.

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// Dynamic imports below — keep env loaded BEFORE any module that constructs
// an OpenAI client at module load time (lib/scorer, lib/reply-generator).

const PRODUCT_DESCRIPTION = `Monitoring Christian Reddit communities to surface PRODUCT OPPORTUNITIES for an AI-native Christian product (US market). We are NOT building a pastoral counseling service. We are NOT looking for people to comfort. We are looking for product feedback: what's broken in existing apps and what users wish existed. The signals we care about: (1) explicit product wishes — "I wish there was an app that...", "looking for an app that..."; (2) named complaints about specific existing apps — Hallow, YouVersion, Bible Chat, Pray.com, Glorify, Magisterium AI, Logos, Olive Tree, Faithlife, Creed, Aura, Truthly, Haven — covering pricing, AI accuracy / hallucinations / wrong scripture citation, shallowness, pushy gamification, lack of memory, theological errors; (3) using ChatGPT / Claude for spiritual or biblical questions with specific friction or product gap mentioned; (4) comparisons / recommendation requests between Christian AI tools. Flag posts that explicitly express willingness to pay. Flag posts where a pastor / priest / clergy / Christian creator gives an opinion on AI tools. Strongly down-score (below 40): pure spiritual struggle posts (grief, doubt, loneliness, suicidal thoughts, addiction, marriage problems) that do NOT reference an app or tool gap. Strongly down-score: theology debates (Calvinism vs Arminianism etc.), denominational arguments, political posts that do not relate to AI/tech.`

const TARGET_CUSTOMER = `US-based Christian users across Catholic, Protestant (Reformed, evangelical, mainline), and Orthodox traditions who are USERS or POTENTIAL USERS of Bible apps, prayer apps, and AI faith tools. Pastors, priests, deacons, and Christian creators whose opinions on AI tools matter. We do NOT target Christians purely in spiritual crisis or counseling-seeking mode — those are not product customers.`

const KEYWORDS = [
  // Explicit product wishes (highest priority)
  'wish there was an app',
  'wish there was a tool',
  'looking for an app',
  'does anyone know of an app',
  'need help finding an app',
  "why isn't there an app",
  'recommend an app',
  'is there a tool',
  'is there an app',
  'any app for',
  'app recommendation',
  // Existing products (catch complaints, comparisons, reviews)
  'Hallow',
  'YouVersion',
  'Bible Chat',
  'Pray.com',
  'Glorify',
  'Magisterium',
  'Logos Bible',
  'Olive Tree',
  'Faithlife',
  'Creed app',
  'Bible app',
  'prayer app',
  // AI x faith (product-angle keywords)
  'ChatGPT for prayer',
  'ChatGPT for Bible',
  'ChatGPT scripture',
  'asked ChatGPT',
  'asked Claude',
  'AI Bible',
  'AI prayer',
  'Christian AI',
  'Catholic AI',
  'AI for faith',
  // Pay signal
  'would pay for',
  'willing to pay',
]

const SUBREDDITS = [
  // Primary
  'Christianity',
  'Catholicism',
  'Reformed',
  'TrueChristian',
  'OrthodoxChristianity',
  'Christian',
  'ChristianApologetics',
  'ChristianMysticism',
  // Secondary (cross-reference)
  'exchristian',
  'AcademicBiblical',
  'Bible',
  'Prayer',
]

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: npx tsx scripts/update-direction.ts <email>')
    process.exit(1)
  }

  const { prisma } = await import('../lib/db/client')
  const { refreshOpportunitiesForUser } = await import('../lib/refresh-opportunities')

  const profile = await prisma.profile.findUnique({ where: { email } })
  if (!profile) {
    console.error(`No profile found for ${email}`)
    process.exit(1)
  }

  console.log(`Profile ${profile.id} (${email})`)
  console.log(`  Old subreddits: [${profile.subreddits.join(', ')}]`)
  console.log(`  Old keywords:   ${profile.keywords.length} keyword(s)`)

  const deleted = await prisma.opportunity.deleteMany({ where: { userId: profile.id } })
  console.log(`Deleted ${deleted.count} stale opportunity(ies) from previous direction.`)

  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      productDescription: PRODUCT_DESCRIPTION,
      targetCustomer: TARGET_CUSTOMER,
      keywords: KEYWORDS,
      subreddits: SUBREDDITS,
    },
  })

  console.log(`Updated profile to Christian AI direction.`)
  console.log(`  New subreddits (${SUBREDDITS.length}): ${SUBREDDITS.join(', ')}`)
  console.log(`  New keywords   (${KEYWORDS.length})`)

  console.log(`\nRunning initial scan...`)
  const count = await refreshOpportunitiesForUser(profile.id)
  console.log(`Initial scan complete: ${count} new opportunity(ies) saved.`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
