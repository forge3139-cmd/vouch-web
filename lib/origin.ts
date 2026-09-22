import 'server-only'
import { headers } from 'next/headers'

/**
 * The site's own origin, for building an OAuth redirect URL. Read from
 * request headers (same pattern as getClientIp in lib/rateLimit.ts) rather
 * than a configured env var, so it's automatically correct in every
 * environment (localhost, preview deploys, production) with nothing to
 * keep in sync. This is safe against a spoofed Host header specifically
 * because Supabase rejects any redirectTo that isn't in the project's
 * Redirect URLs allow-list — a forged origin just makes the OAuth call
 * fail, not redirect anywhere.
 */
export async function getOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
