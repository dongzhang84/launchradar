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
      targetCustomer: true,
      keywords: true,
      subreddits: true,
      emailEnabled: true,
      digestTime: true,
      subscriptionStatus: true,
      trialEndsAt: true,
    },
  })

  if (!profile) redirect('/auth/login')

  return (
    <>
      <Header email={user.email ?? ''} />
      <SettingsClient
        profile={{
          productDescription: profile.productDescription ?? '',
          targetCustomer: profile.targetCustomer ?? '',
          keywords: profile.keywords,
          subreddits: profile.subreddits,
          emailEnabled: profile.emailEnabled,
          digestTime: profile.digestTime,
          subscriptionStatus: profile.subscriptionStatus ?? null,
          trialEndsAt: profile.trialEndsAt?.toISOString() ?? null,
        }}
      />
    </>
  )
}
