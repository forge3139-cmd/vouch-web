import type { Category } from './categories'

export type ConfirmerType = 'client' | 'employer' | 'colleague' | 'teacher' | 'institution'
export type RecordStatus = 'submitted' | 'confirmed'
export type IdentityKind = 'person' | 'organisation'

export interface ConfirmationLinkRow {
  id: string
  record_id: string
  token: string
  sent_to: string | null
  language: string | null
  opened_at: string | null
  completed_at: string | null
  expires_at: string
  created_at: string
  last_step_reached: string | null
}

export interface RecordRow {
  id: string
  worker_id: string
  confirmer_id: string | null
  confirmer_type: ConfirmerType
  agreement_id: string | null
  kind: string
  status: RecordStatus
  is_ongoing: boolean
  tier: string | null
  title: string
  description: string | null
  role_title: string | null
  started_at: string | null
  ended_at: string | null
  submitted_at: string | null
  confirmed_at: string | null
  payment_status: string | null
  created_at: string
}

export interface IdentityRow {
  id: string
  kind: IdentityKind
  display_name: string
  headline: string | null
  bio: string | null
  location: string | null
  avatar_url: string | null
  language: string | null
  slug: string | null
  /** Coarse trade bucket powering the public directory's category chips —
   * separate from `headline`, which stays free text. Null until a worker
   * (or a future edit-profile flow) sets one. */
  category: Category | null
  created_at?: string
}

export interface ConfirmationInsert {
  record_id: string
  confirmer_id: string | null
  confirmer_name: string | null
  confirmer_contact: string | null
  strength: number
  work_happened: boolean
  delivered_on_time: boolean | null
  would_work_again: 'yes' | 'maybe' | 'no' | null
  rating_reliability: number | null
  rating_quality: number | null
  rating_communication: number | null
  rating_timeliness: number | null
  comment: string | null
  /** Not in the documented schema yet — the client's own answer to "Did you
   * pay for this work?", stored separately from the worker's
   * `records.payment_status` on purpose so the two can be compared. */
  client_payment_status?: 'yes' | 'not_yet' | 'partly' | null
}

/** Uses the existing `disputes` table (vouch-schema.sql) rather than a new
 * flag column — a payment_mismatch dispute is raised, never auto-resolved,
 * so it just sits there as `status: 'open'` until a human looks at it. */
export interface DisputeInsert {
  record_id: string
  confirmation_id: string | null
  raised_by: string | null
  reason_code: string
  explanation: string | null
  status: 'open' | 'resolved'
}

export interface ProofInsert {
  record_id: string
  uploaded_by: string | null
  side: 'worker' | 'confirmer'
  file_url: string
  media_type: string
  caption: string | null
}

export interface ProofRow extends ProofInsert {
  id: string
  created_at: string
}

/** Read-shape counterpart to ConfirmationInsert, for rendering a worker's
 * confirmed-work list on the public profile page. */
export interface ConfirmationRow {
  id: string
  record_id: string
  confirmer_id: string | null
  confirmer_name: string | null
  confirmer_contact: string | null
  strength: number
  work_happened: boolean
  delivered_on_time: boolean | null
  would_work_again: 'yes' | 'maybe' | 'no' | null
  rating_reliability: number | null
  rating_quality: number | null
  rating_communication: number | null
  rating_timeliness: number | null
  comment: string | null
  client_payment_status: 'yes' | 'not_yet' | 'partly' | null
  created_at: string
}

/** Everything the confirmation page needs, assembled server-side. */
export interface ConfirmationBundle {
  link: ConfirmationLinkRow
  record: RecordRow
  worker: IdentityRow
  confirmedSamples: Pick<RecordRow, 'id' | 'title' | 'role_title' | 'confirmed_at'>[]
  confirmedCount: number
}

export type WorkRequestStatus = 'pending' | 'accepted' | 'declined' | 'completed'

export interface WorkRequestRow {
  id: string
  worker_id: string
  slug_used: string
  title: string
  description: string | null
  specifications: string | null
  location: string | null
  needed_by: string | null
  client_name: string
  client_phone: string
  status: WorkRequestStatus
  created_at: string
}

export interface WorkRequestPhotoRow {
  id: string
  work_request_id: string
  file_url: string
  media_type: string | null
  created_at: string
}

/** From the identity_evidence view (vouch-schema.sql, shared with the
 * mobile project) — read here to show a worker's evidence honestly. */
export interface IdentityEvidenceRow {
  identity_id: string
  records_confirmed: number
  distinct_confirmers: number
  repeat_clients: number
  last_confirmed_at: string | null
  both_side_confirmed: number
}

/** Everything the /w/[slug] request page needs, assembled server-side. */
export interface WorkerRequestBundle {
  worker: IdentityRow
  evidence: IdentityEvidenceRow | null
}
