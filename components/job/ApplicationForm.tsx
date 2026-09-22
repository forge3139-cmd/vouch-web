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
import {
  AVAILABILITY_OPTIONS, QUALIFICATION_OPTIONS, YEARS_EXPERIENCE_OPTIONS, todayInEastAfrica, type PublicJob,
} from '@/lib/hiring'
import { skillsForCategory } from '@/lib/skills'

/** Everything the applicant types. Owned by the parent (JobPage), not by
 * this form, so it survives the form unmounting — for instance when a
 * session expires mid-way and they're sent back through sign-in. */
export interface ApplicationDraft {
  name: string
  phone: string
  workHistory: string
  yearsExperience: string | null
  qualifications: string[]
  chips: string[]
  capabilityText: string
  availability: string | null
  startDate: string
}

export const EMPTY_DRAFT: ApplicationDraft = {
  name: '',
  phone: '',
  workHistory: '',
  yearsExperience: null,
  qualifications: [],
  chips: [],
  capabilityText: '',
  availability: null,
  startDate: '',
}

const NOTICE_KEYS: Partial<Record<ApplicationErrorCode, 'errRequired' | 'errPhone'>> = {
  required: 'errRequired',
  phone: 'errPhone',
}

/** Capitalises the first letter of each word, leaving the rest of what
 * they typed alone — good enough for names typed all-lowercase on a
 * phone keyboard without fighting anyone typing something unusual. */
function autoCapitalize(value: string): string {
  return value.replace(/(^|\s)([a-z])/g, (_, sep: string, letter: string) => sep + letter.toUpperCase())
}

/**
 * One short page, no libraries, no photo upload — kept deliberately light
 * for a cheap phone on a slow connection. Name and phone arrive prefilled
 * from the account but stay editable. Who is applying is decided on the
 * server from the verified session, never from anything in this form.
 *
 * Skills are the job's TRADE's skills (job.category), not a generic list —
 * a company reading applicants for an AC job sees AC skills, not "which
 * trades do you work in".
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
  const skills = skillsForCategory(job.category)

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

    loadApplicationPrefillAction(job.category)
      .then((prefill) => {
        if (!prefill) return
        const current = draftRef.current
        const isFreshDraft =
          !current.workHistory.trim() &&
          !current.yearsExperience &&
          current.qualifications.length === 0 &&
          current.chips.length === 0 &&
          !current.capabilityText.trim() &&
          !current.availability
        if (!isFreshDraft) return

        onDraftChange({
          workHistory: prefill.workHistory,
          yearsExperience: prefill.yearsExperience,
          qualifications: prefill.qualifications,
          chips: prefill.chips,
          capabilityText: prefill.capabilityText,
          availability: prefill.availability,
          startDate: prefill.startDate,
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
    draft.workHistory.trim() &&
    draft.yearsExperience &&
    (draft.chips.length > 0 || draft.capabilityText.trim()) &&
    draft.availability &&
    (draft.availability !== 'Pick a date' || draft.startDate)

  function toggleChip(enLabel: string) {
    onDraftChange({
      chips: draft.chips.includes(enLabel) ? draft.chips.filter((c) => c !== enLabel) : [...draft.chips, enLabel],
    })
  }

  function toggleQualification(value: string) {
    if (value === 'none_yet') {
      onDraftChange({ qualifications: draft.qualifications.includes('none_yet') ? [] : ['none_yet'] })
      return
    }
    const withoutNoneYet = draft.qualifications.filter((q) => q !== 'none_yet')
    onDraftChange({
      qualifications: withoutNoneYet.includes(value)
        ? withoutNoneYet.filter((q) => q !== value)
        : [...withoutNoneYet, value],
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
            onChange={(e) => onDraftChange({ name: autoCapitalize(e.target.value) })}
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
          <legend className="mb-1 text-sm font-bold text-ink">{t('job', 'workHistoryLabel')}</legend>
          <p className="mb-2 text-xs text-muted">{t('job', 'workHistoryHint')}</p>
          <textarea
            value={draft.workHistory}
            onChange={(e) => onDraftChange({ workHistory: e.target.value })}
            rows={4}
            maxLength={1500}
            className="field w-full p-4 text-base"
          />
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">{t('job', 'yearsExperienceLabel')}</legend>
          <RadioPills
            options={YEARS_EXPERIENCE_OPTIONS.map((o) => ({ value: o.value, label: t('job', o.labelKey) }))}
            value={draft.yearsExperience}
            onChange={(yearsExperience) => onDraftChange({ yearsExperience })}
          />
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm font-bold text-ink">{t('job', 'qualificationsLabel')}</legend>
          <p className="mb-3 text-xs text-muted">{t('job', 'qualificationsHint')}</p>
          <div className="flex flex-wrap gap-2">
            {QUALIFICATION_OPTIONS.map((q) => {
              const active = draft.qualifications.includes(q.value)
              return (
                <button
                  key={q.value}
                  type="button"
                  onClick={() => toggleQualification(q.value)}
                  aria-pressed={active}
                  className={`pill tap px-4 py-2.5 text-sm font-bold ${active ? 'pill-active' : ''}`}
                >
                  {active ? '✓ ' : ''}
                  {t('job', q.labelKey)}
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm font-bold text-ink">{t('job', 'capabilitiesLabel')}</legend>
          <p className="mb-3 text-xs text-muted">{t('job', 'capabilitiesHint')}</p>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => {
              const active = draft.chips.includes(skill.en)
              return (
                <button
                  key={skill.en}
                  type="button"
                  onClick={() => toggleChip(skill.en)}
                  aria-pressed={active}
                  className={`pill tap px-4 py-2.5 text-sm font-bold ${active ? 'pill-active' : ''}`}
                >
                  {active ? '✓ ' : ''}
                  {skill[lang]}
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
          {draft.availability === 'Pick a date' && (
            <input
              type="date"
              min={todayInEastAfrica()}
              value={draft.startDate}
              onChange={(e) => onDraftChange({ startDate: e.target.value })}
              className="field mt-3 w-full p-4 text-base"
            />
          )}
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
