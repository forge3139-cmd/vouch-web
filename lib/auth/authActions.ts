'use server'

import { redirect } from 'next/navigation'
import { createAuthClient } from './client'
import { getAuthEnv } from './cookies'
import { loadApplicantForUser, toApplicantView, type ApplicantView } from './session'
import { getClientIp, isRateLimited, recordAttempt } from '../rateLimit'
import { recordFunnelEvent } from '../funnel'
import { parseContact } from '../phone'
import { ensureIdentitySlug } from './slug'
import { getOrigin } from '../origin'

export type AuthErrorCode =
  | 'required'
  | 'badContact'
  | 'weakPassword'
  | 'invalid'
  | 'exists'
  | 'confirmEmail'
  | 'setupFailed'
  | 'tooMany'
  | 'unconfigured'
  | 'googleFailed'
  | 'generic'

export type AuthResult = { ok: true; applicant: ApplicantView } | { ok: false; error: AuthErrorCode }

// Wrong passwords from one IP: ten in 15 minutes and that IP is blocked for
// the rest of the window. Only FAILURES count, so signing in normally never
// trips it. Signups are capped per hour.
const SIGNIN_FAILURE_LIMIT = 10
const SIGNIN_WINDOW_MS = 15 * 60 * 1000
const SIGNUP_LIMIT = 5
const SIGNUP_WINDOW_MS = 60 * 60 * 1000
const MIN_PASSWORD_LENGTH = 6 // Supabase's default minimum

function funnelContext(formData: FormData): { jobSlug: string; visitorId: string } | null {
  const jobSlug = String(formData.get('jobSlug') ?? '')
  const visitorId = String(formData.get('visitorId') ?? '')
  return jobSlug && visitorId ? { jobSlug, visitorId } : null
}

export async function signInAction(formData: FormData): Promise<AuthResult> {
  if (!getAuthEnv()) return { ok: false, error: 'unconfigured' }

  const ip = await getClientIp()
  const limitKey = `auth-signin:${ip}`
  if (isRateLimited(limitKey, SIGNIN_FAILURE_LIMIT)) return { ok: false, error: 'tooMany' }

  const contact = String(formData.get('contact') ?? '')
  const password = String(formData.get('password') ?? '')
  if (!contact.trim() || !password) return { ok: false, error: 'required' }

  const supabase = await createAuthClient()
  const parsed = parseContact(contact)

  // Same fallback as the mobile app: try the normalised form first, then
  // exactly what was typed. An account made before this rule existed may
  // still have its phone stored as typed (0712…) rather than normalised
  // (+255712…), and this is what keeps it able to sign in either way.
  let result: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>
  if (parsed?.kind === 'email' || (!parsed && contact.includes('@'))) {
    result = await supabase.auth.signInWithPassword({ email: parsed?.value ?? contact.trim(), password })
  } else {
    const typed = contact.trim()
    const normalised = parsed?.value ?? typed
    result = await supabase.auth.signInWithPassword({ phone: normalised, password })
    if (result.error && normalised !== typed) {
      result = await supabase.auth.signInWithPassword({ phone: typed, password })
    }
  }

  if (result.error || !result.data.user) {
    recordAttempt(limitKey, SIGNIN_FAILURE_LIMIT, SIGNIN_WINDOW_MS)
    // Deliberately one message for "no such account" and "wrong password".
    return { ok: false, error: 'invalid' }
  }

  const applicant = await loadApplicantForUser(result.data.user)
  if (!applicant) {
    await supabase.auth.signOut()
    return { ok: false, error: 'setupFailed' }
  }

  const ctx = funnelContext(formData)
  if (ctx) await recordFunnelEvent({ event: 'signed_in', ...ctx, identityId: applicant.identityId })

  return { ok: true, applicant: toApplicantView(applicant) }
}

// Initiating the OAuth round trip isn't password-guessable, but it's still
// a real request to Supabase/Google — a sane ceiling for a script, not a
// limit anyone real will meet.
const GOOGLE_INITIATE_LIMIT = 20
const GOOGLE_INITIATE_WINDOW_MS = 60 * 60 * 1000

/**
 * Redirects the browser to Google's consent screen via Supabase's OAuth
 * endpoint. Whether this signs into an existing VOUCH account or creates a
 * new one is entirely Supabase's own account-linking behaviour — it links
 * automatically when the Google account's email matches an existing,
 * verified VOUCH account's email; otherwise it creates a new one. Nothing
 * custom is done here, and there's nothing to do here to change that; it's
 * controlled by the Supabase Dashboard configuration this depends on.
 *
 * `next` is where to send them back to once the round trip to Google
 * finishes; sanitised again in the callback route before it's ever used as
 * a redirect target, since it arrives back over the open internet.
 */
export async function signInWithGoogleAction(formData: FormData): Promise<{ error: AuthErrorCode }> {
  if (!getAuthEnv()) return { error: 'unconfigured' }

  const ip = await getClientIp()
  if (recordAttempt(`auth-google:${ip}`, GOOGLE_INITIATE_LIMIT, GOOGLE_INITIATE_WINDOW_MS)) {
    return { error: 'tooMany' }
  }

  const next = String(formData.get('next') ?? '/')
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'
  const jobSlug = String(formData.get('jobSlug') ?? '')
  const visitorId = String(formData.get('visitorId') ?? '')

  const origin = await getOrigin()
  const callback = new URL('/auth/callback', origin)
  callback.searchParams.set('next', safeNext)
  if (jobSlug && visitorId) {
    callback.searchParams.set('jobSlug', jobSlug)
    callback.searchParams.set('visitorId', visitorId)
  }

  const supabase = await createAuthClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callback.toString() },
  })

  if (error || !data.url) {
    console.error('[signInWithGoogleAction] signInWithOAuth failed', error)
    return { error: 'googleFailed' }
  }

  // Throws — Next.js turns this into a client-side navigation to Google's
  // consent screen, including across the Server Action network boundary.
  redirect(data.url)
}

export async function signUpAction(formData: FormData): Promise<AuthResult> {
  if (!getAuthEnv()) return { ok: false, error: 'unconfigured' }

  const ip = await getClientIp()
  if (recordAttempt(`auth-signup:${ip}`, SIGNUP_LIMIT, SIGNUP_WINDOW_MS)) return { ok: false, error: 'tooMany' }

  const name = String(formData.get('name') ?? '').trim().slice(0, 100)
  const password = String(formData.get('password') ?? '')
  const contactRaw = String(formData.get('contact') ?? '')

  if (!name || !contactRaw.trim() || !password) return { ok: false, error: 'required' }
  const parsed = parseContact(contactRaw)
  if (!parsed) return { ok: false, error: 'badContact' }
  if (password.length < MIN_PASSWORD_LENGTH) return { ok: false, error: 'weakPassword' }

  const supabase = await createAuthClient()
  const credentials = parsed.kind === 'email' ? { email: parsed.value } : { phone: parsed.value }
  // display_name in the metadata is what the database trigger reads to
  // create the identities row — the same field the mobile app sends.
  const { data, error } = await supabase.auth.signUp({
    ...credentials,
    password,
    options: { data: { display_name: name } },
  })

  if (error || !data.user) {
    console.error('[signUpAction] signUp failed', error?.message)
    return { ok: false, error: /already|registered|exists/i.test(error?.message ?? '') ? 'exists' : 'generic' }
  }

  // Supabase answers a signup for an already-registered email with a user
  // that has no identities, rather than an error, to avoid revealing which
  // emails have accounts. Treat that as "exists" too.
  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { ok: false, error: 'exists' }
  }

  const ctx = funnelContext(formData)

  // The trigger has created the identities row by now. Verify it landed —
  // without one nothing downstream can work — and give it a slug with the
  // same rules the app uses. Slug failure is logged, not fatal: the next
  // sign-in backfills it.
  const applicant = await loadApplicantForUser(data.user)
  if (!applicant) {
    await supabase.auth.signOut()
    return { ok: false, error: 'setupFailed' }
  }
  if (!applicant.slug) {
    try {
      await ensureIdentitySlug(applicant.identityId, applicant.name, null)
    } catch (e) {
      console.error('[signUpAction] slug generation failed', e)
    }
  }

  if (ctx) await recordFunnelEvent({ event: 'signed_up', ...ctx, identityId: applicant.identityId })

  // No session means the project requires confirming the email/phone first.
  // The account exists; they just have to confirm and then sign in.
  if (!data.session) return { ok: false, error: 'confirmEmail' }

  return { ok: true, applicant: toApplicantView(applicant) }
}

export async function signOutAction(): Promise<void> {
  if (!getAuthEnv()) return
  const supabase = await createAuthClient()
  await supabase.auth.signOut()
}
