import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db/client'
import DashboardClient from '@/components/DashboardClient'
import type { SerializedOpportunity, DashboardBanner } from '@/components/DashboardClient'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: {
      opportunitiesFound: true,
      repliesMade: true,
      conversions: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      onboardingComplete: true,
    },
  })

  if (!profile || !profile.onboardingComplete) redirect('/onboarding')

  const rawOpportunities = await prisma.opportunity.findMany({
    where: { userId: user.id, dismissed: false },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const opportunities: SerializedOpportunity[] = rawOpportunities.map((opp) => ({
    id: opp.id,
    platform: opp.platform,
    url: opp.url,
    title: opp.title,
    body: opp.body,
    subreddit: opp.subreddit,
    author: opp.author,
    commentCount: opp.commentCount,
    score: opp.score,
    postedAt: opp.postedAt.toISOString(),
    relevanceScore: opp.relevanceScore,
    intentLevel: opp.intentLevel,
    reasoning: opp.reasoning,
    suggestedReplies: opp.suggestedReplies,
    replied: opp.replied,
    createdAt: opp.createdAt.toISOString(),
  }))

  const now = new Date()
  const { trialEndsAt, subscriptionStatus } = profile
  const daysRemaining = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const { upgraded } = await searchParams

  let banner: DashboardBanner = null
  if (upgraded === 'true') {
    banner = { type: 'upgraded' }
  } else if (trialEndsAt && trialEndsAt <= now && subscriptionStatus !== 'active') {
    banner = { type: 'expired' }
  } else if (subscriptionStatus === 'trialing' && daysRemaining > 0) {
    banner = { type: 'trial', daysRemaining }
  }

  return (
    <DashboardClient
      opportunities={opportunities}
      stats={{
        opportunitiesFound: profile.opportunitiesFound,
        repliesMade: profile.repliesMade,
        conversions: profile.conversions,
      }}
      banner={banner}
    />
  )
}
