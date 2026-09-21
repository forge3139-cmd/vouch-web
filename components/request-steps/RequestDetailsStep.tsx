'use client'

import { useEffect, useMemo, useState } from 'react'
import { useT } from '@/components/LanguageContext'
import Button from '@/components/ui/Button'
import MapPickerSheet from '@/components/MapPickerSheet'
import { compressImage } from '@/lib/compressImage'
import { reverseGeocodeAction } from '@/lib/geocodeActions'
import type { RequestDraft } from '@/components/WorkRequestFlow'

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
  const [mapSheetOpen, setMapSheetOpen] = useState(false)

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

  // Shared by both the button and the map sheet — coordinates are stored
  // either way, and the address field is filled from whatever place name
  // comes back, but stays fully editable afterward either way.
  function applyLocation(newLat: number, newLng: number, address: string | null) {
    onChange({
      ...draft,
      location: address ?? draft.location,
      locationLat: newLat,
      locationLng: newLng,
    })
    setLocationNote(address ? null : t('request', 'locationFoundNoAddress'))
  }

  function handleUseCurrentLocation() {
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
        applyLocation(latitude, longitude, address)
        setLocating(false)
      },
      (error) => {
        setLocating(false)
        // PERMISSION_DENIED / POSITION_UNAVAILABLE / TIMEOUT — logged with
        // the raw code so "could not get your location" isn't the only
        // signal we have when this fails.
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
      // Network-based location resolves in seconds and is plenty precise
      // for an address — a tight, high-accuracy GPS request is exactly
      // what stalls indoors. A cached fix from the last minute is fine too.
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
    )
  }

  function handleMapLocationChange(newLat: number, newLng: number, address: string | null) {
    applyLocation(newLat, newLng, address)
  }

  return (
    <div className="form-shell">
      <div className="flex-1 space-y-6">
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">{t('request', 'titleLabel')}</legend>
          <input
            value={draft.title}
            onChange={(e) => set('title', e.target.value)}
            className="field w-full p-4 text-base text-ink"
          />
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm font-bold text-ink">{t('request', 'descriptionLabel')}</legend>
          <p className="mb-2 text-xs text-muted">{t('request', 'descriptionHint')}</p>
          <textarea
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
            rows={4}
            className="field w-full p-4 text-base text-ink"
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
            className="field w-full p-4 text-base text-ink"
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
            className="field w-full border-dashed p-4 text-sm text-ink disabled:opacity-60"
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
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="btn btn-blue tap w-full py-4 text-sm disabled:opacity-60"
          >
            <PinIcon />
            {locating ? t('request', 'locating') : t('request', 'useCurrentLocation')}
          </button>
          <button
            type="button"
            onClick={() => setMapSheetOpen(true)}
            className="tap mt-2 w-full text-center text-xs font-semibold text-muted underline underline-offset-2"
          >
            {t('request', 'pickOnMap')}
          </button>
          {locationNote && <p className="mt-2 text-xs font-semibold text-muted">{locationNote}</p>}
          <input
            value={draft.location}
            onChange={(e) => set('location', e.target.value)}
            className="mt-3 field w-full p-4 text-base text-ink"
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
            className="field w-full p-4 text-base text-ink"
          />
        </fieldset>
      </div>

      <div className="mt-10">
        <Button type="button" onClick={onNext} disabled={!canAdvance}>
          {t('request', 'next')}
        </Button>
      </div>

      <MapPickerSheet
        open={mapSheetOpen}
        lat={draft.locationLat}
        lng={draft.locationLng}
        onClose={() => setMapSheetOpen(false)}
        onLocationChange={handleMapLocationChange}
      />
    </div>
  )
}
