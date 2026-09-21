import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { AUTH_COOKIE_OPTIONS, getAuthEnv } from './cookies'

/**
 * Supabase client acting AS THE SIGNED-IN USER (publishable key + the
 * session from the request's HttpOnly cookies), so Row Level Security
 * applies to everything it reads. Distinct from lib/supabase.ts, which is
 * the service-role client that bypasses RLS. Created fresh per request,
 * never shared.
 */
export async function createAuthClient() {
  const env = getAuthEnv()
  if (!env) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY. Add the project’s publishable (anon) key to .env.local.'
    )
  }

  const store = await cookies()

  return createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        // Writing cookies only works in Server Actions and Route Handlers.
        // From a Server Component it throws — harmless, because proxy.ts
        // refreshes the session before the page renders.
        try {
          for (const { name, value, options } of list) {
            store.set(name, value, { ...options, ...AUTH_COOKIE_OPTIONS })
          }
        } catch {
          // Called from a Server Component; see above.
        }
      },
    },
  })
}
