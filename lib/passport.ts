// Shared by server and client. The single definition of what a Hiring
// Passport contains, so the consent panel, the grant stored in
// access_grants.scope, and the SQL that builds the company's view can't
// drift apart.

export const PASSPORT_VERSION = 1

/** Everything a company sees, and therefore everything the consent panel
 * must list. `application_answers` are the applicant's own answers on the
 * form; the rest are built by passport_facts() in the database. */
export const PASSPORT_INCLUDES = [
  'application_answers',
  'confirmed_work',
  'evidence',
  'standing',
  'trade',
  'verification',
] as const

/** The subset built from the applicant's VOUCH record (as opposed to what
 * they typed on the form). Passed to passport_facts(). */
export const PASSPORT_FACT_KEYS = PASSPORT_INCLUDES.filter((k) => k !== 'application_answers')

/** Stored alongside the includes so the record of consent states what was
 * expressly kept out, not just what was let in. */
export const PASSPORT_EXCLUDES = [
  'other_applications',
  'private_feedback',
  'payment_amounts',
  'rates_with_other_clients',
] as const

export function passportScope() {
  return {
    version: PASSPORT_VERSION,
    includes: [...PASSPORT_INCLUDES],
    excludes: [...PASSPORT_EXCLUDES],
  }
}

export type Standing = 'new' | 'established' | 'proven' | 'trusted'

export interface PassportConfirmedWork {
  title: string
  role_title: string | null
  confirmed_at: string | null
  confirmer_name: string | null
  hired_again: boolean
}

/** What the consent panel shows — the same facts the company will see. */
export interface PassportPreview {
  evidence: {
    recordsConfirmed: number
    distinctConfirmers: number
    repeatClients: number
    lastConfirmedAt: string | null
  }
  standing: Standing
  /** What they typed as their expertise, verbatim. Empty if they haven't added any. */
  expertise: string[]
  /** Completed verification layers. Empty = "not yet verified". */
  verifiedLayers: string[]
  confirmedWork: PassportConfirmedWork[]
}

/** Where a person's passport access for one application currently stands. */
export type PassportAccessState = 'active' | 'job_closed' | 'withdrawn' | 'none'
