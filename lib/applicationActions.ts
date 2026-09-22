'use server'

import { createAuthClient } from './auth/client'
import { getClientIp, recordAttempt } from './rateLimit'
import { recordFunnelEvent } from './funnel'
import { getSignedInApplicant } from './auth/session'
import { AVAILABILITY_VALUES, QUALIFICATION_VALUES, YEARS_EXPERIENCE_VALUES, todayInEastAfrica } from './hiring'
import { skillEnLabels } from './skills'
import type { Category } from './categories'
import { normalizePhone } from './phone'

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
const MAX_WORK_HISTORY = 1500
const MAX_CAPABILITY_TEXT = 500
const MAX_CHIPS = 8
const MAX_QUALIFICATIONS = QUALIFICATION_VALUES.length

const RPC_ERRORS: Record<string, ApplicationErrorCode> = {
  not_signed_in: 'signedOut',
  not_found: 'generic',
  closed: 'closed',
  already_applied: 'alreadyApplied',
  invalid: 'required',
}

/**
 * Nothing is shared without consent: the form field `consent` must be
 * "yes", which only the consent panel's "Share and apply" button sends.
 *
 * Field validation (trimming, length limits, phone normalisation, and
 * checking there's something to submit at all) happens here, same as
 * always. The RULES — job still open, before the deadline, one
 * application per account — live in ONE place: the submit_job_application
 * database function (vouch-application-form.sql), which both this action
 * and the mobile app call. Calling it through the AUTH client (not the
 * service-role client used elsewhere in this file's history) is what lets
 * the function work out who's applying from the verified session itself
 * (current_identity_id()) rather than from anything this code passes it —
 * the same guarantee the mobile app gets for free from its own session.
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
  const workHistory = String(formData.get('workHistory') ?? '').trim()
  const yearsExperience = String(formData.get('yearsExperience') ?? '')
  const capabilityText = String(formData.get('capabilityText') ?? '').trim()
  const availability = String(formData.get('availability') ?? '')
  const startDate = String(formData.get('startDate') ?? '')
  const visitorId = String(formData.get('visitorId') ?? '')

  // Need the job's trade to know which skill labels are valid for it, and
  // its id to hand to the RPC — the RPC re-checks status/deadline itself
  // rather than trusting anything read here.
  const supabase = await createAuthClient()
  const { data: job } = await supabase
    .from('jobs')
    .select('id, category')
    .eq('slug', slug)
    .maybeSingle<{ id: string; category: Category | null }>()
  if (!job) return { ok: false, error: 'generic' }

  const validSkills = skillEnLabels(job.category)
  const chips = Array.from(
    new Set(formData.getAll('capability').map(String).filter((c) => validSkills.includes(c)))
  ).slice(0, MAX_CHIPS)

  const qualifications = Array.from(
    new Set(formData.getAll('qualification').map(String).filter((q) => QUALIFICATION_VALUES.includes(q)))
  ).slice(0, MAX_QUALIFICATIONS)

  if (
    !name ||
    !workHistory ||
    !YEARS_EXPERIENCE_VALUES.includes(yearsExperience) ||
    !AVAILABILITY_VALUES.includes(availability) ||
    (chips.length === 0 && !capabilityText)
  ) {
    return { ok: false, error: 'required' }
  }

  if (availability === 'Pick a date' && (!startDate || startDate < todayInEastAfrica())) {
    return { ok: false, error: 'required' }
  }

  const phone = normalizePhone(phoneRaw)
  if (!phone) return { ok: false, error: 'phone' }

  const capabilities = [...chips, capabilityText.slice(0, MAX_CAPABILITY_TEXT)].filter(Boolean).join(', ')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('submit_job_application', {
    p_job_id: job.id,
    p_name: name.slice(0, MAX_NAME),
    p_phone: phone,
    p_work_history: workHistory.slice(0, MAX_WORK_HISTORY),
    p_years_experience: yearsExperience,
    p_qualifications: qualifications,
    p_capabilities: capabilities,
    p_availability: availability,
    p_start_date: availability === 'Pick a date' ? startDate : null,
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
