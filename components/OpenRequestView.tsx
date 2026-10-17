'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useT } from '@/components/LanguageContext'
import Button from '@/components/ui/Button'
import RadioPills from '@/components/ui/RadioPills'
import AuthPanel from '@/components/job/AuthPanel'
import MapPickerSheet from '@/components/MapPickerSheet'
import { compressImage } from '@/lib/compressImage'
import { reverseGeocodeAction } from '@/lib/geocodeActions'
import { AUTH_CHANGED_EVENT } from '@/lib/auth/events'
import type { AuthErrorCode } from '@/lib/auth/authActions'
import {
  chooseOpenRequestResponseAction, createOpenRequestAction, getOpenRequestAction, getOpenRequestResponsesAction,
} from '@/lib/openRequestActions'
import { TIMING_OPTIONS, type MyOpenRequestRow, type OpenRequestDetail, type OpenRequestResponse, type OpenRequestTiming } from '@/lib/openRequests'

type View = 'list' | 'form' | 'sent' | 'detail'

const STATUS_KEYS: Record<string, 'statusOpen' | 'statusAssigned' | 'statusExpired' | 'statusCancelled'> = {
  open: 'statusOpen',
  assigned: 'statusAssigned',
  expired: 'statusExpired',
  cancelled: 'statusCancelled',
}

export default function OpenRequestView({
  signedIn,
  items,
  loadFailed = false,
  initialAuthError = null,
}: {
  signedIn: boolean
  items: MyOpenRequestRow[]
  loadFailed?: boolean
  initialAuthError?: AuthErrorCode | null
}) {
  const t = useT()
  const [isSignedIn, setIsSignedIn] = useState(signedIn)
  const [myItems, setMyItems] = useState(items)
  const [view, setView] = useState<View>('list')
  const [detailId, setDetailId] = useState<string | null>(null)

  useEffect(() => {
    function onAuthChanged() {
      // A sign-out elsewhere (another tab) should drop this page back to
      // the gate rather than keep showing someone else's requests.
      setIsSignedIn(false)
    }
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged)
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged)
  }, [])

  if (!isSignedIn) {
    return (
      <div className="form-shell">
        <h1 className="mt-6 text-2xl font-extrabold text-ink">{t('openRequest', 'signInTitle')}</h1>
        <p className="mt-2 text-sm text-muted">{t('openRequest', 'postIntro')}</p>
        <div className="mt-4">
          <AuthPanel showTitle={false} next="/request" onSignedIn={() => setIsSignedIn(true)} initialError={initialAuthError} />
        </div>
      </div>
    )
  }

  if (view === 'form') {
    return (
      <OpenRequestForm
        onBack={() => setView('list')}
        onSent={(id) => {
          setMyItems((current) => [{ id, title: '', status: 'open', created_at: new Date().toISOString() }, ...current])
          setDetailId(id)
          setView('detail')
        }}
      />
    )
  }

  if (view === 'detail' && detailId) {
    return <OpenRequestDetailPanel id={detailId} onBack={() => setView('list')} />
  }

  const [featured, ...older] = myItems

  return (
    <div className="page-container flex-1 py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-muted">{t('openRequest', 'eyebrow')}</p>
          <h1 className="mt-1 text-3xl font-extrabold text-ink sm:text-4xl">{t('openRequest', 'myRequestsTitle')}</h1>
        </div>
        <button type="button" onClick={() => setView('form')} className="btn btn-dark tap px-5 py-2.5 text-sm">
          {t('openRequest', 'newRequest')} <span aria-hidden="true">→</span>
        </button>
      </div>

      {loadFailed ? (
        <p role="alert" className="mt-6 text-sm font-semibold text-red-400">{t('openRequest', 'errGeneric')}</p>
      ) : !featured ? (
        <div className="glass mt-6 p-card text-center">
          <p className="text-sm font-semibold text-ink">{t('openRequest', 'myRequestsEmpty')}</p>
        </div>
      ) : (
        <FeaturedRequest
          key={featured.id}
          item={featured}
          onViewOlder={(id) => {
            setDetailId(id)
            setView('detail')
          }}
          olderItems={older}
        />
      )}
    </div>
  )
}

function FeaturedRequest({
  item,
  olderItems,
  onViewOlder,
}: {
  item: MyOpenRequestRow
  olderItems: MyOpenRequestRow[]
  onViewOlder: (id: string) => void
}) {
  const t = useT()
  const [detail, setDetail] = useState<OpenRequestDetail | null>(null)
  const [responses, setResponses] = useState<OpenRequestResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    // No `setLoading(true)` here: the parent keys this component on
    // `item.id`, so a different featured request remounts it fresh —
    // `loading` already starts `true` from the initial state.
    getOpenRequestAction(item.id).then((result) => {
      if (cancelled) return
      if (result.ok) {
        setDetail(result.detail)
        getOpenRequestResponsesAction(item.id).then((r) => {
          if (!cancelled) setResponses(r ?? [])
        })
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [item.id])

  if (loading) {
    return <div className="glass mt-6 p-card text-sm text-muted">{t('passport', 'loading')}</div>
  }

  return (
    <div className="mt-6">
      <RequestHeroCard
        title={detail?.title || item.title || '…'}
        subtitle={detail ? `${detail.expertise}${detail.location ? ` · ${detail.location}` : ''} · ${t('openRequest', 'responsesCount', { count: detail.response_count })}` : ''}
        statusKey={STATUS_KEYS[item.status] ?? 'statusOpen'}
      />

      <h2 className="mt-8 text-lg font-extrabold text-ink">{t('openRequest', 'respondersTitle')}</h2>
      {responses.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t('openRequest', 'responsesEmpty')}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {responses.map((r) => (
            <ResponderRow key={r.response_id} response={r} />
          ))}
        </ul>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[var(--radius-card)] bg-orange p-5">
          <p className="text-4xl font-extrabold leading-none text-ink">{detail?.response_count ?? 0}</p>
          <p className="mt-2 text-sm font-semibold text-ink/70">{t('openRequest', 'peopleResponded')}</p>
        </div>
        <div className="rounded-[var(--radius-card)] bg-ink p-5">
          <p className="text-[11px] font-bold tracking-wide text-orange">{t('openRequest', 'goodToKnowEyebrow')}</p>
          <p className="mt-2 text-base font-extrabold text-white">{t('openRequest', 'goodToKnowTitle')}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-white/60">{t('openRequest', 'goodToKnowBody')}</p>
        </div>
      </div>

      {olderItems.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-extrabold text-ink">{t('openRequest', 'olderRequests')}</h2>
          <ul className="mt-3 space-y-2">
            {olderItems.map((older) => (
              <li key={older.id}>
                <button
                  type="button"
                  onClick={() => onViewOlder(older.id)}
                  className="glass-solid lift tap w-full p-card text-left"
                >
                  <p className="text-sm font-extrabold text-ink">{older.title || '…'}</p>
                  <p className="mt-1 text-xs font-semibold text-neutral">{t('openRequest', STATUS_KEYS[older.status] ?? 'statusOpen')}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

type StatusKey = (typeof STATUS_KEYS)[string]

/** The black focal card for a single request — "Open request" / "Assigned"
 * badge, title, and a one-line summary. Shared by the featured request on
 * the list page and the detail panel for an older one. */
function RequestHeroCard({ title, subtitle, statusKey }: { title: string; subtitle: string; statusKey: StatusKey }) {
  const t = useT()
  return (
    <div className="rounded-[var(--radius-hero)] bg-ink p-6">
      <span className="rounded-pill bg-orange px-3 py-1 text-[11px] font-bold text-ink">{t('openRequest', statusKey)}</span>
      <p className="mt-4 text-2xl font-extrabold text-white">{title}</p>
      {!!subtitle && <p className="mt-1.5 text-sm text-white/55">{subtitle}</p>}
    </div>
  )
}

/** One white row — an evidence-backed person who responded to the request. */
function ResponderRow({ response }: { response: OpenRequestResponse }) {
  const t = useT()
  const initial = response.display_name.charAt(0).toUpperCase()
  const hasWork = response.records_confirmed > 0

  return (
    <li className="glass-solid flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dash-navy-mid text-sm font-extrabold text-dash-navy">
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-ink">{response.display_name}</p>
        <p className="truncate text-xs font-medium text-muted">
          {hasWork
            ? t('directory', 'evidenceCount', { records: response.records_confirmed, confirmers: response.distinct_confirmers })
            : t('directory', 'newOnVouch')}
        </p>
      </div>
      {response.slug ? (
        <Link href={`/w/${response.slug}`} className="btn btn-glass tap shrink-0 px-4 py-2 text-xs">
          {t('openRequest', 'viewRecord')}
        </Link>
      ) : null}
    </li>
  )
}

function OpenRequestForm({ onBack, onSent }: { onBack: () => void; onSent: (id: string) => void }) {
  const t = useT()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [compressing, setCompressing] = useState(false)
  const [location, setLocation] = useState('')
  const [locationLat, setLocationLat] = useState<number | null>(null)
  const [locationLng, setLocationLng] = useState<number | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationNote, setLocationNote] = useState<string | null>(null)
  const [mapSheetOpen, setMapSheetOpen] = useState(false)
  const [expertise, setExpertise] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [negotiable, setNegotiable] = useState(false)
  const [timing, setTiming] = useState<OpenRequestTiming | null>(null)
  const [neededBy, setNeededBy] = useState('')
  const [phone, setPhone] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewUrls = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos])
  useEffect(() => () => previewUrls.forEach((url) => URL.revokeObjectURL(url)), [previewUrls])

  const canSubmit =
    title.trim().length > 0 && expertise.trim().length > 0 && !!timing &&
    (timing !== 'pick_date' || neededBy.length > 0) && !pending

  async function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    if (files.length === 0) return
    setCompressing(true)
    try {
      const compressed = await Promise.all(files.map(compressImage))
      setPhotos((current) => [...current, ...compressed])
    } finally {
      setCompressing(false)
    }
  }

  function applyLocation(lat: number, lng: number, address: string | null) {
    setLocationLat(lat)
    setLocationLng(lng)
    if (address) setLocation(address)
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
      (err) => {
        setLocating(false)
        setLocationNote(
          err.code === err.PERMISSION_DENIED
            ? t('request', 'locationErrorDenied')
            : err.code === err.POSITION_UNAVAILABLE
              ? t('request', 'locationErrorUnavailable')
              : err.code === err.TIMEOUT
                ? t('request', 'locationErrorTimeout')
                : t('request', 'locationErrorGeneric')
        )
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
    )
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setPending(true)
    setError(null)

    const formData = new FormData()
    formData.set('title', title)
    formData.set('description', description)
    formData.set('location', location)
    if (locationLat !== null) formData.set('locationLat', String(locationLat))
    if (locationLng !== null) formData.set('locationLng', String(locationLng))
    formData.set('expertise', expertise)
    if (budgetMin.trim()) formData.set('budgetMin', budgetMin)
    if (budgetMax.trim()) formData.set('budgetMax', budgetMax)
    formData.set('budgetNegotiable', negotiable ? 'yes' : 'no')
    formData.set('timing', timing ?? '')
    if (timing === 'pick_date') formData.set('neededBy', neededBy)
    if (phone) formData.set('phone', phone)
    for (const photo of photos) formData.append('photos', photo)

    const result = await createOpenRequestAction(formData)
    setPending(false)

    if (!result.ok) {
      setError(t('openRequest', result.error === 'invalid' ? 'errRequired' : result.error === 'phone' ? 'errPhone' : result.error === 'tooMany' ? 'errTooMany' : 'errGeneric'))
      return
    }
    onSent(result.id)
  }

  return (
    <div className="form-shell">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="link-hover tap text-sm font-bold text-neutral">
          ‹ {t('openRequest', 'back')}
        </button>
      </div>

      <h1 className="mt-6 text-2xl font-extrabold text-ink">{t('openRequest', 'postTitle')}</h1>
      <p className="mt-1 text-sm text-muted">{t('openRequest', 'postIntro')}</p>

      <div className="mt-6 flex-1 space-y-6">
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">{t('openRequest', 'titleLabel')}</legend>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="field w-full p-4 text-base text-ink" />
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">{t('openRequest', 'expertiseLabel')}</legend>
          <input
            value={expertise}
            onChange={(e) => setExpertise(e.target.value)}
            placeholder={t('openRequest', 'expertisePlaceholder')}
            className="field w-full p-4 text-base text-ink"
          />
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm font-bold text-ink">{t('openRequest', 'descriptionLabel')}</legend>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="field w-full p-4 text-base text-ink" />
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm font-bold text-ink">
            {t('openRequest', 'photosLabel')}
            <span className="ml-2 text-xs font-medium text-muted">{t('openRequest', 'photosOptional')}</span>
          </legend>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            disabled={compressing}
            onChange={handlePhotos}
            className="field w-full border-dashed p-4 text-sm text-ink disabled:opacity-60"
          />
          {photos.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {photos.map((photo, i) => (
                <div key={`${photo.name}-${i}`} className="relative h-20 w-20 overflow-hidden rounded-xl border border-card-border bg-white">
                  {previewUrls[i] && (
                    // eslint-disable-next-line @next/next/no-img-element -- blob: object URL
                    <img src={previewUrls[i]} alt="" className="h-full w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => setPhotos((current) => current.filter((_, idx) => idx !== i))}
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
          <legend className="mb-2 text-sm font-bold text-ink">{t('openRequest', 'locationLabel')}</legend>
          <button type="button" onClick={handleUseCurrentLocation} disabled={locating} className="btn btn-blue tap w-full py-4 text-sm disabled:opacity-60">
            {locating ? t('request', 'locating') : t('request', 'useCurrentLocation')}
          </button>
          <button type="button" onClick={() => setMapSheetOpen(true)} className="tap mt-2 w-full text-center text-xs font-semibold text-muted underline underline-offset-2">
            {t('request', 'pickOnMap')}
          </button>
          {locationNote && <p className="mt-2 text-xs font-semibold text-muted">{locationNote}</p>}
          <input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-3 field w-full p-4 text-base text-ink" />
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">{t('openRequest', 'budgetLabel')}</legend>
          <div className="flex gap-3">
            <input
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              inputMode="numeric"
              placeholder={t('openRequest', 'budgetMinPlaceholder')}
              className="field w-full p-4 text-base text-ink"
            />
            <input
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              inputMode="numeric"
              placeholder={t('openRequest', 'budgetMaxPlaceholder')}
              className="field w-full p-4 text-base text-ink"
            />
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <input type="checkbox" checked={negotiable} onChange={(e) => setNegotiable(e.target.checked)} className="h-4 w-4" />
            {t('openRequest', 'budgetNegotiable')}
          </label>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">{t('openRequest', 'timingLabel')}</legend>
          <RadioPills
            options={TIMING_OPTIONS.map((o) => ({ value: o.value, label: t('openRequest', o.labelKey) }))}
            value={timing}
            onChange={setTiming}
          />
          {timing === 'pick_date' && (
            <input type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} className="field mt-3 w-full p-4 text-base" />
          )}
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">{t('openRequest', 'phoneLabel')}</legend>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="field w-full p-4 text-base" />
        </fieldset>

        {error && <p role="alert" className="text-sm font-semibold text-red-400">{error}</p>}
      </div>

      <div className="mt-8">
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
          {pending ? t('openRequest', 'posting') : t('openRequest', 'post')}
        </Button>
      </div>

      <MapPickerSheet open={mapSheetOpen} lat={locationLat} lng={locationLng} onClose={() => setMapSheetOpen(false)} onLocationChange={applyLocation} />
    </div>
  )
}

function OpenRequestDetailPanel({ id, onBack }: { id: string; onBack: () => void }) {
  const t = useT()
  const [detail, setDetail] = useState<OpenRequestDetail | null>(null)
  const [responses, setResponses] = useState<OpenRequestResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [chosenName, setChosenName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getOpenRequestAction(id).then((result) => {
      if (cancelled) return
      if (result.ok) {
        setDetail(result.detail)
        if (result.detail.is_requester) {
          getOpenRequestResponsesAction(id).then((r) => {
            if (!cancelled) setResponses(r ?? [])
          })
        }
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  async function handleChoose(response: OpenRequestResponse) {
    if (!confirm(t('openRequest', 'chooseConfirm').replace('{name}', response.display_name))) return
    setBusy(true)
    const result = await chooseOpenRequestResponseAction(response.response_id)
    setBusy(false)
    if (result.ok) {
      setChosenName(response.display_name)
      setDetail((current) => (current ? { ...current, status: 'assigned' } : current))
    }
  }

  return (
    <div className="page-container flex-1 py-8 sm:py-10">
      <button type="button" onClick={onBack} className="link-hover tap text-sm font-bold text-neutral">
        ‹ {t('openRequest', 'back')}
      </button>

      {loading ? (
        <p className="mt-8 text-sm text-muted">{t('passport', 'loading')}</p>
      ) : !detail ? (
        <p role="alert" className="mt-8 text-sm font-semibold text-red-400">{t('openRequest', 'errGeneric')}</p>
      ) : (
        <>
          <div className="mt-6">
            <RequestHeroCard
              title={detail.title}
              subtitle={`${detail.expertise}${detail.location ? ` · ${detail.location}` : ''} · ${detail.budget_text} · ${detail.timing_text}`}
              statusKey={STATUS_KEYS[detail.status] ?? 'statusOpen'}
            />
          </div>
          {!!detail.description && <p className="mt-4 text-sm leading-relaxed text-ink">{detail.description}</p>}

          {chosenName && (
            <p className="mt-4 rounded-card bg-green-tint p-4 text-sm font-semibold text-green">
              {t('openRequest', 'choose')}: {chosenName}
            </p>
          )}

          <h2 className="mt-8 text-lg font-extrabold text-ink">{t('openRequest', 'respondersTitle')} · {responses.length}</h2>
          {responses.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t('openRequest', 'responsesEmpty')}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {responses.map((r) => (
                <li key={r.response_id} className="glass-solid p-card">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-extrabold text-ink">{r.display_name}</p>
                    {r.price != null && <p className="text-sm font-bold text-blue">{r.price_currency} {r.price.toLocaleString()}</p>}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {r.records_confirmed > 0
                      ? t('directory', 'evidenceCount', { records: r.records_confirmed, confirmers: r.distinct_confirmers })
                      : t('directory', 'newOnVouch')}
                  </p>
                  {r.note && <p className="mt-2 text-sm text-ink italic">“{r.note}”</p>}
                  {detail.status === 'open' && !chosenName && (
                    <button
                      type="button"
                      onClick={() => handleChoose(r)}
                      disabled={busy}
                      className="btn btn-blue tap mt-3 w-full py-2.5 text-xs disabled:opacity-50"
                    >
                      {t('openRequest', 'choose')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
