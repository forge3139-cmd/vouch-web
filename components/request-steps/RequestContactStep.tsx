'use client'

import { useState } from 'react'
import { useT } from '@/components/LanguageContext'
import Button from '@/components/ui/Button'
import { submitWorkRequestAction } from '@/lib/requestActions'
import type { RequestDraft } from '@/components/WorkRequestFlow'

export default function RequestContactStep({
  slug,
  draft,
  onBack,
  onSent,
}: {
  slug: string
  draft: RequestDraft
  onBack: () => void
  onSent: () => void
}) {
  const t = useT()
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = clientName.trim().length > 0 && clientPhone.trim().length > 0 && !pending

  async function handleSubmit() {
    setPending(true)
    setError(null)

    const formData = new FormData()
    formData.set('slug', slug)
    formData.set('title', draft.title)
    formData.set('description', draft.description)
    formData.set('specifications', draft.specifications)
    formData.set('location', draft.location)
    formData.set('neededBy', draft.neededBy)
    formData.set('clientName', clientName)
    formData.set('clientPhone', clientPhone)
    for (const photo of draft.photos) {
      formData.append('photos', photo)
    }

    const result = await submitWorkRequestAction(formData)

    setPending(false)

    if (!result.ok) {
      setError(result.error ?? t('error', 'generic'))
      return
    }

    onSent()
  }

  return (
    <div className="flex min-h-dvh flex-col px-6 py-10">
      <div className="flex-1 space-y-6">
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">{t('request', 'nameLabel')}</legend>
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full rounded-2xl border border-card-border bg-white p-4 text-base text-ink"
          />
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm font-bold text-ink">{t('request', 'phoneLabel')}</legend>
          <input
            type="tel"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            className="w-full rounded-2xl border border-card-border bg-white p-4 text-base text-ink"
          />
          <p className="mt-2 text-xs text-muted">{t('request', 'phoneHint')}</p>
        </fieldset>

        <p className="rounded-2xl bg-card-border p-4 text-sm text-ink">{t('request', 'callNote')}</p>

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      </div>

      <div className="mt-10 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-2xl border border-card-border bg-white px-6 py-4 text-sm font-bold text-ink"
        >
          {t('request', 'back')}
        </button>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
          {pending ? t('request', 'sending') : t('request', 'send')}
        </Button>
      </div>
    </div>
  )
}
