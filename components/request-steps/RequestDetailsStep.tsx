'use client'

import { useEffect, useMemo, useState } from 'react'
import { useT } from '@/components/LanguageContext'
import Button from '@/components/ui/Button'
import { compressImage } from '@/lib/compressImage'
import type { RequestDraft } from '@/components/WorkRequestFlow'

export default function RequestDetailsStep({
  draft,
  onChange,
  onNext,
}: {
  draft: RequestDraft
  onChange: (draft: RequestDraft) => void
  onNext: () => void
}) {
  const t = useT()
  const [compressing, setCompressing] = useState(false)

  // Derived straight from draft.photos rather than synced into its own
  // state — object URLs are only valid client-side and leak memory if not
  // revoked, so the effect below only handles that cleanup.
  const previewUrls = useMemo(() => draft.photos.map((file) => URL.createObjectURL(file)), [draft.photos])

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  const canAdvance =
    draft.title.trim().length > 0 && draft.description.trim().length > 0 && draft.location.trim().length > 0

  function set<K extends keyof RequestDraft>(key: K, value: RequestDraft[K]) {
    onChange({ ...draft, [key]: value })
  }

  async function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    if (files.length === 0) return

    setCompressing(true)
    try {
      const compressed = await Promise.all(files.map(compressImage))
      set('photos', [...draft.photos, ...compressed])
    } finally {
      setCompressing(false)
    }
  }

  function removePhoto(index: number) {
    set('photos', draft.photos.filter((_, i) => i !== index))
  }

  return (
    <div className="flex min-h-dvh flex-col px-6 py-10">
      <div className="flex-1 space-y-6">
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">{t('request', 'titleLabel')}</legend>
          <input
            value={draft.title}
            onChange={(e) => set('title', e.target.value)}
            className="w-full rounded-2xl border border-card-border bg-white p-4 text-base text-ink"
          />
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm font-bold text-ink">{t('request', 'descriptionLabel')}</legend>
          <p className="mb-2 text-xs text-muted">{t('request', 'descriptionHint')}</p>
          <textarea
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-card-border bg-white p-4 text-base text-ink"
          />
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">
            {t('request', 'specificationsLabel')}
            <span className="ml-2 text-xs font-medium text-muted">{t('request', 'specificationsOptional')}</span>
          </legend>
          <textarea
            value={draft.specifications}
            onChange={(e) => set('specifications', e.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-card-border bg-white p-4 text-base text-ink"
          />
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm font-bold text-ink">
            {t('request', 'photosLabel')}
            <span className="ml-2 text-xs font-medium text-muted">{t('request', 'photosOptional')}</span>
          </legend>
          <p className="mb-2 text-xs text-muted">{t('request', 'photosHint')}</p>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            disabled={compressing}
            onChange={handlePhotos}
            className="w-full rounded-2xl border border-dashed border-card-border bg-white p-4 text-sm text-ink disabled:opacity-60"
          />
          {compressing && <p className="mt-2 text-xs text-muted">Compressing…</p>}
          {draft.photos.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {draft.photos.map((photo, i) => (
                <div
                  key={`${photo.name}-${i}`}
                  className="relative h-20 w-20 overflow-hidden rounded-xl border border-card-border bg-white"
                >
                  {previewUrls[i] && (
                    // eslint-disable-next-line @next/next/no-img-element -- blob: object URL, not an optimizable remote/static image
                    <img src={previewUrls[i]} alt="" className="h-full w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label="Remove photo"
                    className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-xs font-bold text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">{t('request', 'locationLabel')}</legend>
          <input
            value={draft.location}
            onChange={(e) => set('location', e.target.value)}
            className="w-full rounded-2xl border border-card-border bg-white p-4 text-base text-ink"
          />
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">
            {t('request', 'neededByLabel')}
            <span className="ml-2 text-xs font-medium text-muted">{t('request', 'neededByOptional')}</span>
          </legend>
          <input
            type="date"
            value={draft.neededBy}
            onChange={(e) => set('neededBy', e.target.value)}
            className="w-full rounded-2xl border border-card-border bg-white p-4 text-base text-ink"
          />
        </fieldset>
      </div>

      <div className="mt-10">
        <Button type="button" onClick={onNext} disabled={!canAdvance}>
          {t('request', 'next')}
        </Button>
      </div>
    </div>
  )
}
