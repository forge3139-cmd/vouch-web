'use server'

import { createAuthClient } from './client'
import { getAuthEnv } from './cookies'
import { loadApplicantForUser, toApplicantView, type ApplicantView } from './session'
import { getClientIp, isRateLimited, recordAttempt } from '../rateLimit'
import { recordFunnelEvent } from '../funnel'
import { normalizePhone } from '../hiring'
import { ensureIdentitySlug } from './slug'

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

type Credentials = { email: string } | { phone: string }

/** Email if it has an "@", otherwise a phone number in +255… form — the
 * same either/or the mobile app's signup uses. */
function parseContact(raw: string): Credentials | null {
  const value = raw.trim()
  if (!value) return null
  if (value.includes('@')) {
    return /^\S+@\S+\.\S+$/.test(value) ? { email: value.toLowerCase() } : null
  }
  const phone = normalizePhone(value)
  if (!phone) return null
  // Supabase wants E.164 (+ then digits). Numbers typed without a country
  // code that aren't Tanzanian local format can't be made valid safely.
  return phone.startsWith('+') ? { phone } : null
}

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

  const password = String(formData.get('password') ?? '')
  const credentials = parseContact(String(formData.get('contact') ?? ''))
  if (!credentials || !password) return { ok: false, error: 'required' }

  const supabase = await createAuthClient()
  const { data, error } = await supabase.auth.signInWithPassword({ ...credentials, password })

  if (error || !data.user) {
    recordAttempt(limitKey, SIGNIN_FAILURE_LIMIT, SIGNIN_WINDOW_MS)
    // Deliberately one message for "no such account" and "wrong password".
    return { ok: false, error: 'invalid' }
  }

  const applicant = await loadApplicantForUser(data.user)
  if (!applicant) {
    await supabase.auth.signOut()
    return { ok: false, error: 'setupFailed' }
  }

  const ctx = funnelContext(formData)
  if (ctx) await recordFunnelEvent({ event: 'signed_in', ...ctx, identityId: applicant.identityId })

  return { ok: true, applicant: toApplicantView(applicant) }
}

export async function signUpAction(formData: FormData): Promise<AuthResult> {
  if (!getAuthEnv()) return { ok: false, error: 'unconfigured' }

  const ip = await getClientIp()
  if (recordAttempt(`auth-signup:${ip}`, SIGNUP_LIMIT, SIGNUP_WINDOW_MS)) return { ok: false, error: 'tooMany' }

  const name = String(formData.get('name') ?? '').trim().slice(0, 100)
  const password = String(formData.get('password') ?? '')
  const contactRaw = String(formData.get('contact') ?? '')

  if (!name || !contactRaw.trim() || !password) return { ok: false, error: 'required' }
  const credentials = parseContact(contactRaw)
  if (!credentials) return { ok: false, error: 'badContact' }
  if (password.length < MIN_PASSWORD_LENGTH) return { ok: false, error: 'weakPassword' }

  const supabase = await createAuthClient()
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
