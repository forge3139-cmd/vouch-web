'use server'

import { createAuthClient } from './auth/client'
import { getSignedInApplicant } from './auth/session'
import { CAPABILITY_CHIP_EN_LABELS } from './hiring'
import { CATEGORY_LABELS, isCategory } from './categories'

export interface ApplicationPrefill {
  experience: string
  chips: string[]
  capabilityText: string
  availability: string | null
  pastWork: string
}

interface PreviousApplicationRow {
  experience: string
  capabilities: string
  availability: string | null
  past_work: string | null
}

/** Splits the stored "chip label, chip label, free text" string back into
 * the chips (exact matches against the fixed list) and whatever's left, in
 * original order. Not lossless in the general case — someone's free text
 * could coincidentally equal a chip's label — but good enough for a
 * one-tap prefill they can still edit before submitting. */
function splitCapabilities(stored: string): { chips: string[]; text: string } {
  const parts = stored.split(', ').map((p) => p.trim()).filter(Boolean)
  const chips: string[] = []
  const rest: string[] = []
  for (const part of parts) {
    if (CAPABILITY_CHIP_EN_LABELS.includes(part) && !chips.includes(part)) chips.push(part)
    else rest.push(part)
  }
  return { chips, text: rest.join(', ') }
}

/**
 * One-tap apply: prefill from the applicant's own most recent application
 * (any job, not withdrawn — a withdrawn one has its answers already
 * blanked) and, failing that, from their profile's trade. Read via the
 * AUTH client so RLS is the real gate: an applicant can only ever read
 * their own applications (job_applications_applicant_select).
 *
 * Returns null if there's nothing to prefill from at all — the caller
 * leaves the form empty rather than showing a placeholder as if it were
 * real data.
 */
export async function loadApplicationPrefillAction(): Promise<ApplicationPrefill | null> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return null

  const supabase = await createAuthClient()
  const { data, error } = await supabase
    .from('job_applications')
    .select('experience, capabilities, availability, past_work')
    .eq('applicant_identity_id', applicant.identityId)
    .is('withdrawn_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<PreviousApplicationRow>()

  if (error) {
    console.error('[loadApplicationPrefillAction] query failed', error)
    return null
  }

  if (data) {
    const { chips, text } = splitCapabilities(data.capabilities)
    return {
      experience: data.experience,
      chips,
      capabilityText: text,
      availability: data.availability,
      pastWork: data.past_work ?? '',
    }
  }

  // No previous application — the only thing worth prefilling is a chip
  // matching their profile's trade, if they have one.
  if (applicant.category && isCategory(applicant.category) && applicant.category !== 'other') {
    return {
      experience: '',
      chips: [CATEGORY_LABELS[applicant.category].en],
      capabilityText: '',
      availability: null,
      pastWork: '',
    }
  }

  return null
}
