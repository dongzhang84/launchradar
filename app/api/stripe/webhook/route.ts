// PERSONAL TOOL: Stripe disabled
export {}

/*
import { type NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/db/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const profileId = session.metadata?.profileId
    const customerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id

    if (profileId) {
      await prisma.profile.update({
        where: { id: profileId },
        data: {
          subscriptionStatus: 'active',
          ...(customerId && { stripeCustomerId: customerId }),
        },
      })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id

    await prisma.profile.updateMany({
      where: { stripeCustomerId: customerId },
      data: { subscriptionStatus: 'canceled' },
    })
  }

  return NextResponse.json({ received: true })
}
*/
