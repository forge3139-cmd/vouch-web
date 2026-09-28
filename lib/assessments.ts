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

export interface AssessmentView {
  situation: string
  questions: string[]
  submitted: boolean
  answers: AssessmentAnswer[] | null
  /** In the company's own words. No AI-generated summary sits alongside
   * this any more — what was or wasn't submitted is plain to see in
   * `answers` itself. */
  companyFeedback: string | null
}

export interface PendingAssessment {
  applicationId: string
  jobTitle: string
  companyName: string
}
