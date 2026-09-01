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
  location: string | null
  language: string | null
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
}

export interface ProofInsert {
  record_id: string
  uploaded_by: string | null
  side: 'worker' | 'confirmer'
  file_url: string
  media_type: string
  caption: string | null
}

/** Everything the confirmation page needs, assembled server-side. */
export interface ConfirmationBundle {
  link: ConfirmationLinkRow
  record: RecordRow
  worker: IdentityRow
  confirmedSamples: Pick<RecordRow, 'id' | 'title' | 'role_title' | 'confirmed_at'>[]
  confirmedCount: number
}
