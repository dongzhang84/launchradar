import { type NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generateKeywordsAndSubreddits } from '@/lib/keyword-generator'
import { prisma } from '@/lib/db/client'

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

  if (step === 'generate-keywords') {
    const { productDescription, targetCustomer } = body as {
      productDescription: string
      targetCustomer: string
    }

    const result = await generateKeywordsAndSubreddits(productDescription, targetCustomer)
    return NextResponse.json(result)
  }

  if (step === 'save') {
    const { productDescription, targetCustomer, keywords, subreddits } = body as {
      productDescription: string
      targetCustomer: string
      keywords: string[]
      subreddits: string[]
    }

    await prisma.profile.upsert({
      where: { id: user.id },
      update: {
        productDescription,
        targetCustomer,
        keywords,
        subreddits,
        onboardingComplete: true,
      },
      create: {
        id: user.id,
        email: user.email ?? '',
        password: '',
        productDescription,
        targetCustomer,
        keywords,
        subreddits,
        onboardingComplete: true,
        subscriptionStatus: 'trialing',
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown step' }, { status: 400 })
}
