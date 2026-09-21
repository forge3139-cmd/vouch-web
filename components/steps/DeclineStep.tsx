'use client'

import { useActionState, useEffect } from 'react'
import { useT } from '@/components/LanguageContext'
import Button from '@/components/ui/Button'
import { declineConfirmationAction, logStep, type DeclineResult } from '@/lib/actions'

const initialState: DeclineResult = { ok: false }

export default function DeclineStep({
  token,
  onBack,
  onDeclined,
}: {
  token: string
  onBack: () => void
  onDeclined: () => void
}) {
  const t = useT()
  const [state, formAction, pending] = useActionState(declineConfirmationAction, initialState)

  useEffect(() => {
    logStep(token, 'decline')
  }, [token])

  useEffect(() => {
    if (state.ok) onDeclined()
  }, [state, onDeclined])

  return (
    <form action={formAction} className="form-shell">
      <input type="hidden" name="token" value={token} />

      <h1 className="text-2xl font-extrabold text-ink">{t('decline', 'title')}</h1>
      <p className="mt-3 text-sm text-muted">{t('decline', 'body')}</p>

      {state.error && <p className="mt-4 text-sm font-semibold text-red-600">{state.error}</p>}

      <div className="mt-8">
        <label className="mb-2 block text-sm font-semibold text-ink">
          {t('decline', 'reasonLabel')}
        </label>
        <textarea
          name="reason"
          rows={4}
          className="field w-full p-4 text-base text-ink"
        />
      </div>

      <div className="mt-auto flex gap-3 pt-10">
        <button
          type="button"
          onClick={onBack}
          className="btn btn-glass tap px-6 py-4 text-sm"
        >
          {t('questions', 'back')}
        </button>
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? t('decline', 'submitting') : t('decline', 'submit')}
        </Button>
      </div>
    </form>
  )
}
