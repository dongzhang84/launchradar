import React from 'react'
import { Resend } from 'resend'
import { prisma } from '@/lib/db/client'
import { generateReplies, type ReplyVariation } from '@/lib/reply-generator'
import DigestEmail from '@/lib/email-templates/digest'

const resend = new Resend(process.env.RESEND_API_KEY)

const intentOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }

export async function sendDailyDigest(
  profileId: string
): Promise<{ sent: boolean; count: number }> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      email: true,
      productDescription: true,
      targetCustomer: true,
      opportunitiesFound: true,
      repliesMade: true,
      conversions: true,
    },
  })

  if (!profile) return { sent: false, count: 0 }

  // Fetch candidates — over-fetch so we can sort by intentLevel in memory,
  // since Prisma can't sort "high → medium → low" alphabetically.
  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000)
  const candidates = await prisma.opportunity.findMany({
    where: {
      userId: profileId,
      relevanceScore: { gt: 70 },
      dismissed: false,
      includedInDigest: false,
      postedAt: { gt: cutoff },
    },
    orderBy: { relevanceScore: 'desc' },
    take: 20,
  })

  const opportunities = candidates
    .sort((a, b) => {
      const intentDiff =
        (intentOrder[a.intentLevel] ?? 3) - (intentOrder[b.intentLevel] ?? 3)
      return intentDiff !== 0 ? intentDiff : b.relevanceScore - a.relevanceScore
    })
    .slice(0, 5)

  if (opportunities.length === 0) return { sent: false, count: 0 }

  // Generate replies for each opportunity in parallel, isolating failures.
  const repliesMap = new Map<string, ReplyVariation[]>()
  await Promise.all(
    opportunities.map(async (opp) => {
      try {
        const replies = await generateReplies(
          { title: opp.title, body: opp.body ?? '', subreddit: opp.subreddit },
          {
            productDescription: profile.productDescription ?? '',
            targetCustomer: profile.targetCustomer ?? '',
          }
        )
        repliesMap.set(opp.id, replies)
        await prisma.opportunity.update({
          where: { id: opp.id },
          data: { suggestedReplies: replies as object[] },
        })
      } catch {
        repliesMap.set(opp.id, [])
      }
    })
  )

  // Map DB rows → DigestEmail shape.
  // DB stores platform as "hn"; email template expects "hackernews".
  const emailOpportunities = opportunities.map((opp) => ({
    id: opp.id,
    title: opp.title,
    subreddit: opp.subreddit,
    platform: (opp.platform === 'hn' ? 'hackernews' : 'reddit') as
      | 'reddit'
      | 'hackernews',
    url: opp.url,
    intentLevel: opp.intentLevel as 'high' | 'medium' | 'low',
    reasoning: opp.reasoning,
    postedAt: opp.postedAt,
    commentCount: opp.commentCount,
    firstReplyText: repliesMap.get(opp.id)?.[0]?.text ?? '',
  }))

  const n = opportunities.length
  const subject = `🎯 ${n} ${n === 1 ? 'opportunity' : 'opportunities'} to find customers today`

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: profile.email,
    subject,
    react: React.createElement(DigestEmail, {
      opportunities: emailOpportunities,
      stats: {
        opportunitiesFound: profile.opportunitiesFound,
        repliesMade: profile.repliesMade,
        conversions: profile.conversions,
      },
      baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',
    }),
  })

  // Mark all sent opportunities and bump the profile counter atomically.
  await Promise.all([
    prisma.opportunity.updateMany({
      where: { id: { in: opportunities.map((o) => o.id) } },
      data: { includedInDigest: true },
    }),
    prisma.profile.update({
      where: { id: profileId },
      data: { opportunitiesFound: { increment: n } },
    }),
  ])

  return { sent: true, count: n }
}
