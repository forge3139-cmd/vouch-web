'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useT } from '@/components/LanguageContext'
import AuthPanel from '@/components/job/AuthPanel'
import type { AuthErrorCode } from '@/lib/auth/authActions'
import { withdrawApplicationAction } from '@/lib/passportActions'
import { formatRelative } from '@/lib/formatRelative'
import ApplicationTimeline, { STAGE_KEYS } from '@/components/ApplicationTimeline'
import StatTiles from '@/components/dashboard/StatTiles'
import type { MyApplication } from '@/lib/myApplications'
import type { RecommendedJob } from '@/lib/recommendedJobs'
import type { PendingAssessment } from '@/lib/assessments'
import type { PassportPreview } from '@/lib/passport'

export interface ApplicationsViewProps {
  signedIn: boolean
  items: MyApplication[]
  loadFailed: boolean
  /** Null = the lookup failed; [] = genuinely none. */
  recommended: RecommendedJob[] | null
  /** Invited, not yet submitted — drops off this list on its own once sent. */
  pendingAssessments: PendingAssessment[]
  /** Set right after a failed Google round trip. */
  initialAuthError?: AuthErrorCode | null
  /** Signed-in only — the dashboard shell. */
  evidence?: PassportPreview['evidence'] | null
}

export default function ApplicationsView(props: ApplicationsViewProps) {
  return <ApplicationsInner {...props} />
}

function ApplicationsInner({
  signedIn, items, loadFailed, recommended, pendingAssessments,
  initialAuthError = null, evidence = null,
}: ApplicationsViewProps) {
  const t = useT()
  const router = useRouter()

  const fmt = (iso: string) => formatRelative(iso, t)

  if (!signedIn) {
    return (
      <div className="form-shell">
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
      </div>
    )
  }

  const assessment = pendingAssessments[0] ?? null
  const job = recommended?.[0] ?? null

  return (
    <div className="page-container flex-1 py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-muted">{t('dashboard', 'eyebrow')}</p>
          <h1 className="mt-1 text-3xl font-extrabold text-ink sm:text-4xl">{t('nav', 'myApplications')}</h1>
        </div>
        <Link href="/jobs" className="btn btn-dark tap px-5 py-2.5 text-sm">
          {t('dashboard', 'actionFindJobs')} <span aria-hidden="true">→</span>
        </Link>
      </div>

      {loadFailed ? (
        <p role="alert" className="mt-6 text-sm font-semibold text-red-400">
          {t('applied', 'loadError')}
        </p>
      ) : (
        <>
          <div className="mt-6">
            <StatTiles
              recordsConfirmed={evidence?.recordsConfirmed ?? 0}
              distinctConfirmers={evidence?.distinctConfirmers ?? 0}
              repeatClients={evidence?.repeatClients ?? 0}
              applicationsSent={items.filter((i) => !i.withdrawn).length}
            />
          </div>

          <h2 className="mt-8 text-lg font-extrabold text-ink">{t('dashboard', 'activityTitle')}</h2>

          {items.length === 0 ? (
            <div className="glass mt-4 p-card text-center">
              <p className="text-base font-bold text-ink">{t('applied', 'emptyTitle')}</p>
              <p className="mt-1 text-sm text-muted">{t('applied', 'emptyBody')}</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {items.map((item) => (
                <ApplicationCard
                  key={item.id}
                  item={item}
                  fmt={fmt}
                  pendingAssessment={pendingAssessments.some((p) => p.applicationId === item.id)}
                />
              ))}
            </ul>
          )}

          {(assessment || job) && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {assessment && (
                <div className="rounded-[var(--radius-card)] bg-ink p-5">
                  <div className="flex items-center gap-2">
                    <BellIcon />
                    <span className="rounded-pill bg-orange px-2.5 py-0.5 text-[10.5px] font-bold text-ink">
                      {t('dashboard', 'newBadge')}
                    </span>
                  </div>
                  <p className="mt-3 text-base font-extrabold text-white">{t('dashboard', 'assessmentPending')}</p>
                  <p className="mt-1 text-sm text-white/60">
                    {t('dashboard', 'assessmentInviteBody', { company: assessment.companyName })}
                  </p>
                  <Link
                    href={`/applications/assessment/${assessment.applicationId}`}
                    className="tap mt-4 inline-flex items-center gap-1.5 rounded-pill bg-dash-peach px-4 py-2 text-xs font-bold text-[#5b3418]"
                  >
                    {t('dashboard', 'viewInvitation')} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              )}
              {job && (
                <div className="rounded-[var(--radius-card)] bg-dash-navy-mid p-5">
                  <p className="text-[11px] font-bold tracking-wide text-dash-navy">{t('dashboard', 'mightSuit')}</p>
                  <p className="mt-2 text-base font-extrabold text-ink">{job.title}</p>
                  <p className="mt-0.5 text-sm text-ink/60">{job.companyName} · {job.location}</p>
                  <Link href={`/j/${job.slug}`} className="link-hover tap mt-3 inline-flex items-center gap-1 text-sm font-extrabold text-ink">
                    {t('dashboard', 'seeJob')} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ApplicationCard({
  item,
  fmt,
  pendingAssessment = false,
}: {
  item: MyApplication
  fmt: (iso: string) => string
  pendingAssessment?: boolean
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

  const badgeKey = item.status === 'not_selected' ? 'timelineNotSelected' : STAGE_KEYS[item.status]

  return (
    <li className={`glass-solid p-5 ${item.withdrawn ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold text-ink">{item.jobTitle}</p>
          <p className="mt-0.5 truncate text-sm text-muted">{item.companyName} · {fmt(item.appliedAt)}</p>
        </div>
        <span className="shrink-0 rounded-pill bg-dash-peach px-3 py-1 text-[11px] font-bold text-[#5b3418]">
          {item.withdrawn ? t('applied', 'statusWithdrawn') : t('applied', badgeKey)}
        </span>
      </div>

      {!item.withdrawn && <ApplicationTimeline status={item.status} stageReached={item.stageReached} reason={item.notSelectedReason} horizontal />}

      {pendingAssessment && (
        <Link
          href={`/applications/assessment/${item.id}`}
          className="tap mt-3 flex items-center gap-2 rounded-2xl bg-blue-light px-3 py-2.5 text-xs font-bold text-blue"
        >
          {t('dashboard', 'assessmentInviteShort')}
          <span aria-hidden="true">›</span>
        </Link>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
        <Link href={`/j/${item.jobSlug}`} className="link-hover tap inline-block text-xs font-bold text-blue">
          {t('applied', 'viewJob')} ›
        </Link>
        {!item.withdrawn && !confirming && (
          <button type="button" onClick={() => setConfirming(true)} className="link-hover tap text-xs font-bold text-neutral">
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
            <p role="alert" className="mt-2 text-xs font-semibold text-red-400">
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

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/70">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
