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
  /** identities.category — their trade. Null until they choose one in the app. */
  category: string | null
}

/** What the browser is allowed to know: enough to prefill and greet. */
export interface ApplicantView {
  name: string
  phone: string
}

export function toApplicantView(applicant: SignedInApplicant): ApplicantView {
  return { name: applicant.name, phone: applicant.phone }
}

interface IdentityRow {
  id: string
  display_name: string
  slug: string | null
  category: string | null
}

/** Turns a verified auth user into an applicant by finding their identities
 * row (created by the signup trigger). Returns null if there isn't one. */
export async function loadApplicantForUser(user: User): Promise<SignedInApplicant | null> {
  const supabase = getSupabaseServerClient()
  const { data: identity } = await supabase
    .from('identities')
    .select('id, display_name, slug, category')
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
    category: identity.category,
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
