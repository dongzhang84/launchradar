import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db/client'
import Header from '@/components/Header'
import SettingsClient from '@/components/SettingsClient'

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: {
      productDescription: true,
      // targetCustomer: true,  // no longer displayed (v1.1 step 6)
      keywords: true,
      subreddits: true,
      hnFetchLimit: true,
      emailEnabled: true,
      digestTime: true,
      // subscriptionStatus: true,  // PERSONAL TOOL: Stripe disabled
      // trialEndsAt: true,          // PERSONAL TOOL: Stripe disabled
    },
  })

  if (!profile) redirect('/auth/login')

  return (
    <>
      <Header email={user.email ?? ''} />
      <SettingsClient
        profile={{
          productDescription: profile.productDescription ?? '',
          keywords: profile.keywords,
          subreddits: profile.subreddits,
          hnFetchLimit: profile.hnFetchLimit,
          emailEnabled: profile.emailEnabled,
          digestTime: profile.digestTime,
          // subscriptionStatus: profile.subscriptionStatus ?? null,  // PERSONAL TOOL: Stripe disabled
          // trialEndsAt: profile.trialEndsAt?.toISOString() ?? null,  // PERSONAL TOOL: Stripe disabled
        }}
      />
    </>
  )
}
