import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/auth/client'
import { loadApplicantForUser } from '@/lib/auth/session'
import { ensureIdentitySlug } from '@/lib/auth/slug'
import { recordFunnelEvent } from '@/lib/funnel'

/**
 * Where Google (via Supabase) sends the browser back to after the consent
 * screen. `code` is the PKCE authorization code; `exchangeCodeForSession`
 * reads back the verifier cookie `signInWithGoogleAction` set before
 * leaving, completes the exchange, and writes the session as HttpOnly
 * cookies through the same client — no browser-side Supabase client
 * involved at any point.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const jobSlug = url.searchParams.get('jobSlug')
  const visitorId = url.searchParams.get('visitorId')
  const oauthError = url.searchParams.get('error')

  const rawNext = url.searchParams.get('next') ?? '/'
  const safeNext = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

  function fail() {
    const target = new URL(safeNext, url.origin)
    target.searchParams.set('googleError', '1')
    return NextResponse.redirect(target)
  }

  if (oauthError || !code) {
    // A cancelled consent screen lands here too — not an error worth
    // logging, just an incomplete sign-in.
    return fail()
  }

  const supabase = await createAuthClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('[auth/callback] exchangeCodeForSession failed', error)
    return fail()
  }

  const applicant = await loadApplicantForUser(data.user)
  if (!applicant) {
    // The signup trigger didn't produce an identities row — same failure
    // mode as email/password signup, handled the same way.
    await supabase.auth.signOut()
    return fail()
  }

  if (!applicant.slug) {
    try {
      await ensureIdentitySlug(applicant.identityId, applicant.name, null)
    } catch (e) {
      console.error('[auth/callback] slug generation failed', e)
    }
  }

  if (jobSlug && visitorId) {
    // Supabase's own auth.users.created_at doesn't move when a new
    // provider links to an existing account, only on first-ever creation —
    // so "just created" (within this request's round trip) means this was
    // a brand new VOUCH account, not a Google sign-in linked to an
    // existing one.
    const justCreated = Date.now() - new Date(data.user.created_at).getTime() < 60_000
    await recordFunnelEvent({
      event: justCreated ? 'signed_up' : 'signed_in',
      jobSlug,
      visitorId,
      identityId: applicant.identityId,
    })
  }

  return NextResponse.redirect(new URL(safeNext, url.origin))
}
