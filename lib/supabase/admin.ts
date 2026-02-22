import { createClient } from '@supabase/supabase-js'

// Admin client bypasses Row Level Security — only use in server-side code (Route Handlers, Server Actions).
// Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
