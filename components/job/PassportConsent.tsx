'use client'

import { useEffect, useState } from 'react'
import { useLanguage, useT } from '@/components/LanguageContext'
import LangToggle from '@/components/ui/LangToggle'
import Button from '@/components/ui/Button'
import type { ApplicationDraft } from '@/components/job/ApplicationForm'
import { submitApplicationAction, type ApplicationErrorCode } from '@/lib/applicationActions'
import { previewPassportAction } from '@/lib/passportActions'
import type { PassportPreview, Standing } from '@/lib/passport'
import type { PublicJob } from '@/lib/hiring'
import { getVisitorId } from '@/lib/funnelClient'

type Preview = { status: 'loading' } | { status: 'error' } | { status: 'ready'; preview: PassportPreview }

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

const ERROR_KEYS: Record<ApplicationErrorCode, 'errRequired' | 'errPhone' | 'errAlreadyApplied' | 'errClosed' | 'errTooMany' | 'errSignedOut' | 'errConsent' | 'errGeneric'> = {
  required: 'errRequired',
  phone: 'errPhone',
  alreadyApplied: 'errAlreadyApplied',
  closed: 'errClosed',
  tooMany: 'errTooMany',
  signedOut: 'errSignedOut',
  consentRequired: 'errConsent',
  generic: 'errGeneric',
}

const MAX_WORK_SHOWN = 5

/**
 * The consent step (VOUCH-MOB.md, "Hiring Passport"): a "what they will
 * see / will not see" panel BEFORE anything is sent. The "will see" side
 * shows the applicant's real facts, built by the same database function the
 * company's view uses. Nothing is shared or submitted until the one
 * "Share and apply" button is tapped — that tap is the consent, and the
 * server refuses the application without it.
 */
export default function PassportConsent({
  job,
  draft,
  onBack,
  onSent,
  onSignedOut,
}: {
  job: PublicJob
  draft: ApplicationDraft
  onBack: (error?: ApplicationErrorCode) => void
  onSent: () => void
  onSignedOut: () => void
}) {
  const { lang } = useLanguage()
  const t = useT()
  const [preview, setPreview] = useState<Preview>({ status: 'loading' })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApplicationErrorCode | null>(null)

  useEffect(() => {
    let cancelled = false
    previewPassportAction()
      .then((result) => {
        if (cancelled) return
        if (result.ok) setPreview({ status: 'ready', preview: result.preview })
        else if (result.error === 'signedOut') onSignedOut()
        else setPreview({ status: 'error' })
      })
      .catch(() => {
        if (!cancelled) setPreview({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
    // Only on mount: this must reflect the record as it is right now.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dateLocale = lang === 'sw' ? 'sw-TZ' : 'en-GB'
  const monthYear = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(dateLocale, { month: 'long', year: 'numeric', timeZone: 'Africa/Dar_es_Salaam' }) : ''

  async function handleShare() {
    if (pending || preview.status !== 'ready') return
    setPending(true)
    setError(null)

    const formData = new FormData()
    formData.set('slug', job.slug)
    formData.set('name', draft.name)
    formData.set('phone', draft.phone)
    formData.set('workHistory', draft.workHistory)
    formData.set('yearsExperience', draft.yearsExperience ?? '')
    for (const q of draft.qualifications) formData.append('qualification', q)
    for (const chip of draft.chips) formData.append('capability', chip)
    formData.set('capabilityText', draft.capabilityText)
    formData.set('availability', draft.availability ?? '')
    formData.set('startDate', draft.startDate)
    formData.set('visitorId', getVisitorId())
    // The applicant tapping "Share and apply" IS the consent.
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
      // Something in their answers needs fixing — send them back to it.
      if (result.error === 'required' || result.error === 'phone') {
        onBack(result.error)
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
        <button type="button" onClick={() => onBack()} className="link-hover tap text-sm font-bold text-neutral">
          ‹ {t('passport', 'back')}
        </button>
        <LangToggle />
      </div>

      <h1 className="mt-6 text-2xl leading-snug font-extrabold text-ink">
        {t('passport', 'heading', { company: job.company_name })}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {t('passport', 'intro', { company: job.company_name, title: job.title })}
      </p>

      {preview.status === 'loading' && <p className="mt-8 text-sm text-muted">{t('passport', 'loading')}</p>}

      {preview.status === 'error' && (
        <p role="alert" className="mt-8 text-sm font-semibold text-red-600">
          {t('passport', 'loadError')}
        </p>
      )}

      {preview.status === 'ready' && (
        <>
          <SeeList
            title={t('passport', 'seeTitle', { company: job.company_name })}
            items={buildSeeItems(preview.preview)}
          />

          <section className="glass mt-4 p-card" aria-labelledby="not-see">
            <h2 id="not-see" className="text-sm font-extrabold text-ink">
              {t('passport', 'notSeeTitle', { company: job.company_name })}
            </h2>
            <ul className="mt-3 space-y-2">
              {(['notSeeOther', 'notSeeFeedback', 'notSeePayments', 'notSeeRates', 'notSeeAnything'] as const).map((key) => (
                <li key={key} className="flex items-start gap-2.5 text-sm text-ink">
                  <span className="icon-circle icon-circle-blue mt-0.5 h-5 w-5" aria-hidden="true">
                    <CrossIcon />
                  </span>
                  <span>{t('passport', key)}</span>
                </li>
              ))}
            </ul>
          </section>

          <p className="mt-4 text-sm leading-relaxed text-muted">{t('passport', 'howLong')}</p>

          {error && (
            <p role="alert" className="mt-4 text-sm font-semibold text-red-600">
              {t('job', ERROR_KEYS[error])}
            </p>
          )}

          <div className="mt-8">
            <p className="mb-3 text-center text-xs text-muted">{t('passport', 'nothingShared')}</p>
            <Button type="button" onClick={handleShare} disabled={pending}>
              {pending ? t('passport', 'sharing') : t('passport', 'share')}
            </Button>
          </div>
        </>
      )}
    </div>
  )

  function buildSeeItems(p: PassportPreview): React.ReactNode[] {
    const expertise = p.expertise.join(' · ')
    const layers = p.verifiedLayers.map((l) => LAYER_LABELS[l]?.[lang] ?? l).join(', ')
    const shown = p.confirmedWork.slice(0, MAX_WORK_SHOWN)
    const hidden = p.confirmedWork.length - shown.length

    return [
      <span key="answers">{t('passport', 'seeAnswers')}</span>,

      <span key="work">
        {t('passport', 'seeWork')}{' '}
        <strong className="font-bold">
          {p.confirmedWork.length === 0
            ? t('passport', 'workNone')
            : p.confirmedWork.length === 1
              ? t('passport', 'workCountOne')
              : t('passport', 'workCount', { count: p.confirmedWork.length })}
        </strong>
        {shown.length > 0 && (
          <ul className="mt-2 space-y-1 border-l-2 border-card-border pl-3 text-xs text-muted">
            {shown.map((w, i) => (
              <li key={i}>
                <span className="font-semibold text-ink">{w.title}</span>
                {w.confirmer_name ? ` · ${w.confirmer_name}` : ''}
                {w.confirmed_at ? ` · ${monthYear(w.confirmed_at)}` : ''}
              </li>
            ))}
            {hidden > 0 && <li>{t('passport', 'workMore', { count: hidden })}</li>}
          </ul>
        )}
      </span>,

      <span key="evidence">
        {t('passport', 'seeEvidence', {
          records: p.evidence.recordsConfirmed,
          clients: p.evidence.distinctConfirmers,
          repeat: p.evidence.repeatClients,
        })}
        <br />
        <span className="text-xs text-muted">
          {p.evidence.lastConfirmedAt
            ? t('passport', 'lastActive', { date: monthYear(p.evidence.lastConfirmedAt) })
            : t('passport', 'lastActiveNone')}
        </span>
      </span>,

      <span key="standing">{t('passport', 'seeStanding', { standing: t('passport', STANDING_KEYS[p.standing]) })}</span>,

      <span key="trade">{expertise ? t('passport', 'seeExpertise', { expertise }) : t('passport', 'expertiseNone')}</span>,

      <span key="verified">
        {p.verifiedLayers.length > 0 ? t('passport', 'seeVerified', { layers }) : t('passport', 'seeNotVerified')}
      </span>,
    ]
  }
}

function SeeList({ title, items }: { title: string; items: React.ReactNode[] }) {
  return (
    <section className="glass mt-6 p-card" aria-labelledby="will-see">
      <h2 id="will-see" className="text-sm font-extrabold text-ink">
        {title}
      </h2>
      <ul className="mt-3 space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-ink">
            <span className="icon-circle icon-circle-green mt-0.5 h-5 w-5 shrink-0" aria-hidden="true">
              <CheckIcon />
            </span>
            <div className="min-w-0">{item}</div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
