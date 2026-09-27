// Shared by server and client. The applicant's side of an assessment
// scenario — PHASE2-NOTES.md section 4, scoped to what's built so far.
// Company-side (draft/approve/invite) is mobile-only; this is the
// applicant half only, same rules either platform.

/** One answer, matched to its question by array position. Voice is the
 * default for trades; photo and text are also valid — see
 * vouch-assessment-media.sql. `transcript` has somewhere to go once
 * transcription exists; nothing produces one yet, and the audio is always
 * kept regardless — a transcript is a convenience, never a replacement. */
export type AssessmentAnswer =
  | { type: 'text'; text: string }
  | { type: 'voice'; audio_url: string; duration_seconds: number; transcript: string | null }
  | { type: 'photo'; photo_url: string; caption: string | null }

/** The AI's per-question note — never a score, never "requirement met".
 * See vouch-assessment-review.sql and the organize-assessment-submission
 * Edge Function. */
export type AssessmentNoteStatus = 'evidence_attached' | 'nothing_submitted' | 'needs_review'
export interface AssessmentNote {
  status: AssessmentNoteStatus
  note: string | null
}

export interface AssessmentView {
  situation: string
  questions: string[]
  submitted: boolean
  answers: AssessmentAnswer[] | null
  /** The candidate's report, kept in two separate keys on purpose — never
   * merge these into one string when rendering. */
  assessmentFindings: AssessmentNote[] | null
  companyFeedback: string | null
}

export interface PendingAssessment {
  applicationId: string
  jobTitle: string
  companyName: string
}
