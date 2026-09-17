'use client'

import { useEffect, useMemo, useState } from 'react'
import { useT } from '@/components/LanguageContext'
import Button from '@/components/ui/Button'
import { compressImage } from '@/lib/compressImage'
import { reverseGeocodeAction } from '@/lib/geocodeActions'
import type { RequestDraft } from '@/components/WorkRequestFlow'

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  )
}

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
  const [locating, setLocating] = useState(false)
  const [locationNote, setLocationNote] = useState<string | null>(null)

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

  function handleUseLocation() {
    setLocationNote(null)

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationNote(t('request', 'locationErrorUnsupported'))
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        let address: string | null = null
        try {
          address = await reverseGeocodeAction(latitude, longitude)
        } catch {
          address = null
        }

        onChange({
          ...draft,
          location: address ?? draft.location,
          locationLat: latitude,
          locationLng: longitude,
        })
        if (!address) setLocationNote(t('request', 'locationFoundNoAddress'))
        setLocating(false)
      },
      (error) => {
        setLocating(false)
        // PERMISSION_DENIED / POSITION_UNAVAILABLE / TIMEOUT — logged with
        // the raw code because "could not get your location" alone gave no
        // way to tell an indoor GPS timeout from a denied prompt.
        console.error('[RequestDetailsStep] getCurrentPosition failed', { code: error.code, message: error.message })
        setLocationNote(
          error.code === error.PERMISSION_DENIED
            ? t('request', 'locationErrorDenied')
            : error.code === error.POSITION_UNAVAILABLE
              ? t('request', 'locationErrorUnavailable')
              : error.code === error.TIMEOUT
                ? t('request', 'locationErrorTimeout')
                : t('request', 'locationErrorGeneric')
        )
      },
      // A tight, high-accuracy request is exactly what stalls indoors on
      // Android — GPS can't get a fix and there's no fallback within the
      // timeout. Network-based location resolves in seconds and is plenty
      // precise for an address, and a cached fix from the last minute is
      // fine too rather than forcing a fresh read every time.
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
    )
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
          <button
            type="button"
            onClick={handleUseLocation}
            disabled={locating}
            className="mb-2 flex items-center gap-2 rounded-2xl border border-card-border bg-white px-4 py-3 text-sm font-bold text-orange disabled:opacity-60"
          >
            <PinIcon />
            {locating ? t('request', 'locating') : t('request', 'useCurrentLocation')}
          </button>
          {locationNote && <p className="mb-2 text-xs font-semibold text-muted">{locationNote}</p>}
          <input
            value={draft.location}
            onChange={(e) => set('location', e.target.value)}
            className="w-full rounded-2xl border border-card-border bg-white p-4 text-base text-ink"
          />
          <p className="mt-2 text-xs text-muted">{t('request', 'locationHint')}</p>
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
