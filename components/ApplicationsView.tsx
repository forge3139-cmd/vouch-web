'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LanguageProvider, useLanguage, useT } from '@/components/LanguageContext'
import LangToggle from '@/components/ui/LangToggle'
import AuthPanel from '@/components/job/AuthPanel'
import { signOutAction, type AuthErrorCode } from '@/lib/auth/authActions'
import { withdrawApplicationAction } from '@/lib/passportActions'
import { EMPLOYMENT_LABEL_KEYS, STATUS_LABEL_KEYS, type ApplicationStatus } from '@/lib/hiring'
import type { MyApplication } from '@/lib/myApplications'
import type { RecommendedJob } from '@/lib/recommendedJobs'

export interface ApplicationsViewProps {
  signedIn: boolean
  items: MyApplication[]
  loadFailed: boolean
  /** Null = the lookup failed; [] = genuinely none. */
  recommended: RecommendedJob[] | null
  hasTrade: boolean
  /** Set right after a failed Google round trip. */
  initialAuthError?: AuthErrorCode | null
}

export default function ApplicationsView(props: ApplicationsViewProps) {
  return (
    <LanguageProvider>
      <ApplicationsInner {...props} />
    </LanguageProvider>
  )
}

const ACCENTS = ['orange', 'blue', 'green'] as const

function ApplicationsInner({
  signedIn, items, loadFailed, recommended, hasTrade, initialAuthError = null,
}: ApplicationsViewProps) {
  const { lang } = useLanguage()
  const t = useT()
  const router = useRouter()

  const dateLocale = lang === 'sw' ? 'sw-TZ' : 'en-GB'
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Africa/Dar_es_Salaam',
    })

  async function handleSignOut() {
    await signOutAction().catch(() => {})
    router.refresh()
  }

  const activeAccess = items.filter((i) => i.access.state === 'active')

  return (
    <div className="form-shell">
      <div className="flex items-center justify-between">
        <Link href="/" className="link-hover tap flex items-center text-sm font-extrabold text-ink">
          VOUCH
        </Link>
        <LangToggle />
      </div>

      {!signedIn ? (
        <div className="mt-6">
          <h1 className="text-2xl font-extrabold text-ink">{t('applied', 'signInTitle')}</h1>
          <p className="mt-2 text-sm text-muted">{t('auth', 'intro')}</p>
          <div className="mt-2">
            <AuthPanel
              showTitle={false}
              next="/applications"
              onSignedIn={() => router.refresh()}
              initialError={initialAuthError}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between gap-3">
            <h1 className="text-2xl font-extrabold text-ink">{t('applied', 'title')}</h1>
            <button type="button" onClick={handleSignOut} className="link-hover tap text-xs font-bold text-blue">
              {t('applied', 'signOut')}
            </button>
          </div>

          {loadFailed ? (
            <p role="alert" className="mt-6 text-sm font-semibold text-red-600">
              {t('applied', 'loadError')}
            </p>
          ) : (
            <>
              {/* Who can see the passport right now. */}
              <section className="glass mt-6 p-card" aria-labelledby="access-heading">
                <h2 id="access-heading" className="text-sm font-extrabold text-ink">
                  {t('applied', 'accessTitle')}
                </h2>
                {activeAccess.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">{t('applied', 'accessNone')}</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {activeAccess.map((item) => (
                      <li key={item.id} className="text-sm text-ink">
                        <span className="font-bold">{item.companyName}</span>
                        <span className="text-muted"> · {item.jobTitle}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {items.length === 0 ? (
                <div className="glass mt-4 p-card text-center">
                  <p className="text-base font-bold text-ink">{t('applied', 'emptyTitle')}</p>
                  <p className="mt-1 text-sm text-muted">{t('applied', 'emptyBody')}</p>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {items.map((item, i) => (
                    <ApplicationCard key={item.id} item={item} accent={ACCENTS[i % 3]} fmt={fmt} />
                  ))}
                </ul>
              )}

              <Recommendations recommended={recommended} hasTrade={hasTrade} />
            </>
          )}
        </>
      )}
    </div>
  )
}

function ApplicationCard({
  item,
  accent,
  fmt,
}: {
  item: MyApplication
  accent: 'orange' | 'blue' | 'green'
  fmt: (iso: string) => string
}) {
  const t = useT()
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  async function handleWithdraw() {
    setPending(true)
    setError(false)
    try {
      const result = await withdrawApplicationAction(item.id)
      if (result.ok) {
        router.refresh()
        return
      }
      setError(true)
    } catch {
      setError(true)
    }
    setPending(false)
  }

  const { access } = item
  const accessLabel =
    access.state === 'active'
      ? t('applied', 'accessActive')
      : access.state === 'job_closed'
        ? t('applied', 'accessJobClosed')
        : access.state === 'withdrawn'
          ? t('applied', 'accessWithdrawn')
          : null

  return (
    <li className={`glass-solid accent-bar accent-${accent} p-card ${item.withdrawn ? 'opacity-70' : ''}`}>
      <p className="text-base font-extrabold text-ink">{item.jobTitle}</p>
      <p className="text-sm text-muted">{item.companyName}</p>
      <p className="mt-2 text-xs font-semibold text-neutral">{t('applied', 'appliedOn', { date: fmt(item.appliedAt) })}</p>

      <StatusPill status={item.status} withdrawn={item.withdrawn} />

      {accessLabel && (
        <div className="mt-3 rounded-2xl bg-white/60 p-3 text-sm">
          <p className={access.state === 'active' ? 'font-bold text-ink' : 'font-semibold text-neutral'}>{accessLabel}</p>
          {access.grantedAt && (
            <p className="mt-1 text-xs text-muted">{t('applied', 'accessSharedOn', { date: fmt(access.grantedAt) })}</p>
          )}
          <p className="mt-0.5 text-xs text-muted">
            {access.views === 0
              ? t('applied', 'accessNotViewed')
              : `${access.views === 1 ? t('applied', 'accessViewsOne') : t('applied', 'accessViews', { count: access.views })}${
                  access.lastViewedAt ? ` · ${t('applied', 'accessLastViewed', { date: fmt(access.lastViewedAt) })}` : ''
                }`}
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
        <Link href={`/j/${item.jobSlug}`} className="link-hover tap inline-block text-xs font-bold text-blue">
          {t('applied', 'viewJob')} ›
        </Link>
        {!item.withdrawn && !confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="link-hover tap text-xs font-bold text-neutral"
          >
            {t('applied', 'withdraw')}
          </button>
        )}
      </div>

      {confirming && !item.withdrawn && (
        <div className="mt-2 rounded-2xl bg-orange-light p-3" role="alertdialog" aria-labelledby={`wd-${item.id}`}>
          <p id={`wd-${item.id}`} className="text-sm font-bold text-ink">
            {t('applied', 'withdrawTitle')}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-neutral">
            {t('applied', 'withdrawBody', { company: item.companyName })}
          </p>
          {error && (
            <p role="alert" className="mt-2 text-xs font-semibold text-red-600">
              {t('applied', 'withdrawError')}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleWithdraw}
              disabled={pending}
              className="btn btn-dark tap flex-1 py-2.5 text-xs disabled:opacity-50"
            >
              {pending ? t('applied', 'withdrawing') : t('applied', 'withdrawConfirm')}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="btn btn-glass tap flex-1 py-2.5 text-xs">
              {t('applied', 'withdrawCancel')}
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

/** Open jobs in the same trade as the person's profile. Nothing smarter. */
function Recommendations({ recommended, hasTrade }: { recommended: RecommendedJob[] | null; hasTrade: boolean }) {
  const { lang } = useLanguage()
  const t = useT()

  return (
    <section className="mt-8" aria-labelledby="rec-heading">
      <h2 id="rec-heading" className="text-lg font-extrabold text-ink">
        {t('applied', 'recTitle')}
      </h2>

      {!hasTrade ? (
        <p className="glass mt-3 p-card text-sm text-muted">{t('applied', 'recNoTrade')}</p>
      ) : recommended === null ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-600">
          {t('applied', 'loadError')}
        </p>
      ) : recommended.length === 0 ? (
        <p className="glass mt-3 p-card text-sm text-muted">{t('applied', 'recEmpty')}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {recommended.map((job) => (
            <li key={job.slug} className="glass-solid lift p-card">
              <p className="text-base font-extrabold text-ink">{job.title}</p>
              <p className="text-sm text-muted">
                {job.companyName} · {job.location}
              </p>
              <p className="mt-1 text-xs font-semibold text-neutral">
                {t('job', EMPLOYMENT_LABEL_KEYS[job.employmentType])} ·{' '}
                {t('job', 'applyBy', {
                  date: new Date(`${job.deadline}T12:00:00Z`).toLocaleDateString(lang === 'sw' ? 'sw-TZ' : 'en-GB', {
                    day: 'numeric',
                    month: 'long',
                    timeZone: 'UTC',
                  }),
                })}
              </p>
              <Link href={`/j/${job.slug}`} className="btn btn-dark tap mt-3 px-5 py-2 text-xs">
                {t('applied', 'recView')}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Plain words plus an icon, so the status never relies on colour alone. */
function StatusPill({ status, withdrawn }: { status: ApplicationStatus; withdrawn: boolean }) {
  const t = useT()
  const tone = withdrawn
    ? 'bg-card-border text-neutral'
    : status === 'hired'
      ? 'bg-green-tint text-green'
      : status === 'not_selected'
        ? 'bg-card-border text-neutral'
        : status === 'new'
          ? 'bg-orange-light text-orange'
          : 'bg-blue-light text-blue'
  return (
    <p className={`mt-3 inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-sm font-bold ${tone}`}>
      <span aria-hidden="true">
        <StatusIcon status={status} withdrawn={withdrawn} />
      </span>
      {withdrawn ? t('applied', 'statusWithdrawn') : t('applied', STATUS_LABEL_KEYS[status])}
    </p>
  )
}

function StatusIcon({ status, withdrawn }: { status: ApplicationStatus; withdrawn: boolean }) {
  const common = { viewBox: '0 0 24 24', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (withdrawn) {
    return (
      <svg {...common}>
        <path d="M5 12h14" />
      </svg>
    )
  }
  if (status === 'hired' || status === 'shortlisted') {
    return (
      <svg {...common}>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    )
  }
  if (status === 'not_selected') {
    return (
      <svg {...common}>
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    )
  }
  if (status === 'interviewing') {
    return (
      <svg {...common}>
        <path d="M4 5h16v10H9l-5 4V5z" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8" />
      {status === 'reviewed' && <path d="M12 8v4l3 2" />}
    </svg>
  )
}
