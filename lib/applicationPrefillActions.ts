'use server'

import { createAuthClient } from './auth/client'
import { getSignedInApplicant } from './auth/session'
import { categoryFromTags, skillEnLabels } from './skills'

export interface ApplicationPrefill {
  workHistory: string
  yearsExperience: string | null
  qualifications: string[]
  chips: string[]
  capabilityText: string
  availability: string | null
  startDate: string
}

interface PreviousApplicationRow {
  work_history: string
  years_experience: string | null
  qualifications: string[]
  capabilities: string
  availability: string | null
  start_date: string | null
}

/** Splits the stored "skill label, skill label, free text" string back
 * into the skills that match the CURRENT job's trade skill list (exact
 * matches only) and whatever's left, in original order. A previous
 * application for a different trade won't have matching skill labels —
 * they land in the free-text box instead, still there to edit, not lost. */
function splitCapabilities(stored: string, validLabels: readonly string[]): { chips: string[]; text: string } {
  const parts = stored.split(', ').map((p) => p.trim()).filter(Boolean)
  const chips: string[] = []
  const rest: string[] = []
  for (const part of parts) {
    if (validLabels.includes(part) && !chips.includes(part)) chips.push(part)
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
 * `expertiseTags` are the job being applied to NOW — skills only prefill when
 * they match that job's skill list; everything else still comes
 * through as free text rather than silently vanishing.
 *
 * Returns null if there's nothing to prefill from at all — the caller
 * leaves the form empty rather than showing a placeholder as if it were
 * real data.
 */
export async function loadApplicationPrefillAction(expertiseTags: string[]): Promise<ApplicationPrefill | null> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return null

  const validLabels = skillEnLabels(categoryFromTags(expertiseTags))

  const supabase = await createAuthClient()
  const { data, error } = await supabase
    .from('job_applications')
    .select('work_history, years_experience, qualifications, capabilities, availability, start_date')
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
    const { chips, text } = splitCapabilities(data.capabilities, validLabels)
    return {
      workHistory: data.work_history,
      yearsExperience: data.years_experience,
      qualifications: data.qualifications ?? [],
      chips,
      capabilityText: text,
      availability: data.availability,
      startDate: data.start_date ?? '',
    }
  }

  // No previous application, and skills are specific enough now (not just
  // "which trade") that there's nothing safe to guess from a bare profile
  // trade — an empty form beats a made-up-looking skill selection.
  return null
}
