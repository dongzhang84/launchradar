import { type NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db/client'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { opportunityId: string; isRelevant: boolean; reason?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { opportunityId, isRelevant, reason } = body

  await Promise.all([
    // Mark the opportunity as dismissed in the Opportunity table
    prisma.opportunity.updateMany({
      where: { id: opportunityId, userId: user.id },
      data: { dismissed: true },
    }),
    // Record the feedback for ML/tuning purposes
    prisma.feedback.upsert({
      where: { userId_opportunityId: { userId: user.id, opportunityId } },
      update: { isRelevant, reason },
      create: { userId: user.id, opportunityId, isRelevant, reason },
    }),
  ])

  return NextResponse.json({ success: true })
}
