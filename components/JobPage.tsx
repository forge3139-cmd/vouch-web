'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LanguageProvider, useLanguage, useT } from '@/components/LanguageContext'
import LangToggle from '@/components/ui/LangToggle'
import Badge from '@/components/ui/Badge'
import AuthPanel from '@/components/job/AuthPanel'
import ApplicationForm, { EMPTY_DRAFT, type ApplicationDraft } from '@/components/job/ApplicationForm'
import PassportConsent from '@/components/job/PassportConsent'
import ApplicationSent from '@/components/job/ApplicationSent'
import type { ApplicationErrorCode } from '@/lib/applicationActions'
import type { ApplicantView } from '@/lib/auth/session'
import { EMPLOYMENT_LABEL_KEYS, formatSalary, isJobClosed, type PublicJob } from '@/lib/hiring'
import { once, trackFunnel } from '@/lib/funnelClient'

type Step = 'view' | 'auth' | 'apply' | 'consent' | 'sent'

export default function JobPage({
  job,
  initialApplicant,
}: {
  job: PublicJob
  /** Set when the visitor already has a valid session. Name and phone only. */
  initialApplicant: ApplicantView | null
}) {
  return (
    <LanguageProvider>
      <JobInner job={job} initialApplicant={initialApplicant} />
    </LanguageProvider>
  )
}

function formatDeadline(iso: string, lang: 'en' | 'sw'): string {
  // Fixed timezone so server and browser render the same day.
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang === 'sw' ? 'sw-TZ' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// The draft is a convenience copy of what they typed — never anything about
// the session. sessionStorage (tab-scoped) so a refresh or an email
// confirmation in the same tab doesn't cost them their answers.
function draftKey(slug: string): string {
  return `vouch:apply-draft:${slug}`
}

function readDraft(slug: string): ApplicationDraft {
  if (typeof window === 'undefined') return EMPTY_DRAFT
  try {
    const raw = window.sessionStorage.getItem(draftKey(slug))
    return raw ? { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<ApplicationDraft>) } : EMPTY_DRAFT
  } catch {
    return EMPTY_DRAFT
  }
}

function JobInner({ job, initialApplicant }: { job: PublicJob; initialApplicant: ApplicantView | null }) {
  const { lang } = useLanguage()
  const t = useT()
  const [step, setStep] = useState<Step>('view')
  const [applicant, setApplicant] = useState<ApplicantView | null>(initialApplicant)
  const [formNotice, setFormNotice] = useState<ApplicationErrorCode | null>(null)
  const [draft, setDraft] = useState<ApplicationDraft>(() => {
    const saved = readDraft(job.slug)
    return initialApplicant
      ? { ...saved, name: saved.name || initialApplicant.name, phone: saved.phone || initialApplicant.phone }
      : saved
  })

  const closed = isJobClosed(job)
  const salary = formatSalary(job)

  // Funnel step 1: the job page was viewed (once per tab per job).
  useEffect(() => {
    once(`vouch:viewed:${job.slug}`, () => trackFunnel('job_viewed', job.slug))
  }, [job.slug])

  // Keep the draft across refreshes. Written on change; cleared on submit.
  useEffect(() => {
    if (step === 'sent') return
    try {
      window.sessionStorage.setItem(draftKey(job.slug), JSON.stringify(draft))
    } catch {
      // Storage unavailable — the in-memory draft still survives sign-in.
    }
  }, [draft, job.slug, step])

  function patchDraft(patch: Partial<ApplicationDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  function handleApply() {
    // Funnel step 2: Apply tapped.
    trackFunnel('apply_tapped', job.slug)
    setStep(applicant ? 'apply' : 'auth')
  }

  function handleSignedIn(next: ApplicantView) {
    setApplicant(next)
    // Prefill from the account, but never over something they already typed.
    setDraft((current) => ({
      ...current,
      name: current.name || next.name,
      phone: current.phone || next.phone,
    }))
    setStep('apply')
  }

  function handleSent() {
    try {
      window.sessionStorage.removeItem(draftKey(job.slug))
    } catch {
      // Nothing to clear.
    }
    setStep('sent')
  }

  if (step === 'auth' && !closed) {
    return (
      <div className="form-shell">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setStep('view')} className="link-hover tap text-sm font-bold text-neutral">
            ‹ {t('job', 'back')}
          </button>
          <LangToggle />
        </div>
        <div className="mt-6">
          <AuthPanel jobSlug={job.slug} onSignedIn={handleSignedIn} />
          <p className="mt-6 text-center text-xs text-muted">{t('auth', 'keptNote')}</p>
        </div>
      </div>
    )
  }

  if (step === 'apply' && !closed && applicant) {
    return (
      <ApplicationForm
        job={job}
        applicant={applicant}
        draft={draft}
        onDraftChange={patchDraft}
        onBack={() => setStep('view')}
        onContinue={() => {
          setFormNotice(null)
          setStep('consent')
        }}
        onSignedOut={() => {
          setApplicant(null)
          setStep('auth')
        }}
        notice={formNotice}
      />
    )
  }

  if (step === 'consent' && !closed && applicant) {
    return (
      <PassportConsent
        job={job}
        draft={draft}
        onBack={(error) => {
          setFormNotice(error ?? null)
          setStep('apply')
        }}
        onSent={handleSent}
        onSignedOut={() => {
          setApplicant(null)
          setStep('auth')
        }}
      />
    )
  }

  if (step === 'sent') {
    return <ApplicationSent job={job} />
  }

  return (
    <div className="flex min-h-dvh flex-col pb-12">
      <div className="mx-auto w-full max-w-[720px] px-page pt-5 sm:pt-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="link-hover tap flex items-center text-sm font-extrabold text-ink">
            VOUCH
          </Link>
          <LangToggle />
        </div>

        <section className="hero-card mt-4 p-5 sm:p-7">
          <Badge variant="onHero" size="sm">
            {closed ? t('job', 'closedTitle') : t('job', 'pill')}
          </Badge>
          <h1 className="mt-4 text-2xl leading-tight font-extrabold text-white sm:text-3xl">{job.title}</h1>
          <p className="mt-1 text-base font-semibold text-white/90">{job.company_name}</p>

          <ul className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-white">
            <li className="pill pill-on-hero gap-1.5 px-3 py-1.5">
              <PinIcon />
              {job.location}
            </li>
            <li className="pill pill-on-hero px-3 py-1.5">{t('job', EMPLOYMENT_LABEL_KEYS[job.employment_type])}</li>
            {salary && <li className="pill pill-on-hero px-3 py-1.5">{salary}</li>}
            <li className="pill pill-on-hero px-3 py-1.5">
              {t('job', 'applyBy', { date: formatDeadline(job.deadline, lang) })}
            </li>
          </ul>

          {!closed && (
            <button
              type="button"
              onClick={handleApply}
              className="btn btn-dark tap mt-6 w-full py-4 text-base active:opacity-80"
            >
              {t('job', 'apply')}
            </button>
          )}
        </section>

        {closed && (
          <div className="glass mt-4 flex items-start gap-3 p-card" role="status">
            <span className="icon-circle icon-circle-blue">
              <LockIcon />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">{t('job', 'closedTitle')}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{t('job', 'closedBody')}</p>
            </div>
          </div>
        )}

        <div className="glass mt-4 p-card">
          <p className="text-[11px] font-bold tracking-wide text-muted">{t('job', 'descriptionLabel')}</p>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink">{job.description}</p>
        </div>

        <div className="glass mt-4 p-card">
          <p className="text-[11px] font-bold tracking-wide text-muted">{t('job', 'requirementsLabel')}</p>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink">{job.requirements}</p>
        </div>

        {!closed && (
          <button
            type="button"
            onClick={handleApply}
            className="btn btn-dark tap mt-6 w-full py-4 text-base active:opacity-80"
          >
            {t('job', 'apply')}
          </button>
        )}
      </div>
    </div>
  )
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}
