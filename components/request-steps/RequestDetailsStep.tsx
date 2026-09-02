'use client'

import { useT } from '@/components/LanguageContext'
import Button from '@/components/ui/Button'
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

  const canAdvance =
    draft.title.trim().length > 0 && draft.description.trim().length > 0 && draft.location.trim().length > 0

  function set<K extends keyof RequestDraft>(key: K, value: RequestDraft[K]) {
    onChange({ ...draft, [key]: value })
  }

  function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : []
    set('photos', [...draft.photos, ...files])
    e.target.value = ''
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
            onChange={handlePhotos}
            className="w-full rounded-2xl border border-dashed border-card-border bg-white p-4 text-sm text-ink"
          />
          {draft.photos.length > 0 && (
            <ul className="mt-2 space-y-1">
              {draft.photos.map((photo, i) => (
                <li key={`${photo.name}-${i}`} className="flex items-center justify-between gap-3 text-xs text-muted">
                  <span className="truncate">{photo.name}</span>
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="font-bold text-orange"
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
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
