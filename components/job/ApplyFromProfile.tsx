'use client'

import { useEffect, useRef, useState } from 'react'
import { useLanguage, useT } from '@/components/LanguageContext'
import Button from '@/components/ui/Button'
import RadioPills from '@/components/ui/RadioPills'
import { signOutAction } from '@/lib/auth/authActions'
import type { ApplicantView } from '@/lib/auth/session'
import { submitApplicationAction, type ApplicationErrorCode } from '@/lib/applicationActions'
import { previewPassportAction } from '@/lib/passportActions'
import {
  addPortfolioItemAction, deletePortfolioItemAction, updateCapabilitiesAction, updateExpertiseAction,
  type PortfolioItemResult,
} from '@/lib/profileActions'
import type { PassportPreview, Standing } from '@/lib/passport'
import { AVAILABILITY_OPTIONS, todayInEastAfrica, type PublicJob } from '@/lib/hiring'
import { addExpertise, expertiseSuggestions, MAX_CAPABILITIES_ENTRIES, MAX_EXPERTISE_ENTRIES, withDraft } from '@/lib/expertise'
import { getVisitorId } from '@/lib/funnelClient'

type Preview = { status: 'loading' } | { status: 'error' } | { status: 'ready'; preview: PassportPreview }
type Section = 'expertise' | 'capabilities' | 'portfolio' | null

const STANDING_KEYS: Record<Standing, 'standingNew' | 'standingEstablished' | 'standingProven' | 'standingTrusted'> = {
  new: 'standingNew',
  established: 'standingEstablished',
  proven: 'standingProven',
  trusted: 'standingTrusted',
}

const LAYER_LABELS: Record<string, { en: string; sw: string }> = {
  human: { en: 'Human', sw: 'Binadamu' },
  named: { en: 'Named', sw: 'Jina kamili' },
  affiliated: { en: 'Affiliated', sw: 'Mshirika' },
}

const ERROR_KEYS: Record<
  ApplicationErrorCode,
  'errRequired' | 'errPhone' | 'errAlreadyApplied' | 'errClosed' | 'errTooMany' | 'errSignedOut' | 'errConsent' | 'errProfileEmpty' | 'errGeneric'
> = {
  required: 'errRequired',
  phone: 'errPhone',
  alreadyApplied: 'errAlreadyApplied',
  closed: 'errClosed',
  tooMany: 'errTooMany',
  signedOut: 'errSignedOut',
  consentRequired: 'errConsent',
  profileEmpty: 'errProfileEmpty',
  generic: 'errGeneric',
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Apply pulls entirely from the profile — nothing is re-asked. What the
 * company will see (expertise, capabilities, portfolio, confirmed work) is
 * reviewed here, with an Edit control on each that saves straight to the
 * profile, not to a draft. Only availability and an optional note are
 * unique to this application.
 */
export default function ApplyFromProfile({
  job,
  applicant,
  onBack,
  onSent,
  onSignedOut,
}: {
  job: PublicJob
  applicant: ApplicantView
  onBack: () => void
  onSent: () => void
  onSignedOut: () => void
}) {
  const { lang } = useLanguage()
  const t = useT()
  const [preview, setPreview] = useState<Preview>({ status: 'loading' })
  const [editing, setEditing] = useState<Section>(null)
  const [availability, setAvailability] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [note, setNote] = useState('')
  const [phone, setPhone] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApplicationErrorCode | null>(null)

  function load() {
    previewPassportAction()
      .then((result) => {
        if (result.ok) setPreview({ status: 'ready', preview: result.preview })
        else if (result.error === 'signedOut') onSignedOut()
        else setPreview({ status: 'error' })
      })
      .catch(() => setPreview({ status: 'error' }))
  }

  // Only on mount: this must reflect the record as it is right now.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [])

  const dateLocale = lang === 'sw' ? 'sw-TZ' : 'en-GB'
  const monthYear = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(dateLocale, { month: 'short', year: 'numeric', timeZone: 'Africa/Dar_es_Salaam' }) : ''

  async function handleSignOut() {
    await signOutAction().catch(() => {})
    onSignedOut()
  }

  const needsPhone = !applicant.phone
  const canSubmit =
    preview.status === 'ready' && !pending && !!availability &&
    (availability !== 'Pick a date' || DATE_RE.test(startDate)) &&
    (needsPhone ? phone.trim().length > 0 : true)

  async function handleSubmit() {
    if (!canSubmit) return
    setPending(true)
    setError(null)

    const formData = new FormData()
    formData.set('slug', job.slug)
    formData.set('availability', availability ?? '')
    formData.set('startDate', startDate)
    formData.set('note', note)
    if (needsPhone) formData.set('phone', phone)
    formData.set('visitorId', getVisitorId())
    formData.set('consent', 'yes')

    try {
      const result = await submitApplicationAction(formData)
      if (result.ok) {
        onSent()
        return
      }
      if (result.error === 'signedOut') {
        onSignedOut()
        return
      }
      setError(result.error)
    } catch {
      setError('generic')
    }
    setPending(false)
  }

  return (
    <div className="form-shell">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="link-hover tap text-sm font-bold text-neutral">
          ‹ {t('job', 'back')}
        </button>
      </div>

      <h1 className="mt-6 text-2xl font-extrabold text-ink">{t('job', 'formTitle')}</h1>
      <p className="mt-1 text-sm font-semibold text-ink">{job.title} · {job.company_name}</p>
      <p className="mt-1 text-sm text-muted">
        {t('auth', 'applyingAs', { name: applicant.name })} ·{' '}
        <button type="button" onClick={handleSignOut} className="link-hover tap font-bold text-blue">
          {t('auth', 'notYou')}
        </button>
      </p>

      {preview.status === 'loading' && <p className="mt-8 text-sm text-muted">{t('passport', 'loading')}</p>}

      {preview.status === 'error' && (
        <p role="alert" className="mt-8 text-sm font-semibold text-red-600">
          {t('passport', 'loadError')}
        </p>
      )}

      {preview.status === 'ready' && (() => {
        const p = preview.preview
        const profileEmpty = p.expertise.length === 0 && p.capabilities.length === 0 && p.portfolio.length === 0 && p.confirmedWork.length === 0

        return (
          <>
            {profileEmpty ? (
              <div className="glass mt-6 p-card">
                <p className="text-base font-extrabold text-ink">{t('job', 'emptyProfileTitle')}</p>
                <p className="mt-1 text-sm text-muted">{t('job', 'emptyProfileBody', { company: job.company_name })}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEditing('expertise')} className="pill tap px-4 py-2 text-xs font-bold">
                    {t('job', 'addExpertise')}
                  </button>
                  <button type="button" onClick={() => setEditing('capabilities')} className="pill tap px-4 py-2 text-xs font-bold">
                    {t('job', 'addSkills')}
                  </button>
                  <button type="button" onClick={() => setEditing('portfolio')} className="pill tap px-4 py-2 text-xs font-bold">
                    {t('job', 'addPortfolio')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-6 text-sm font-bold text-muted">{t('job', 'willSeeHeading', { company: job.company_name })}</p>

                <section className="glass mt-2 divide-y divide-card-border p-card">
                  <ReviewSection
                    label={t('job', 'sectionExpertise')}
                    linkLabel={p.expertise.length ? t('job', 'edit') : t('job', 'add')}
                    onEdit={() => setEditing(editing === 'expertise' ? null : 'expertise')}
                  >
                    {editing === 'expertise' ? (
                      <ListEditor
                        values={p.expertise}
                        max={MAX_EXPERTISE_ENTRIES}
                        suggestions={expertiseSuggestions(lang)}
                        onSave={async (next) => {
                          const result = await updateExpertiseAction(next)
                          if (result.ok) {
                            setEditing(null)
                            load()
                          }
                          return result.ok
                        }}
                        onCancel={() => setEditing(null)}
                      />
                    ) : (
                      <p className="text-sm text-ink">{p.expertise.length ? p.expertise.join(' · ') : t('job', 'nothingAdded')}</p>
                    )}
                  </ReviewSection>

                  <ReviewSection
                    label={t('job', 'sectionSkills')}
                    linkLabel={p.capabilities.length ? t('job', 'edit') : t('job', 'add')}
                    onEdit={() => setEditing(editing === 'capabilities' ? null : 'capabilities')}
                  >
                    {editing === 'capabilities' ? (
                      <ListEditor
                        values={p.capabilities}
                        max={MAX_CAPABILITIES_ENTRIES}
                        suggestions={expertiseSuggestions(lang)}
                        onSave={async (next) => {
                          const result = await updateCapabilitiesAction(next)
                          if (result.ok) {
                            setEditing(null)
                            load()
                          }
                          return result.ok
                        }}
                        onCancel={() => setEditing(null)}
                      />
                    ) : p.capabilities.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {p.capabilities.map((c) => (
                          <span key={c} className="rounded-pill bg-black/5 px-2.5 py-1 text-xs font-bold text-ink">{c}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-ink">{t('job', 'nothingAdded')}</p>
                    )}
                  </ReviewSection>

                  <ReviewSection
                    label={t('job', 'sectionPortfolio')}
                    linkLabel={p.portfolio.length ? t('job', 'edit') : t('job', 'add')}
                    onEdit={() => setEditing(editing === 'portfolio' ? null : 'portfolio')}
                  >
                    {editing === 'portfolio' ? (
                      <PortfolioEditor items={p.portfolio} onChanged={load} />
                    ) : p.portfolio.length ? (
                      <div className="flex flex-wrap gap-3">
                        {p.portfolio.map((item) => (
                          <div key={item.id} className="w-20">
                            {item.cover_url ? (
                              // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL
                              <img src={item.cover_url} alt="" className="h-20 w-20 rounded-xl object-cover" />
                            ) : (
                              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-black/5 text-xs text-muted">—</div>
                            )}
                            <p className="mt-1 line-clamp-2 text-xs text-muted">{item.title}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-ink">{t('job', 'nothingAdded')}</p>
                    )}
                  </ReviewSection>

                  <ReviewSection label={t('job', 'sectionConfirmedWork')}>
                    {p.confirmedWork.length === 0 ? (
                      <p className="text-sm text-ink">{t('passport', 'workNone')}</p>
                    ) : (
                      <ul className="space-y-1 text-sm text-ink">
                        {p.confirmedWork.slice(0, 3).map((w, i) => (
                          <li key={i}>
                            {w.title} · {w.confirmer_name ?? '—'}{w.confirmed_at ? ` · ${monthYear(w.confirmed_at)}` : ''}
                          </li>
                        ))}
                        {p.confirmedWork.length > 3 && (
                          <li className="text-xs text-muted">{t('passport', 'workMore', { count: p.confirmedWork.length - 3 })}</li>
                        )}
                      </ul>
                    )}
                  </ReviewSection>
                </section>

                <section className="glass mt-4 p-card text-sm text-ink">
                  <p>{t('passport', 'seeEvidence', { records: p.evidence.recordsConfirmed, clients: p.evidence.distinctConfirmers, repeat: p.evidence.repeatClients })}</p>
                  <p className="mt-2">{t('passport', 'seeStanding', { standing: t('passport', STANDING_KEYS[p.standing]) })}</p>
                  <p className="mt-2">
                    {p.verifiedLayers.length > 0
                      ? t('passport', 'seeVerified', { layers: p.verifiedLayers.map((l) => LAYER_LABELS[l]?.[lang] ?? l).join(', ') })
                      : t('passport', 'seeNotVerified')}
                  </p>
                </section>
                <p className="mt-3 text-xs text-muted">{t('job', 'accessNote')}</p>

                <div className="mt-6 space-y-7">
                  <fieldset>
                    <legend className="mb-2 text-sm font-bold text-ink">{t('job', 'availabilityLabel')}</legend>
                    <RadioPills
                      options={AVAILABILITY_OPTIONS.map((o) => ({ value: o.value, label: t('job', o.labelKey) }))}
                      value={availability}
                      onChange={setAvailability}
                    />
                    {availability === 'Pick a date' && (
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        min={todayInEastAfrica()}
                        className="field mt-3 w-full p-4 text-base"
                      />
                    )}
                  </fieldset>

                  <fieldset>
                    <legend className="mb-2 text-sm font-bold text-ink">{t('job', 'noteLabel')}</legend>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value.slice(0, 500))}
                      rows={3}
                      maxLength={500}
                      placeholder={t('job', 'notePlaceholder')}
                      className="field w-full p-4 text-base"
                    />
                  </fieldset>

                  {needsPhone && (
                    <fieldset>
                      <legend className="mb-2 text-sm font-bold text-ink">{t('job', 'phoneLabel')}</legend>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        autoComplete="tel"
                        className="field w-full p-4 text-base"
                      />
                    </fieldset>
                  )}
                </div>

                {error && (
                  <p role="alert" className="mt-4 text-sm font-semibold text-red-600">
                    {t('job', ERROR_KEYS[error])}
                  </p>
                )}

                <div className="mt-8">
                  <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
                    {pending ? t('passport', 'sharing') : t('passport', 'share')}
                  </Button>
                </div>
              </>
            )}
          </>
        )
      })()}
    </div>
  )
}

function ReviewSection({
  label, linkLabel, onEdit, children,
}: {
  label: string
  linkLabel?: string
  onEdit?: () => void
  children: React.ReactNode
}) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold tracking-wide text-muted">{label}</p>
        {linkLabel && onEdit && (
          <button type="button" onClick={onEdit} className="link-hover tap text-xs font-bold text-blue">
            {linkLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function ListEditor({
  values, max, suggestions, onSave, onCancel,
}: {
  values: string[]
  max: number
  suggestions: string[]
  onSave: (next: string[]) => Promise<boolean>
  onCancel: () => void
}) {
  const [current, setCurrent] = useState(values)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const pending = withDraft(current, draft, max)

  async function handleSave() {
    setSaving(true)
    const ok = await onSave(pending)
    setSaving(false)
    if (!ok) inputRef.current?.focus()
  }

  return (
    <div>
      {current.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {current.map((v) => (
            <span key={v} className="flex items-center gap-1.5 rounded-pill bg-ink px-3 py-1.5 text-xs font-bold text-white">
              {v}
              <button type="button" onClick={() => setCurrent(current.filter((x) => x !== v))} aria-label={`Remove ${v}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="field w-full p-3 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            setCurrent(addExpertise(current, draft, max))
            setDraft('')
          }}
          disabled={!draft.trim() || current.length >= max}
          className="btn btn-dark tap px-4 py-2 text-xs disabled:opacity-40"
        >
          +
        </button>
      </div>
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setCurrent(addExpertise(current, s, max))}
              className="pill tap px-3 py-1.5 text-xs font-bold"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onCancel} disabled={saving} className="btn btn-glass tap flex-1 py-2.5 text-xs">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || pending.length === 0}
          className="btn btn-dark tap flex-[2] py-2.5 text-xs disabled:opacity-40"
        >
          {saving ? '…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function PortfolioEditor({ items, onChanged }: { items: PortfolioItemResult[]; onChanged: () => void }) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleAdd() {
    if (!title.trim()) return
    setBusy(true)
    const formData = new FormData()
    formData.set('title', title)
    if (file) formData.set('photo', file)
    const result = await addPortfolioItemAction(formData)
    setBusy(false)
    if (result.ok) {
      setTitle('')
      setFile(null)
      onChanged()
    }
  }

  async function handleDelete(id: string) {
    await deletePortfolioItemAction(id)
    onChanged()
  }

  return (
    <div>
      {items.length > 0 && (
        <ul className="mb-3 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              {item.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL
                <img src={item.cover_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-black/5" />
              )}
              <span className="flex-1 text-sm text-ink">{item.title}</span>
              <button type="button" onClick={() => handleDelete(item.id)} className="text-xs font-bold text-red-600">
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-xs"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          className="field flex-1 p-2.5 text-sm"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={busy || !title.trim()}
          className="btn btn-dark tap px-4 py-2 text-xs disabled:opacity-40"
        >
          {busy ? '…' : 'Add'}
        </button>
      </div>
    </div>
  )
}
