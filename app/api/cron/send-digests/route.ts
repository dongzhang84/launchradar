import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { sendDailyDigest } from '@/lib/digest'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profiles = await prisma.profile.findMany({
    where: {
      emailEnabled: true,
      subscriptionStatus: { in: ['active', 'trialing'] },
      OR: [
        { trialEndsAt: null },
        { trialEndsAt: { gt: new Date() } },
      ],
    },
    select: { id: true },
  })

  const results = await Promise.allSettled(
    profiles.map((p) => sendDailyDigest(p.id))
  )

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const result of results) {
    if (result.status === 'rejected') {
      failed++
      console.error('[send-digests] sendDailyDigest failed:', result.reason)
    } else if (result.value.sent) {
      sent++
    } else {
      skipped++
    }
  }

  return NextResponse.json({ success: true, sent, skipped, failed })
}
