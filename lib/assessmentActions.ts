'use server'

import { createAuthClient } from './auth/client'
import { getSignedInApplicant } from './auth/session'
import { validateImageFile } from './fileValidation'
import type { AssessmentAnswer, AssessmentView, PendingAssessment } from './assessments'

/**
 * The candidate's side of an assessment scenario. Nothing here scores
 * anything; a human at the company reads the answers through the
 * ordinary applicant screen. Company-side (draft/approve/invite) is
 * mobile-only, same as the rest of hiring.
 */

export type GetAssessmentResult = { ok: true; view: AssessmentView } | { ok: false; error: 'signedOut' | 'notInvited' | 'generic' }

export async function getAssessmentForApplicationAction(applicationId: string): Promise<GetAssessmentResult> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return { ok: false, error: 'signedOut' }

  const supabase = await createAuthClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_assessment_for_application', { p_application_id: applicationId })
  if (error) {
    console.error('[getAssessmentForApplicationAction] rpc failed', error)
    return { ok: false, error: 'generic' }
  }
  const result = data as {
    ok: boolean; error?: string; situation?: string; questions?: string[]; submitted?: boolean; answers?: AssessmentAnswer[] | null
    company_feedback?: string | null
  }
  if (!result.ok || !result.situation || !result.questions) {
    return { ok: false, error: result.error === 'not_invited' ? 'notInvited' : 'generic' }
  }
  return {
    ok: true,
    view: {
      situation: result.situation,
      questions: result.questions,
      submitted: !!result.submitted,
      answers: result.answers ?? null,
      companyFeedback: result.company_feedback ?? null,
    },
  }
}

export type SubmitAssessmentResult = { ok: true } | { ok: false; error: 'alreadySubmitted' | 'invalid' | 'generic' }

export async function submitAssessmentAction(applicationId: string, answers: AssessmentAnswer[]): Promise<SubmitAssessmentResult> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return { ok: false, error: 'generic' }

  const supabase = await createAuthClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('submit_assessment', { p_application_id: applicationId, p_answers: answers })
  if (error) {
    console.error('[submitAssessmentAction] rpc failed', error)
    return { ok: false, error: 'generic' }
  }
  const result = data as { ok: boolean; error?: string }
  if (result.ok) return { ok: true }
  return { ok: false, error: result.error === 'already_submitted' ? 'alreadySubmitted' : result.error === 'invalid' ? 'invalid' : 'generic' }
}

const MAX_AUDIO_BYTES = 10 * 1024 * 1024

export type UploadMediaResult = { ok: true; path: string } | { ok: false; error: 'invalid' | 'generic' }

/**
 * A voice or photo answer, uploaded as the signed-in applicant so Storage
 * RLS on the assessment-media bucket applies. "Resumable" for this feature
 * means the recording/photo stays in the browser tab until this succeeds —
 * a failed request costs a retry, never redoing the answer — not
 * byte-range resumability of the request itself.
 */
export async function uploadAssessmentMediaAction(formData: FormData): Promise<UploadMediaResult> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return { ok: false, error: 'generic' }

  const applicationId = String(formData.get('applicationId') ?? '')
  const questionIndex = String(formData.get('questionIndex') ?? '')
  const kind = String(formData.get('kind') ?? '')
  const file = formData.get('file')
  if (!applicationId || !questionIndex || (kind !== 'voice' && kind !== 'photo') || !(file instanceof File)) {
    return { ok: false, error: 'invalid' }
  }

  let contentType = file.type
  if (kind === 'photo') {
    const validation = await validateImageFile(file)
    if (!validation.ok) return { ok: false, error: 'invalid' }
    contentType = validation.contentType
  } else {
    if (file.size > MAX_AUDIO_BYTES || !file.type.startsWith('audio/')) return { ok: false, error: 'invalid' }
  }

  const ext = kind === 'photo' ? 'jpg' : file.name.split('.').pop() || 'webm'
  const path = `${applicationId}/${questionIndex}-${Date.now()}.${ext}`

  const supabase = await createAuthClient()
  const { data: uploaded, error: uploadError } = await supabase.storage
    .from('assessment-media')
    .upload(path, file, { contentType })
  if (uploadError || !uploaded) {
    console.error('[uploadAssessmentMediaAction] upload failed', uploadError)
    return { ok: false, error: 'generic' }
  }

  return { ok: true, path: uploaded.path }
}

export type SignMediaResult = { ok: true; url: string } | { ok: false }

/**
 * assessment-media is a private bucket — audio_url/photo_url on a
 * submitted answer are storage paths, not usable URLs. This mints a
 * short-lived signed one, gated server-side (sign-assessment-media) by the
 * same authorization as the rest of an assessment: the candidate can
 * always sign their own answer.
 */
export async function signAssessmentMediaAction(applicationId: string, path: string): Promise<SignMediaResult> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return { ok: false }

  const supabase = await createAuthClient()
  const { data, error } = await supabase.functions.invoke('sign-assessment-media', {
    body: { applicationId, path },
  })
  if (error) {
    console.error('[signAssessmentMediaAction] function invoke failed', error)
    return { ok: false }
  }
  const result = data as { ok: boolean; url?: string }
  return result.ok && result.url ? { ok: true, url: result.url } : { ok: false }
}

export async function getMyPendingAssessmentsAction(): Promise<PendingAssessment[]> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return []

  const supabase = await createAuthClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_my_pending_assessments')
  if (error) {
    console.error('[getMyPendingAssessmentsAction] rpc failed', error)
    return []
  }
  return ((data ?? []) as { application_id: string; job_title: string; company_name: string }[]).map((row) => ({
    applicationId: row.application_id,
    jobTitle: row.job_title,
    companyName: row.company_name,
  }))
}
