'use server'

import { getSupabaseServerClient } from './supabase'
import { getClientIp, recordAttempt } from './rateLimit'
import { recordFunnelEvent } from './funnel'
import { getSignedInApplicant } from './auth/session'
import { passportScope } from './passport'
import {
  AVAILABILITY_VALUES, CAPABILITY_CHIP_EN_LABELS, isJobClosed, normalizePhone, type PublicJob,
} from './hiring'

export type ApplicationErrorCode =
  | 'required'
  | 'phone'
  | 'alreadyApplied'
  | 'closed'
  | 'tooMany'
  | 'signedOut'
  | 'consentRequired'
  | 'generic'

export type SubmitApplicationResult = { ok: true } | { ok: false; error: ApplicationErrorCode }

// A genuine job-seeker applies to a few jobs in a sitting — eight an hour
// is generous for that and a real ceiling for a script.
const APPLY_LIMIT = 8
const APPLY_WINDOW_MS = 60 * 60 * 1000

const MAX_NAME = 100
const MAX_EXPERIENCE = 1500
const MAX_CAPABILITY_TEXT = 500
const MAX_PAST_WORK = 1500
const MAX_CHIPS = 8

/**
 * Nothing is shared without consent: the form field `consent` must be
 * "yes", which only the consent panel's "Share and apply" button sends.
 * The grant recorded in access_grants states, per job, who agreed to share
 * what and when.
 *
 * Applicants must be signed in. The session is verified here on the server
 * (getUser, not a cookie's say-so) and the identity id that lands on the
 * application comes from THAT session — never from anything the browser
 * sent, so nobody can apply as someone else. The insert uses the
 * service-role client, same pattern as work requests.
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
  const name = String(formData.get('name') ?? '').trim()
  const phoneRaw = String(formData.get('phone') ?? '')
  const experience = String(formData.get('experience') ?? '').trim()
  const capabilityText = String(formData.get('capabilityText') ?? '').trim()
  const availability = String(formData.get('availability') ?? '')
  const pastWork = String(formData.get('pastWork') ?? '').trim()
  const visitorId = String(formData.get('visitorId') ?? '')

  // Only labels from our own fixed list are accepted; anything else is dropped.
  const chips = Array.from(
    new Set(formData.getAll('capability').map(String).filter((c) => CAPABILITY_CHIP_EN_LABELS.includes(c)))
  ).slice(0, MAX_CHIPS)

  if (
    !name || !experience || !AVAILABILITY_VALUES.includes(availability) ||
    (chips.length === 0 && !capabilityText)
  ) {
    return { ok: false, error: 'required' }
  }

  const phone = normalizePhone(phoneRaw)
  if (!phone) return { ok: false, error: 'phone' }

  const supabase = getSupabaseServerClient()

  const { data: job } = await supabase
    .from('jobs')
    .select('id, poster_id, status, deadline')
    .eq('slug', slug)
    .maybeSingle<{ id: string; poster_id: string } & Pick<PublicJob, 'status' | 'deadline'>>()

  if (!job) return { ok: false, error: 'generic' }
  if (isJobClosed(job)) return { ok: false, error: 'closed' }

  const { data: existing } = await supabase
    .from('job_applications')
    .select('id')
    .eq('job_id', job.id)
    .eq('applicant_identity_id', applicant.identityId)
    .is('withdrawn_at', null)
    .limit(1)
  if (existing && existing.length > 0) return { ok: false, error: 'alreadyApplied' }

  const capabilities = [...chips, capabilityText.slice(0, MAX_CAPABILITY_TEXT)].filter(Boolean).join(', ')

  // The client isn't typed against a generated Database schema (see lib/supabase.ts), so inserts need the cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: created, error } = await (supabase.from('job_applications') as any)
    .insert({
      job_id: job.id,
      applicant_identity_id: applicant.identityId,
      name: name.slice(0, MAX_NAME),
      phone,
      experience: experience.slice(0, MAX_EXPERIENCE),
      capabilities,
      availability,
      past_work: pastWork ? pastWork.slice(0, MAX_PAST_WORK) : null,
    })
    .select('id')
    .single()

  if (error || !created) {
    // 23505 = the one-live-application-per-person index caught a double submit.
    if (error?.code === '23505') return { ok: false, error: 'alreadyApplied' }
    console.error('[submitApplicationAction] job_applications insert failed', error)
    return { ok: false, error: 'generic' }
  }

  // The consent record: who (subject) agreed to show whom (grantee, the
  // company), for which job, exactly what, and when (granted_at defaults
  // to now). Access ends when the job closes or the applicant withdraws.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: grantError } = await (supabase.from('access_grants') as any).insert({
    subject_id: applicant.identityId,
    grantee_id: job.poster_id,
    job_id: job.id,
    scope: passportScope(),
  })

  if (grantError) {
    // No consent record means nothing may be shared — so there must be no
    // application either. Undo it rather than leave a half-applied state
    // where the company holds answers with no record of agreement.
    console.error('[submitApplicationAction] access_grants insert failed', grantError)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('job_applications') as any).delete().eq('id', created.id)
    return { ok: false, error: 'generic' }
  }

  await recordFunnelEvent({
    event: 'application_submitted',
    jobSlug: slug,
    visitorId,
    identityId: applicant.identityId,
  })

  return { ok: true }
}
