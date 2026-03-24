// PERSONAL TOOL: Stripe disabled
export {}

/*
import { type NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(_request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, email: true },
  })

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: process.env.NEXT_PUBLIC_APP_URL + '/dashboard?upgraded=true',
    cancel_url: process.env.NEXT_PUBLIC_APP_URL + '/dashboard',
    customer_email: profile.email,
    metadata: { profileId: profile.id },
  })

  return NextResponse.json({ url: session.url })
}
*/
