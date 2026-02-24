'use client'

import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  email: string
}

export default function Header({ email }: HeaderProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
        <span className="text-base font-semibold tracking-tight">LaunchRadar</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:block">{email}</span>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  )
}
