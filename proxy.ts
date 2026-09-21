import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { AUTH_COOKIE_OPTIONS, getAuthEnv, hasAuthCookie } from '@/lib/auth/cookies'

/**
 * Keeps a signed-in applicant's session fresh. Access tokens are short
 * lived; this refreshes them and writes the new cookies (HttpOnly) back
 * before the page renders, because Server Components can't set cookies.
 *
 * Scoped by the matcher to the two places auth matters, and a no-op for
 * any request without an auth cookie — so the directory, profiles, work
 * requests and confirmations never touch it and work exactly as before.
 */
export async function proxy(request: NextRequest) {
  const env = getAuthEnv()
  if (!env || !hasAuthCookie(request.cookies.getAll())) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list, headers) {
        for (const { name, value } of list) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of list) {
          response.cookies.set(name, value, { ...options, ...AUTH_COOKIE_OPTIONS })
        }
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value)
      },
    },
  })

  // Validates the token with Supabase's auth server and refreshes it if needed.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: ['/j/:path*', '/applications'],
}
