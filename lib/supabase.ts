import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Not typed against a generated Database schema: no live Supabase project
// exists yet to generate one from. Row shapes are enforced at the
// application boundary instead — see lib/types.ts and the call sites in
// lib/confirmation.ts / lib/actions.ts, which type their own inputs and
// outputs explicitly.
let client: ReturnType<typeof createClient> | null = null

/**
 * Service-role Supabase client, server-only. There is no visitor account on
 * this flow, so authorization comes from validating the token server-side
 * (see lib/confirmation.ts) rather than from Supabase RLS policies.
 */
export function getSupabaseServerClient() {
  if (client) return client

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.local.example to .env.local and fill in your Supabase project values.'
    )
  }

  client = createClient(url, key, {
    auth: { persistSession: false },
  })

  return client
}
