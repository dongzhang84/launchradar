'use server'

import { prisma } from '@/lib/db/client'

export async function createProfile(userId: string, email: string) {
  await prisma.profile.create({
    data: {
      id: userId,
      email,
      subscriptionStatus: 'trialing',
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      // password is required by the current schema but unused — Supabase owns auth.
      // Make this field optional in your schema: password String?
      password: '',
    },
  })
}
