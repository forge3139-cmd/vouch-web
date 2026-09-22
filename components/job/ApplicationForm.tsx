'use client'

import { useEffect, useRef } from 'react'
import { useLanguage, useT } from '@/components/LanguageContext'
import LangToggle from '@/components/ui/LangToggle'
import Button from '@/components/ui/Button'
import RadioPills from '@/components/ui/RadioPills'
import type { ApplicationErrorCode } from '@/lib/applicationActions'
import { loadApplicationPrefillAction } from '@/lib/applicationPrefillActions'
import { signOutAction } from '@/lib/auth/authActions'
import type { ApplicantView } from '@/lib/auth/session'
import { CATEGORY_LABELS } from '@/lib/categories'
import { AVAILABILITY_OPTIONS, CAPABILITY_CHIPS, type PublicJob } from '@/lib/hiring'

/** Everything the applicant types. Owned by the parent (JobPage), not by
 * this form, so it survives the form unmounting — for instance when a
 * session expires mid-way and they're sent back through sign-in. */
export interface ApplicationDraft {
  name: string
  phone: string
  experience: string
  chips: string[]
  capabilityText: string
  availability: string | null
  pastWork: string
}

export const EMPTY_DRAFT: ApplicationDraft = {
  name: '',
  phone: '',
  experience: '',
  chips: [],
  capabilityText: '',
  availability: null,
  pastWork: '',
}

const NOTICE_KEYS: Partial<Record<ApplicationErrorCode, 'errRequired' | 'errPhone'>> = {
  required: 'errRequired',
  phone: 'errPhone',
}

/**
 * One short page, no libraries, no photo upload — kept deliberately light
 * for a cheap phone on a slow connection. Name and phone arrive prefilled
 * from the account but stay editable. Who is applying is decided on the
 * server from the verified session, never from anything in this form.
 */
export default function ApplicationForm({
  job,
  applicant,
  draft,
  onDraftChange,
  onBack,
  onContinue,
  onSignedOut,
  notice,
}: {
  job: PublicJob
  applicant: ApplicantView
  draft: ApplicationDraft
  onDraftChange: (patch: Partial<ApplicationDraft>) => void
  onBack: () => void
  /** Goes to the consent panel. Nothing is sent from this page. */
  onContinue: () => void
  onSignedOut: () => void
  /** Set when the consent step found something in the answers to fix. */
  notice?: ApplicationErrorCode | null
}) {
  const { lang } = useLanguage()
  const t = useT()

  // One-tap apply: prefill from their most recent application (or, failing
  // that, their profile's trade) — but only into a genuinely fresh draft.
  // draftRef stays current every render so the check below, which runs
  // after an await, sees what's ACTUALLY in the form then, not what was
  // there when this effect started.
  const draftRef = useRef(draft)
  useEffect(() => {
    draftRef.current = draft
  }, [draft])
  const prefillChecked = useRef(false)

  useEffect(() => {
    if (prefillChecked.current) return
    prefillChecked.current = true

    loadApplicationPrefillAction()
      .then((prefill) => {
        if (!prefill) return
        const current = draftRef.current
        const isFreshDraft =
          !current.experience.trim() &&
          current.chips.length === 0 &&
          !current.capabilityText.trim() &&
          !current.availability &&
          !current.pastWork.trim()
        if (!isFreshDraft) return

        onDraftChange({
          experience: prefill.experience,
          chips: prefill.chips,
          capabilityText: prefill.capabilityText,
          availability: prefill.availability,
          pastWork: prefill.pastWork,
        })
      })
      .catch(() => {
        // A missed prefill just means an empty form, same as before this existed.
      })
    // Once, on mount — see prefillChecked above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canSubmit =
    draft.name.trim() &&
    draft.phone.trim() &&
    draft.experience.trim() &&
    (draft.chips.length > 0 || draft.capabilityText.trim()) &&
    draft.availability

  function toggleChip(enLabel: string) {
    onDraftChange({
      chips: draft.chips.includes(enLabel) ? draft.chips.filter((c) => c !== enLabel) : [...draft.chips, enLabel],
    })
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault()
    if (canSubmit) onContinue()
  }

  async function handleSignOut() {
    await signOutAction().catch(() => {})
    onSignedOut()
  }

  return (
    <form onSubmit={handleContinue} className="form-shell">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="link-hover tap text-sm font-bold text-neutral">
          ‹ {t('job', 'back')}
        </button>
        <LangToggle />
      </div>

      <h1 className="mt-6 text-2xl font-extrabold text-ink">{t('job', 'formTitle')}</h1>
      <p className="mt-1 text-sm font-semibold text-ink">
        {job.title} · {job.company_name}
      </p>
      <p className="mt-1 text-sm text-muted">
        {t('auth', 'applyingAs', { name: applicant.name })} ·{' '}
        <button type="button" onClick={handleSignOut} className="link-hover tap font-bold text-blue">
          {t('auth', 'notYou')}
        </button>
      </p>

      <div className="mt-8 flex-1 space-y-7">
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">{t('job', 'nameLabel')}</legend>
          <input
            value={draft.name}
            onChange={(e) => onDraftChange({ name: e.target.value })}
            autoComplete="name"
            maxLength={100}
            className="field w-full p-4 text-base"
          />
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">{t('job', 'phoneLabel')}</legend>
          <input
            type="tel"
            inputMode="tel"
            value={draft.phone}
            onChange={(e) => onDraftChange({ phone: e.target.value })}
            autoComplete="tel"
            className="field w-full p-4 text-base"
          />
          <p className="mt-2 text-xs text-muted">{t('job', 'phoneHint')}</p>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm font-bold text-ink">{t('job', 'experienceLabel')}</legend>
          <p className="mb-2 text-xs text-muted">{t('job', 'experienceHint')}</p>
          <textarea
            value={draft.experience}
            onChange={(e) => onDraftChange({ experience: e.target.value })}
            rows={4}
            maxLength={1500}
            className="field w-full p-4 text-base"
          />
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm font-bold text-ink">{t('job', 'capabilitiesLabel')}</legend>
          <p className="mb-3 text-xs text-muted">{t('job', 'capabilitiesHint')}</p>
          <div className="flex flex-wrap gap-2">
            {CAPABILITY_CHIPS.map((cat) => {
              const en = CATEGORY_LABELS[cat].en
              const active = draft.chips.includes(en)
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleChip(en)}
                  aria-pressed={active}
                  className={`pill tap px-4 py-2.5 text-sm font-bold ${active ? 'pill-active' : ''}`}
                >
                  {active ? '✓ ' : ''}
                  {CATEGORY_LABELS[cat][lang]}
                </button>
              )
            })}
          </div>
          <input
            value={draft.capabilityText}
            onChange={(e) => onDraftChange({ capabilityText: e.target.value })}
            maxLength={500}
            placeholder={t('job', 'capabilitiesMore')}
            className="field mt-3 w-full p-4 text-base"
          />
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">{t('job', 'availabilityLabel')}</legend>
          <RadioPills
            options={AVAILABILITY_OPTIONS.map((o) => ({ value: o.value, label: t('job', o.labelKey) }))}
            value={draft.availability}
            onChange={(availability) => onDraftChange({ availability })}
          />
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm font-bold text-ink">
            {t('job', 'similarLabel')}
            <span className="ml-2 text-xs font-medium text-muted">{t('job', 'similarOptional')}</span>
          </legend>
          <p className="mb-2 text-xs text-muted">{t('job', 'similarHint')}</p>
          <textarea
            value={draft.pastWork}
            onChange={(e) => onDraftChange({ pastWork: e.target.value })}
            rows={3}
            maxLength={1500}
            className="field w-full p-4 text-base"
          />
        </fieldset>

        {notice && NOTICE_KEYS[notice] && (
          <p role="alert" className="text-sm font-semibold text-red-600">
            {t('job', NOTICE_KEYS[notice])}
          </p>
        )}
      </div>

      <div className="mt-10">
        <Button type="submit" disabled={!canSubmit}>
          {t('passport', 'review')}
        </Button>
      </div>
    </form>
  )
}
