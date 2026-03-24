import { type NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generateKeywordsAndSubreddits } from '@/lib/keyword-generator'
import { prisma } from '@/lib/db/client'
import { refreshOpportunitiesForUser } from '@/lib/refresh-opportunities'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { step } = body

  if (step === 'save-and-scan') {
    const { productDescription } = body as { productDescription: string }

    // Generate keywords and subreddits from product description (user never sees this)
    const { keywords, subreddits } = await generateKeywordsAndSubreddits(productDescription)

    // Save profile
    await prisma.profile.upsert({
      where: { id: user.id },
      update: {
        productDescription,
        keywords,
        subreddits,
        onboardingComplete: true,
      },
      create: {
        id: user.id,
        email: user.email ?? '',
        password: '',
        productDescription,
        keywords,
        subreddits,
        onboardingComplete: true,
        subscriptionStatus: 'trialing',
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    // Fire and forget — scan runs in background, we return immediately
    refreshOpportunitiesForUser(user.id).catch((err) =>
      console.error('[onboarding] background refresh failed:', err)
    )

    return NextResponse.json({ success: true })
  }

  // Legacy steps kept for reference but no longer used by the UI
  if (step === 'generate-keywords') {
    const { productDescription } = body as { productDescription: string }
    const result = await generateKeywordsAndSubreddits(productDescription)
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Unknown step' }, { status: 400 })
}
