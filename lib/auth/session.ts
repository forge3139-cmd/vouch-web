import 'server-only'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '../supabase'
import { createAuthClient } from './client'
import { hasAuthCookie } from './cookies'
import { ensureIdentitySlug } from './slug'

/** Server-side view of the signed-in applicant. The ids never go to the browser. */
export interface SignedInApplicant {
  userId: string
  identityId: string
  name: string
  /** E.164-style (+255…), or '' when they signed up with email only. */
  phone: string
  slug: string | null
  /** identities.expertise — what they typed as their expertise, verbatim. Empty until they add it in the app. */
  expertise: string[]
  /** Set to now() when they last opened a jobs list. Null = never. */
  jobsLastSeenAt: string | null
  jobAlertsEnabled: boolean
}

/** What the browser is allowed to know: enough to prefill and greet.
 * `expertise` is public information already (shown on their profile), so
 * it's safe here. */
export interface ApplicantView {
  name: string
  phone: string
  expertise: string[]
}

export function toApplicantView(applicant: SignedInApplicant): ApplicantView {
  return { name: applicant.name, phone: applicant.phone, expertise: applicant.expertise }
}

interface IdentityRow {
  id: string
  display_name: string
  slug: string | null
  expertise: string[] | null
  jobs_last_seen_at: string | null
  job_alerts_enabled: boolean
}

/** Turns a verified auth user into an applicant by finding their identities
 * row (created by the signup trigger). Returns null if there isn't one. */
export async function loadApplicantForUser(user: User): Promise<SignedInApplicant | null> {
  const supabase = getSupabaseServerClient()
  const { data: identity } = await supabase
    .from('identities')
    .select('id, display_name, slug, expertise, jobs_last_seen_at, job_alerts_enabled')
    .eq('auth_user_id', user.id)
    .maybeSingle<IdentityRow>()
  if (!identity) return null

  // Backfill for accounts that predate slugs, same as the app does on login.
  let slug = identity.slug
  if (!slug) {
    try {
      slug = await ensureIdentitySlug(identity.id, identity.display_name, null)
    } catch (e) {
      console.error('[loadApplicantForUser] slug backfill failed', e)
    }
  }

  const phone = user.phone ? (user.phone.startsWith('+') ? user.phone : `+${user.phone}`) : ''

  return {
    userId: user.id,
    identityId: identity.id,
    name: identity.display_name,
    phone,
    slug,
    expertise: identity.expertise ?? [],
    jobsLastSeenAt: identity.jobs_last_seen_at,
    jobAlertsEnabled: identity.job_alerts_enabled,
  }
}

/**
 * The verified session, or null. "Verified" means getUser(), which asks
 * Supabase's auth server to validate the token — not getSession(), which
 * would trust whatever the cookie says. Anonymous visitors (no auth
 * cookie) return immediately with no network call.
 */
export async function getSignedInApplicant(): Promise<SignedInApplicant | null> {
  const store = await cookies()
  if (!hasAuthCookie(store.getAll())) return null

  try {
    const supabase = await createAuthClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null
    return await loadApplicantForUser(user)
  } catch (e) {
    console.error('[getSignedInApplicant] failed', e)
    return null
  }
}
