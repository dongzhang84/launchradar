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

const PRODUCT_DESCRIPTION = `Monitoring Christian Reddit communities to surface product opportunities for an AI-native Christian product (US market). The signals we care about: (1) explicit product wishes ("I wish there was an app that...", "looking for an app that..."); (2) complaints about existing Bible / prayer / AI faith apps (Hallow, YouVersion, Bible Chat, Pray.com, Glorify, Magisterium AI, Logos, Olive Tree, Faithlife, Creed, Aura, Truthly, Haven) covering pricing, accuracy/hallucinations, shallowness, pushy gamification, lack of memory, theological errors; (3) spiritual life friction — grief, addiction, marriage difficulty, parenting faith questions, vocational/marriage/career discernment, doubt, deconstruction, faith crisis, loneliness in faith, hesitation to ask pastor about taboo or shameful questions; (4) AI-specific discourse — using ChatGPT/Claude for spiritual or biblical questions, theological/ethical concerns about AI in faith, comparisons between Christian AI tools. Flag posts that express willingness to pay. Flag posts where a pastor / priest / clergy / Christian creator gives an opinion on AI tools. Skip pure theological debates (e.g. Calvinism vs Arminianism) unless they tie to tools/apps. Skip pure political posts unless they tie to AI/tech.`

const TARGET_CUSTOMER = `US-based Christian users across Catholic, Protestant (Reformed, evangelical, mainline), and Orthodox traditions. Users of Bible apps, prayer apps, and AI faith tools. Both engaged believers and those in spiritual struggle, doubt, deconstruction, or grief. Includes pastors, priests, deacons, and Christian creators whose opinions on AI tools carry weight in their communities.`

const KEYWORDS = [
  // Explicit product wishes
  'wish there was an app',
  'looking for an app',
  'does anyone know of an app',
  'need help finding',
  "why isn't there",
  'recommend an app',
  'is there a tool',
  // Existing products (catch complaints / comparisons)
  'Hallow',
  'YouVersion',
  'Bible Chat',
  'Pray.com',
  'Glorify',
  'Magisterium',
  'Logos',
  'Olive Tree',
  'Faithlife',
  'Creed app',
  // AI x faith
  'ChatGPT for prayer',
  'ChatGPT Bible',
  'ChatGPT scripture',
  'AI Bible',
  'AI for spiritual',
  'Christian AI',
  'Catholic AI',
  // Life friction
  'ask my pastor',
  'afraid to ask',
  'too embarrassed to ask',
  'deconstruction',
  'faith crisis',
  'spiritual struggle',
  'lost my faith',
  'doubting',
  'grieving',
  'addiction',
  'marriage struggle',
  'discernment',
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
