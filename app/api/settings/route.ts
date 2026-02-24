import { type NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db/client'

export async function PATCH(request: NextRequest) {
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

  // Build update from whichever fields were sent
  const data: {
    productDescription?: string
    targetCustomer?: string
    keywords?: string[]
    subreddits?: string[]
    emailEnabled?: boolean
    digestTime?: number
  } = {}

  if ('productDescription' in body) data.productDescription = body.productDescription as string
  if ('targetCustomer'     in body) data.targetCustomer     = body.targetCustomer     as string
  if ('keywords'           in body) data.keywords           = body.keywords           as string[]
  if ('subreddits'         in body) data.subreddits         = body.subreddits         as string[]
  if ('emailEnabled'       in body) data.emailEnabled       = body.emailEnabled       as boolean
  if ('digestTime'         in body) data.digestTime         = body.digestTime         as number

  await prisma.profile.update({ where: { id: user.id }, data })

  return NextResponse.json({ success: true })
}
