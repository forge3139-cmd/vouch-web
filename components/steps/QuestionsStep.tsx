'use client'

import { useActionState, useEffect, useState } from 'react'
import { useT } from '@/components/LanguageContext'
import Button from '@/components/ui/Button'
import RadioPills from '@/components/ui/RadioPills'
import StarRating from '@/components/ui/StarRating'
import { logStep, submitConfirmationAction, type SubmitConfirmationResult } from '@/lib/actions'
import { compressImage } from '@/lib/compressImage'

const STEP_NAMES = ['did_happen', 'what', 'when', 'completed', 'rating', 'paid', 'work_again', 'photo']

const initialState: SubmitConfirmationResult = { ok: false, confirmedCount: 0 }

export default function QuestionsStep({
  token,
  originalWhat,
  onBack,
  onSubmitted,
}: {
  token: string
  originalWhat: string
  onBack: () => void
  onSubmitted: (count: number) => void
}) {
  const t = useT()
  const [subStep, setSubStep] = useState(0)
  const [workHappened, setWorkHappened] = useState<'yes' | 'no' | null>(null)
  const [what, setWhat] = useState(originalWhat)
  const [whenMonth, setWhenMonth] = useState('')
  const [wasCompleted, setWasCompleted] = useState<'yes' | 'partly' | null>(null)
  const [rating, setRating] = useState(0)
  const [clientPaymentStatus, setClientPaymentStatus] = useState<'yes' | 'not_yet' | 'partly' | null>(null)
  const [wouldWorkAgain, setWouldWorkAgain] = useState<'yes' | 'maybe' | 'no' | null>(null)
  const [photoCompressing, setPhotoCompressing] = useState(false)

  const [state, formAction, pending] = useActionState(submitConfirmationAction, initialState)

  // The photo <input> is uncontrolled and submitted straight through the
  // form's native FormData — compressing here means swapping its FileList
  // in place via DataTransfer so the compressed file is what actually gets
  // submitted, without switching this off the useActionState form pattern.
  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoCompressing(true)
    try {
      const compressed = await compressImage(file)
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(compressed)
      e.target.files = dataTransfer.files
    } finally {
      setPhotoCompressing(false)
    }
  }

  useEffect(() => {
    logStep(token, STEP_NAMES[subStep])
  }, [token, subStep])

  useEffect(() => {
    if (state.ok) onSubmitted(state.confirmedCount)
  }, [state, onSubmitted])

  const next = () => setSubStep((s) => Math.min(s + 1, STEP_NAMES.length - 1))
  const back = () => (subStep === 0 ? onBack() : setSubStep((s) => s - 1))

  const canAdvance =
    (subStep === 0 && workHappened !== null) ||
    (subStep === 1 && what.trim().length > 0) ||
    (subStep === 2 && whenMonth.length > 0) ||
    (subStep === 3 && wasCompleted !== null) ||
    (subStep === 4 && rating > 0) ||
    (subStep === 5 && clientPaymentStatus !== null) ||
    (subStep === 6 && wouldWorkAgain !== null)

  return (
    <form action={formAction} className="form-shell">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="originalWhat" value={originalWhat} />
      <input type="hidden" name="workHappened" value={workHappened ?? ''} />
      <input type="hidden" name="what" value={what} />
      <input type="hidden" name="whenMonth" value={whenMonth} />
      <input type="hidden" name="wasCompleted" value={wasCompleted ?? ''} />
      <input type="hidden" name="rating" value={rating} />
      <input type="hidden" name="clientPaymentStatus" value={clientPaymentStatus ?? ''} />
      <input type="hidden" name="wouldWorkAgain" value={wouldWorkAgain ?? ''} />

      <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-card-border">
        <div
          className="h-full rounded-full bg-[image:var(--gradient-hero)] transition-all"
          style={{ width: `${((subStep + 1) / STEP_NAMES.length) * 100}%` }}
        />
      </div>

      {state.error && <p className="mb-4 text-sm font-semibold text-red-600">{state.error}</p>}

      <div className="flex-1">
        {subStep === 0 && (
          <fieldset>
            <legend className="mb-4 text-xl font-bold text-ink">
              {t('questions', 'didHappenTitle')}
            </legend>
            <RadioPills
              options={[
                { value: 'yes', label: t('questions', 'yes') },
                { value: 'no', label: t('questions', 'no') },
              ]}
              value={workHappened}
              onChange={setWorkHappened}
            />
          </fieldset>
        )}

        {subStep === 1 && (
          <fieldset>
            <legend className="mb-4 text-xl font-bold text-ink">
              {t('questions', 'whatTitle')}
            </legend>
            <textarea
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              rows={4}
              className="field w-full p-4 text-base text-ink"
            />
          </fieldset>
        )}

        {subStep === 2 && (
          <fieldset>
            <legend className="mb-4 text-xl font-bold text-ink">
              {t('questions', 'whenTitle')}
            </legend>
            <input
              type="month"
              value={whenMonth}
              onChange={(e) => setWhenMonth(e.target.value)}
              className="field w-full p-4 text-base text-ink"
            />
          </fieldset>
        )}

        {subStep === 3 && (
          <fieldset>
            <legend className="mb-4 text-xl font-bold text-ink">
              {t('questions', 'completedTitle')}
            </legend>
            <RadioPills
              options={[
                { value: 'yes', label: t('questions', 'completedYes') },
                { value: 'partly', label: t('questions', 'completedPartly') },
              ]}
              value={wasCompleted}
              onChange={setWasCompleted}
            />
          </fieldset>
        )}

        {subStep === 4 && (
          <fieldset>
            <legend className="mb-4 text-xl font-bold text-ink">
              {t('questions', 'ratingTitle')}
            </legend>
            <StarRating value={rating} onChange={setRating} />
          </fieldset>
        )}

        {subStep === 5 && (
          <fieldset>
            <legend className="mb-4 text-xl font-bold text-ink">
              {t('questions', 'paidTitle')}
            </legend>
            <RadioPills
              options={[
                { value: 'yes', label: t('questions', 'paidYes') },
                { value: 'not_yet', label: t('questions', 'paidNotYet') },
                { value: 'partly', label: t('questions', 'paidPartly') },
              ]}
              value={clientPaymentStatus}
              onChange={setClientPaymentStatus}
            />
          </fieldset>
        )}

        {subStep === 6 && (
          <fieldset>
            <legend className="mb-4 text-xl font-bold text-ink">
              {t('questions', 'workAgainTitle')}
            </legend>
            <RadioPills
              options={[
                { value: 'yes', label: t('questions', 'workAgainYes') },
                { value: 'maybe', label: t('questions', 'workAgainMaybe') },
                { value: 'no', label: t('questions', 'workAgainNo') },
              ]}
              value={wouldWorkAgain}
              onChange={setWouldWorkAgain}
            />
          </fieldset>
        )}

        {subStep === 7 && (
          <fieldset>
            <legend className="mb-1 text-xl font-bold text-ink">
              {t('questions', 'photoTitle')}
              <span className="ml-2 text-sm font-medium text-muted">
                {t('questions', 'photoOptional')}
              </span>
            </legend>
            <p className="mb-4 text-sm text-muted">{t('questions', 'photoHint')}</p>
            <input
              type="file"
              name="photo"
              accept="image/*"
              capture="environment"
              disabled={photoCompressing}
              onChange={handlePhotoChange}
              className="field w-full border-dashed p-4 text-sm text-ink disabled:opacity-60"
            />
            {photoCompressing && <p className="mt-2 text-xs text-muted">Compressing…</p>}
          </fieldset>
        )}
      </div>

      <div className="mt-10 flex gap-3">
        <button
          type="button"
          onClick={back}
          className="btn btn-glass tap px-6 py-4 text-sm"
        >
          {t('questions', 'back')}
        </button>
        {subStep < STEP_NAMES.length - 1 ? (
          <Button type="button" onClick={next} disabled={!canAdvance} className="flex-1">
            {t('questions', 'next')}
          </Button>
        ) : (
          <Button type="submit" disabled={pending || photoCompressing} className="flex-1">
            {pending ? t('questions', 'submitting') : t('questions', 'submit')}
          </Button>
        )}
      </div>
    </form>
  )
}
