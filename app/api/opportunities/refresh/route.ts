import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { refreshOpportunitiesForUser } from '@/lib/refresh-opportunities'

export const maxDuration = 60

export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const opportunitiesSaved = await refreshOpportunitiesForUser(user.id)
    return NextResponse.json({ success: true, opportunitiesSaved })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[refresh] Unhandled error:', message)
    return NextResponse.json({ success: false, error: message })
  }
}
