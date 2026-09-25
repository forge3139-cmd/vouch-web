'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LanguageProvider, useLanguage, useT } from '@/components/LanguageContext'
import LangToggle from '@/components/ui/LangToggle'
import AuthPanel from '@/components/job/AuthPanel'
import { signOutAction, type AuthErrorCode } from '@/lib/auth/authActions'
import { withdrawApplicationAction } from '@/lib/passportActions'
import { markJobsSeenAction } from '@/lib/jobAlertsActions'
import { markNotificationReadAction } from '@/lib/notificationActions'
import { EMPLOYMENT_LABEL_KEYS } from '@/lib/hiring'
import ApplicationTimeline from '@/components/ApplicationTimeline'
import type { MyApplication } from '@/lib/myApplications'
import type { RecommendedJob } from '@/lib/recommendedJobs'
import type { AppNotification } from '@/lib/notifications'

export interface ApplicationsViewProps {
  signedIn: boolean
  items: MyApplication[]
  loadFailed: boolean
  /** Null = the lookup failed; [] = genuinely none. */
  recommended: RecommendedJob[] | null
  hasExpertise: boolean
  /** Worked out from the OLD jobs_last_seen_at, before this visit marks it seen. */
  newJobsCount: number
  notifications: AppNotification[]
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
  signedIn, items, loadFailed, recommended, hasExpertise, newJobsCount, notifications, initialAuthError = null,
}: ApplicationsViewProps) {
  const { lang } = useLanguage()
  const t = useT()
  const router = useRouter()
  const [notifs, setNotifs] = useState(notifications)
  const [highlightId, setHighlightId] = useState<string | null>(null)

  // This visit already read the count above from the OLD last-seen time;
  // bumping it now (fire-and-forget) is what makes the NEXT visit's count
  // smaller rather than showing the same jobs as "new" forever.
  useEffect(() => {
    if (signedIn) markJobsSeenAction().catch(() => {})
  }, [signedIn])

  function openNotification(n: AppNotification) {
    if (!n.read_at) {
      setNotifs((current) => current.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)))
      markNotificationReadAction(n.id).catch(() => {})
    }
    const applicationId = n.data.application_id
    if (!applicationId) return
    setHighlightId(applicationId)
    // The element already exists in the DOM (it's below on this same page) —
    // no navigation needed, just bring it into view and mark it.
    requestAnimationFrame(() => {
      document.getElementById(`app-${applicationId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    setTimeout(() => setHighlightId((current) => (current === applicationId ? null : current)), 2500)
  }

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
              <NotificationsBanner notifications={notifs.filter((n) => !n.read_at)} onOpen={openNotification} />

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
                    <ApplicationCard
                      key={item.id}
                      item={item}
                      accent={ACCENTS[i % 3]}
                      fmt={fmt}
                      highlighted={highlightId === item.id}
                    />
                  ))}
                </ul>
              )}

              <Recommendations recommended={recommended} hasExpertise={hasExpertise} newJobsCount={newJobsCount} />
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
  highlighted = false,
}: {
  item: MyApplication
  accent: 'orange' | 'blue' | 'green'
  fmt: (iso: string) => string
  highlighted?: boolean
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
    <li
      id={`app-${item.id}`}
      className={`glass-solid accent-bar accent-${accent} p-card transition-shadow ${item.withdrawn ? 'opacity-70' : ''} ${
        highlighted ? 'ring-2 ring-orange' : ''
      }`}
    >
      <p className="text-base font-extrabold text-ink">{item.jobTitle}</p>
      <p className="text-sm text-muted">{item.companyName}</p>
      <p className="mt-2 text-xs font-semibold text-neutral">{t('applied', 'appliedOn', { date: fmt(item.appliedAt) })}</p>

      {item.withdrawn ? (
        <p className="mt-3 inline-flex items-center gap-2 rounded-pill bg-card-border px-3 py-1.5 text-sm font-bold text-neutral">
          <span aria-hidden="true">–</span>
          {t('applied', 'statusWithdrawn')}
        </p>
      ) : (
        <ApplicationTimeline status={item.status} stageReached={item.stageReached} reason={item.notSelectedReason} />
      )}

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

/** Open jobs that share wording with the expertise on the person's profile — might be relevant, never a judgement. */
function notificationTimeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

/** Unread notifications sit at the top of this page — that's the whole
 * "how does an applicant learn their status" loop on the web. Tapping one
 * marks it read and scrolls to the application it's about, already lower
 * on this same page. Renders nothing once there's nothing unread. */
function NotificationsBanner({ notifications, onOpen }: { notifications: AppNotification[]; onOpen: (n: AppNotification) => void }) {
  const t = useT()
  if (notifications.length === 0) return null

  return (
    <section className="mt-6" aria-labelledby="notif-heading">
      <h2 id="notif-heading" className="text-sm font-extrabold text-ink">
        {t('applied', 'notifTitle')}
      </h2>
      <ul className="mt-3 space-y-2">
        {notifications.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => onOpen(n)}
              className="glass tap flex w-full items-start gap-3 p-card text-left"
            >
              <span className="icon-circle icon-circle-orange h-9 w-9 shrink-0">
                <BellIcon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-ink">{n.title}</span>
                <span className="mt-0.5 block text-sm text-neutral">{n.body}</span>
              </span>
              <span className="shrink-0 text-xs text-muted">{notificationTimeAgo(n.created_at)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function Recommendations({
  recommended, hasExpertise, newJobsCount,
}: {
  recommended: RecommendedJob[] | null
  hasExpertise: boolean
  newJobsCount: number
}) {
  const { lang } = useLanguage()
  const t = useT()

  return (
    <section className="mt-8" aria-labelledby="rec-heading">
      <div className="flex items-center gap-2.5">
        <h2 id="rec-heading" className="text-lg font-extrabold text-ink">
          {t('applied', 'recTitle')}
        </h2>
        {newJobsCount > 0 && (
          <span className="rounded-pill bg-orange px-2.5 py-1 text-xs font-bold text-white">
            {t('applied', 'recNew', { count: newJobsCount })}
          </span>
        )}
      </div>

      {!hasExpertise ? (
        <p className="glass mt-3 p-card text-sm text-muted">{t('applied', 'recNoExpertise')}</p>
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
