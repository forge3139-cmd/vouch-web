'use server'

import { createAuthClient } from './auth/client'
import { getClientIp, recordAttempt } from './rateLimit'
import { recordFunnelEvent } from './funnel'
import { getSignedInApplicant } from './auth/session'
import { AVAILABILITY_VALUES, todayInEastAfrica } from './hiring'
import { normalizePhone } from './phone'

export type ApplicationErrorCode =
  | 'required'
  | 'phone'
  | 'alreadyApplied'
  | 'closed'
  | 'tooMany'
  | 'signedOut'
  | 'consentRequired'
  | 'profileEmpty'
  | 'generic'

export type SubmitApplicationResult = { ok: true } | { ok: false; error: ApplicationErrorCode }

// A genuine job-seeker applies to a few jobs in a sitting — eight an hour
// is generous for that and a real ceiling for a script.
const APPLY_LIMIT = 8
const APPLY_WINDOW_MS = 60 * 60 * 1000

const MAX_NOTE = 500

const RPC_ERRORS: Record<string, ApplicationErrorCode> = {
  not_signed_in: 'signedOut',
  not_found: 'generic',
  closed: 'closed',
  already_applied: 'alreadyApplied',
  invalid: 'required',
  profile_empty: 'profileEmpty',
}

/**
 * Nothing is re-asked: the company sees the applicant's profile (expertise,
 * capabilities, portfolio, confirmed work) through the consent grant this
 * creates. Only availability and an optional note are unique to this
 * application. The RULES — job still open, before the deadline, one
 * application per account, something on the profile to share — live in
 * ONE place: the submit_job_application database function
 * (vouch-apply-from-profile.sql), which both this action and the mobile
 * app call. Calling it through the AUTH client is what lets the function
 * work out who's applying from the verified session itself
 * (current_identity_id()) rather than from anything this code passes it.
 *
 * Returns error CODES so the client can show them in the applicant's
 * language. 'signedOut' means the session ended mid-form; the client sends
 * them back through sign-in with everything they typed kept.
 */
export async function submitApplicationAction(formData: FormData): Promise<SubmitApplicationResult> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return { ok: false, error: 'signedOut' }

  // Checked before anything else can be written.
  if (String(formData.get('consent') ?? '') !== 'yes') return { ok: false, error: 'consentRequired' }

  const ip = await getClientIp()
  if (recordAttempt(`job-apply:${ip}`, APPLY_LIMIT, APPLY_WINDOW_MS)) {
    return { ok: false, error: 'tooMany' }
  }

  const slug = String(formData.get('slug') ?? '')
  const availability = String(formData.get('availability') ?? '')
  const startDate = String(formData.get('startDate') ?? '')
  const note = String(formData.get('note') ?? '').trim().slice(0, MAX_NOTE)
  const visitorId = String(formData.get('visitorId') ?? '')

  if (!AVAILABILITY_VALUES.includes(availability)) {
    return { ok: false, error: 'required' }
  }
  if (availability === 'Pick a date' && (!startDate || startDate < todayInEastAfrica())) {
    return { ok: false, error: 'required' }
  }

  // The account's own phone, when there is one; otherwise whatever was typed.
  const phone = applicant.phone || normalizePhone(String(formData.get('phone') ?? ''))
  if (!phone) return { ok: false, error: 'phone' }

  const supabase = await createAuthClient()
  const { data: job } = await supabase.from('jobs').select('id').eq('slug', slug).maybeSingle<{ id: string }>()
  if (!job) return { ok: false, error: 'generic' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('submit_job_application', {
    p_job_id: job.id,
    p_phone: phone,
    p_availability: availability,
    p_start_date: availability === 'Pick a date' ? startDate : null,
    p_note: note || null,
  })

  if (error) {
    console.error('[submitApplicationAction] submit_job_application rpc failed', error)
    return { ok: false, error: 'generic' }
  }

  const result = data as { ok: boolean; error?: string; application_id?: string }
  if (!result.ok) {
    return { ok: false, error: RPC_ERRORS[result.error ?? ''] ?? 'generic' }
  }

  await recordFunnelEvent({
    event: 'application_submitted',
    jobSlug: slug,
    visitorId,
    identityId: applicant.identityId,
  })

  return { ok: true }
}
