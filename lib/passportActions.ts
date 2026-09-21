'use server'

import { getSupabaseServerClient } from './supabase'
import { getClientIp, recordAttempt } from './rateLimit'
import { getSignedInApplicant } from './auth/session'
import {
  PASSPORT_FACT_KEYS, type PassportConfirmedWork, type PassportPreview, type Standing,
} from './passport'

export type PreviewResult = { ok: true; preview: PassportPreview } | { ok: false; error: 'signedOut' | 'generic' }

interface FactsJson {
  evidence?: {
    records_confirmed?: number
    distinct_confirmers?: number
    repeat_clients?: number
    last_confirmed_at?: string | null
  }
  standing?: string
  trade?: string | null
  verified_layers?: string[]
  confirmed_work?: PassportConfirmedWork[]
}

const STANDINGS: readonly string[] = ['new', 'established', 'proven', 'trusted']

/**
 * The consent panel's "what they will see", built by the SAME database
 * function the company's view uses (passport_facts), for the SIGNED-IN
 * applicant only — the identity comes from the verified session, never
 * from the request. So the preview can't show one thing while the company
 * sees another.
 */
export async function previewPassportAction(): Promise<PreviewResult> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return { ok: false, error: 'signedOut' }

  const supabase = getSupabaseServerClient()
  // The client isn't typed against a generated Database schema (see lib/supabase.ts), so rpc needs the cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('passport_facts', {
    p_identity: applicant.identityId,
    p_includes: [...PASSPORT_FACT_KEYS],
  })

  if (error || !data) {
    console.error('[previewPassportAction] passport_facts failed', error)
    return { ok: false, error: 'generic' }
  }

  const facts = data as FactsJson
  const standing = (STANDINGS.includes(facts.standing ?? '') ? facts.standing : 'new') as Standing

  return {
    ok: true,
    preview: {
      evidence: {
        recordsConfirmed: facts.evidence?.records_confirmed ?? 0,
        distinctConfirmers: facts.evidence?.distinct_confirmers ?? 0,
        repeatClients: facts.evidence?.repeat_clients ?? 0,
        lastConfirmedAt: facts.evidence?.last_confirmed_at ?? null,
      },
      standing,
      trade: facts.trade ?? null,
      verifiedLayers: facts.verified_layers ?? [],
      confirmedWork: facts.confirmed_work ?? [],
    },
  }
}

export type WithdrawResult = { ok: true } | { ok: false; error: 'signedOut' | 'notFound' | 'tooMany' | 'generic' }

// Withdrawing is rare and deliberate; this is a ceiling for a script, not
// a limit anyone real will meet.
const WITHDRAW_LIMIT = 20
const WITHDRAW_WINDOW_MS = 60 * 60 * 1000

/**
 * Ends a company's access to the applicant's VOUCH record IMMEDIATELY and
 * removes what they submitted from that company's view.
 *
 * The applicant is identified by the verified session; the application
 * must belong to them. In one pass this: marks the application withdrawn,
 * blanks the answers and contact details on it (so the company's list
 * shows only "withdrawn", with nothing left to read or call), and revokes
 * the access grant. The company's own private notes are theirs and stay.
 * get_hiring_passport() also refuses on `withdrawn_at`, so even a stale
 * screen can't fetch the record after this returns.
 */
export async function withdrawApplicationAction(applicationId: string): Promise<WithdrawResult> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return { ok: false, error: 'signedOut' }

  const ip = await getClientIp()
  if (recordAttempt(`withdraw:${ip}`, WITHDRAW_LIMIT, WITHDRAW_WINDOW_MS)) return { ok: false, error: 'tooMany' }

  const supabase = getSupabaseServerClient()

  const { data: application } = await supabase
    .from('job_applications')
    .select('id, job_id')
    .eq('id', applicationId)
    .eq('applicant_identity_id', applicant.identityId)
    .is('withdrawn_at', null)
    .maybeSingle<{ id: string; job_id: string }>()

  if (!application) return { ok: false, error: 'notFound' }

  const now = new Date().toISOString()

  // Revoke FIRST: if the second step failed, the worse outcome must be
  // "access ended but the application still shows", never the reverse.
  // The client isn't typed against a generated Database schema, so updates need the cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: grantError } = await (supabase.from('access_grants') as any)
    .update({ revoked_at: now, revoked_reason: 'withdrawn' })
    .eq('subject_id', applicant.identityId)
    .eq('job_id', application.job_id)
    .is('revoked_at', null)
  if (grantError) {
    console.error('[withdrawApplicationAction] revoke failed', grantError)
    return { ok: false, error: 'generic' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: appError } = await (supabase.from('job_applications') as any)
    .update({
      withdrawn_at: now,
      updated_at: now,
      name: 'Withdrawn applicant',
      phone: '',
      experience: '',
      capabilities: '',
      availability: null,
      past_work: null,
    })
    .eq('id', application.id)
    .eq('applicant_identity_id', applicant.identityId)
  if (appError) {
    console.error('[withdrawApplicationAction] application update failed', appError)
    return { ok: false, error: 'generic' }
  }

  return { ok: true }
}
