// Shared by the server client, the proxy and the session helper. No
// server-only import on purpose: proxy.ts pulls this in too.

/** Every auth cookie is written HttpOnly (JavaScript can't read it), Secure
 * in production, and SameSite=Lax. Applied on top of whatever options
 * @supabase/ssr suggests — its own defaults are browser-readable, which is
 * exactly what we don't want, since this project has no browser-side
 * Supabase client and never stores a session in localStorage. */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

/** True if the request carries a Supabase auth cookie at all. Lets public
 * pages skip every auth call for the (vast majority of) visitors who have
 * none, so anonymous browsing stays exactly as cheap as before. */
export function hasAuthCookie(cookies: { name: string }[]): boolean {
  return cookies.some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))
}

export function getAuthEnv(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
  return url && key ? { url, key } : null
}
