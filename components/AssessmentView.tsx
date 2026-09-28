'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { compressImage } from '@/lib/compressImage'
import {
  getAssessmentForApplicationAction, signAssessmentMediaAction, submitAssessmentAction, uploadAssessmentMediaAction,
  type GetAssessmentResult,
} from '@/lib/assessmentActions'
import type { AssessmentAnswer } from '@/lib/assessments'

const SUGGESTED_SECONDS = 15 * 60

type AnswerType = 'voice' | 'photo' | 'text'
type UploadStatus = 'idle' | 'uploading' | 'uploaded' | 'failed'

interface DraftAnswer {
  type: AnswerType | null
  text: string
  blob: Blob | null
  previewUrl: string | null
  /** The storage path — assessment-media is a private bucket, so this
   * alone can't be used as a src. Only used when actually submitting. */
  uploadedPath: string | null
  /** A short-lived signed URL, resolved lazily for a reloaded submitted
   * answer that has no local blob/previewUrl to show instead. */
  signedPreviewUrl: string | null
  durationSeconds: number
  uploadStatus: UploadStatus
}

const EMPTY_DRAFT: DraftAnswer = {
  type: null, text: '', blob: null, previewUrl: null, uploadedPath: null, signedPreviewUrl: null,
  durationSeconds: 0, uploadStatus: 'idle',
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function isAnswerReady(draft: DraftAnswer): boolean {
  if (draft.type === 'text') return draft.text.trim().length > 0
  if (draft.type === 'voice' || draft.type === 'photo') return draft.uploadStatus === 'uploaded'
  return false
}

function pickAudioMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(type)) return type
  }
  return ''
}

/**
 * The candidate's side of an assessment — voice is the default for
 * trades, photo and text are also valid. Never scored, one attempt, and a
 * timer that only ever informs — it never disables anything.
 */
export default function AssessmentView({
  applicationId,
  initial,
}: {
  applicationId: string
  initial: GetAssessmentResult
}) {
  const [result, setResult] = useState(initial)
  const [drafts, setDrafts] = useState<DraftAnswer[]>(
    initial.ok
      ? initial.view.submitted && initial.view.answers
        ? initial.view.answers.map(answerToDraft)
        : initial.view.questions.map(() => ({ ...EMPTY_DRAFT }))
      : []
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recordingIndex, setRecordingIndex] = useState<number | null>(null)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  // onstop's closure is fixed at recorder-creation time, so the live
  // recorded length has to come from a ref, not the recordingSeconds state.
  const recordingSecondsRef = useRef(0)

  const submitted = result.ok && result.view.submitted

  useEffect(() => {
    if (!result.ok || submitted) return
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [result.ok, submitted])

  // Release the microphone if the tab closes or they navigate away mid-recording.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    if (recordingIndex === null) return
    const id = setInterval(() => {
      setRecordingSeconds((s) => {
        recordingSecondsRef.current = s + 1
        return s + 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [recordingIndex])

  function answerToDraft(a: AssessmentAnswer): DraftAnswer {
    if (a.type === 'text') return { ...EMPTY_DRAFT, type: 'text', text: a.text }
    if (a.type === 'voice') return { ...EMPTY_DRAFT, type: 'voice', uploadedPath: a.audio_url, durationSeconds: a.duration_seconds, uploadStatus: 'uploaded' }
    return { ...EMPTY_DRAFT, type: 'photo', uploadedPath: a.photo_url, uploadStatus: 'uploaded' }
  }

  function patchDraft(index: number, patch: Partial<DraftAnswer>) {
    setDrafts((current) => current.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  // Reloaded submitted answers have a path but no local blob to preview —
  // resolve a signed URL for those once, on mount.
  useEffect(() => {
    if (!initial.ok || !initial.view.submitted || !initial.view.answers) return
    initial.view.answers.forEach((a, i) => {
      if ((a.type === 'voice' || a.type === 'photo') && (a.type === 'voice' ? a.audio_url : a.photo_url)) {
        const path = a.type === 'voice' ? a.audio_url : a.photo_url
        signAssessmentMediaAction(applicationId, path).then((res) => {
          if (res.ok) patchDraft(i, { signedPreviewUrl: res.url })
        })
      }
    })
    // Only ever needed once, for the initial server-rendered submission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function chooseType(index: number, type: AnswerType) {
    if (drafts[index].type === type) return
    patchDraft(index, { ...EMPTY_DRAFT, type })
  }

  async function startRecording(index: number) {
    if (recordingIndex !== null) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = pickAudioMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        const previewUrl = URL.createObjectURL(blob)
        patchDraft(index, { blob, previewUrl, durationSeconds: recordingSecondsRef.current, uploadStatus: 'idle' })
        stream.getTracks().forEach((t) => t.stop())
        uploadDraft(index, blob, 'voice', `answer.${(mimeType.split('/')[1] || 'webm').split(';')[0]}`)
      }
      mediaRecorderRef.current = recorder
      recordingSecondsRef.current = 0
      setRecordingSeconds(0)
      recorder.start()
      setRecordingIndex(index)
    } catch (e) {
      console.error('[AssessmentView] getUserMedia failed', e)
      setError('Allow microphone access to record your answer.')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecordingIndex(null)
  }

  async function pickPhoto(index: number, file: File) {
    const compressed = await compressImage(file)
    const previewUrl = URL.createObjectURL(compressed)
    patchDraft(index, { blob: compressed, previewUrl, uploadStatus: 'idle' })
    uploadDraft(index, compressed, 'photo', 'answer.jpg')
  }

  function uploadDraft(index: number, blob: Blob, kind: AnswerType, filename: string) {
    patchDraft(index, { uploadStatus: 'uploading' })
    const formData = new FormData()
    formData.set('applicationId', applicationId)
    formData.set('questionIndex', String(index))
    formData.set('kind', kind)
    formData.set('file', blob, filename)
    uploadAssessmentMediaAction(formData)
      .then((res) => {
        if (res.ok) patchDraft(index, { uploadedPath: res.path, uploadStatus: 'uploaded' })
        else patchDraft(index, { uploadStatus: 'failed' })
      })
      .catch((e) => {
        console.error('[AssessmentView] upload failed', e)
        patchDraft(index, { uploadStatus: 'failed' })
      })
  }

  function retryUpload(index: number) {
    const draft = drafts[index]
    if (!draft.blob || !draft.type || draft.type === 'text') return
    uploadDraft(index, draft.blob, draft.type, draft.type === 'photo' ? 'answer.jpg' : 'answer.webm')
  }

  const canSubmit = result.ok && drafts.length > 0 && drafts.every(isAnswerReady) && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    if (!confirm('Submit your answers? You get one attempt — this can’t be changed once sent.')) return
    setSubmitting(true)
    setError(null)
    const answers: AssessmentAnswer[] = drafts.map((d) => {
      if (d.type === 'text') return { type: 'text', text: d.text.trim() }
      if (d.type === 'voice') return { type: 'voice', audio_url: d.uploadedPath!, duration_seconds: d.durationSeconds, transcript: null }
      return { type: 'photo', photo_url: d.uploadedPath!, caption: null }
    })
    const submitResult = await submitAssessmentAction(applicationId, answers)
    setSubmitting(false)
    if (!submitResult.ok) {
      setError(submitResult.error === 'alreadySubmitted' ? 'This was already submitted.' : 'Please check your connection and try again.')
      const refreshed = await getAssessmentForApplicationAction(applicationId)
      setResult(refreshed)
      return
    }
    setResult((current) => (current.ok ? { ok: true, view: { ...current.view, submitted: true, answers } } : current))
  }

  if (!result.ok) {
    return (
      <div className="form-shell">
        <p className="mt-8 text-sm font-semibold text-red-600">
          {result.error === 'signedOut'
            ? 'Sign in to see this.'
            : result.error === 'notInvited'
              ? 'There’s no assessment for this application.'
              : 'Something went wrong. Please try again.'}
        </p>
        <Link href="/applications" className="link-hover tap mt-4 inline-block text-sm font-bold text-blue">
          ‹ Back to your applications
        </Link>
      </div>
    )
  }

  const view = result.view

  return (
    <div className="form-shell">
      <div className="flex items-center justify-between">
        <Link href="/applications" className="link-hover tap text-sm font-bold text-neutral">
          ‹ Back to your applications
        </Link>
        {!submitted && (
          <span className={`text-sm font-bold tabular-nums ${elapsedSeconds > SUGGESTED_SECONDS ? 'text-orange' : 'text-muted'}`}>
            {formatDuration(elapsedSeconds)}
          </span>
        )}
      </div>

      <h1 className="mt-6 text-2xl font-extrabold text-ink">Assessment</h1>

      <div className="glass mt-4 p-card">
        <p className="text-[11px] font-bold tracking-wide text-muted">SITUATION</p>
        <p className="mt-2 text-sm leading-relaxed text-ink">{view.situation}</p>
      </div>

      {submitted ? (
        <p className="mt-4 rounded-card bg-green-tint px-4 py-2 text-sm font-semibold text-green">Submitted</p>
      ) : (
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Under 15 minutes. Answer by voice, photo or text — voice is usually fastest. One attempt.
        </p>
      )}

      <div className="mt-6 space-y-8">
        {view.questions.map((question, i) => {
          const draft = drafts[i] ?? EMPTY_DRAFT
          const isRecordingThis = recordingIndex === i
          const disabled = submitted || (recordingIndex !== null && !isRecordingThis)

          return (
            <fieldset key={i}>
              <legend className="mb-2 text-sm font-bold text-ink">{question}</legend>

              {!submitted && (
                <div className="mb-3 flex gap-2">
                  <TypeButton label="Voice" active={draft.type === 'voice'} disabled={disabled} onClick={() => chooseType(i, 'voice')} />
                  <TypeButton label="Photo" active={draft.type === 'photo'} disabled={disabled} onClick={() => chooseType(i, 'photo')} />
                  <TypeButton label="Text" active={draft.type === 'text'} disabled={disabled} onClick={() => chooseType(i, 'text')} />
                </div>
              )}

              {draft.type === 'text' && (
                <textarea
                  value={draft.text}
                  onChange={(e) => patchDraft(i, { text: e.target.value })}
                  rows={4}
                  disabled={submitted}
                  placeholder="Your answer"
                  className="field w-full p-4 text-base text-ink disabled:opacity-70"
                />
              )}

              {draft.type === 'voice' && (
                <div>
                  {isRecordingThis ? (
                    <button type="button" onClick={stopRecording} className="btn tap w-full bg-red-600 py-3 text-sm font-bold text-white">
                      ● Recording… {formatDuration(recordingSeconds)} · Click to stop
                    </button>
                  ) : draft.uploadStatus === 'idle' && !draft.blob ? (
                    <button type="button" disabled={disabled} onClick={() => startRecording(i)} className="btn btn-blue tap w-full py-3 text-sm disabled:opacity-50">
                      Start recording
                    </button>
                  ) : (
                    <>
                      {(draft.previewUrl || draft.signedPreviewUrl) && (
                        <audio controls src={draft.previewUrl ?? draft.signedPreviewUrl ?? undefined} className="mb-2 w-full" />
                      )}
                      <UploadRow
                        label={`Voice answer · ${formatDuration(draft.durationSeconds)}`}
                        status={draft.uploadStatus}
                        onRetry={() => retryUpload(i)}
                        onRedo={submitted ? undefined : () => patchDraft(i, { ...EMPTY_DRAFT, type: 'voice' })}
                      />
                    </>
                  )}
                </div>
              )}

              {draft.type === 'photo' && (
                <div>
                  {!draft.blob && !draft.uploadedPath ? (
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => e.target.files?.[0] && pickPhoto(i, e.target.files[0])}
                      className="field w-full border-dashed p-4 text-sm text-ink"
                    />
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview or a signed Supabase Storage URL */}
                      <img src={draft.previewUrl ?? draft.signedPreviewUrl ?? ''} alt="" className="mb-2 h-40 w-full rounded-xl object-cover" />
                      <UploadRow
                        label="Photo answer"
                        status={draft.uploadStatus}
                        onRetry={() => retryUpload(i)}
                        onRedo={submitted ? undefined : () => patchDraft(i, { ...EMPTY_DRAFT, type: 'photo' })}
                      />
                    </>
                  )}
                </div>
              )}
            </fieldset>
          )
        })}
      </div>

      {error && <p role="alert" className="mt-4 text-sm font-semibold text-red-600">{error}</p>}

      {submitted && !!view.companyFeedback && (
        <div className="glass mt-4 p-card">
          <p className="text-[11px] font-bold tracking-wide text-muted">FEEDBACK FROM THE COMPANY</p>
          <p className="mt-2 text-sm leading-relaxed text-ink">{view.companyFeedback}</p>
        </div>
      )}

      {!submitted && (
        <div className="mt-8">
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? 'Sending…' : 'Submit'}
          </Button>
        </div>
      )}
    </div>
  )
}

function TypeButton({ label, active, disabled, onClick }: { label: string; active: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`pill tap px-4 py-2 text-xs font-bold disabled:opacity-40 ${active ? 'pill-active' : ''}`}
    >
      {label}
    </button>
  )
}

function UploadRow({
  label, status, onRetry, onRedo,
}: {
  label: string
  status: UploadStatus
  onRetry: () => void
  onRedo?: () => void
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={status === 'uploaded' ? 'text-green' : status === 'failed' ? 'text-red-600' : 'text-muted'}>
        {status === 'uploading' ? 'Uploading…' : status === 'uploaded' ? label : 'Upload failed'}
      </span>
      {status === 'failed' && (
        <button type="button" onClick={onRetry} className="link-hover tap font-bold text-blue">Retry</button>
      )}
      {status === 'uploaded' && onRedo && (
        <button type="button" onClick={onRedo} className="link-hover tap font-bold text-blue">Redo</button>
      )}
    </div>
  )
}
