'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LanguageProvider, useLanguage, useT } from '@/components/LanguageContext'
import WorkRequestFlow from '@/components/WorkRequestFlow'
import PhotoLightbox from '@/components/PhotoLightbox'
import Badge from '@/components/ui/Badge'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { CATEGORY_LABELS } from '@/lib/categories'
import type { ConfirmedWorkItem, WorkerProfileBundle } from '@/lib/workerProfile'

function formatMonthYear(iso: string | null, lang: 'en' | 'sw'): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(lang === 'sw' ? 'sw-TZ' : 'en-US', { month: 'long', year: 'numeric' })
}

function formatRelative(iso: string, lang: 'en' | 'sw', t: ReturnType<typeof useT>): string {
  const diffMs = Math.max(0, Date.now() - new Date(iso).getTime())
  const day = 24 * 60 * 60 * 1000
  const days = Math.floor(diffMs / day)
  if (days < 1) return t('profile', 'today')
  if (days === 1) return t('profile', 'dayAgo')
  if (days < 30) return t('profile', 'daysAgo', { count: days })
  const months = Math.floor(days / 30)
  if (months === 1) return t('profile', 'monthAgo')
  if (months < 12) return t('profile', 'monthsAgo', { count: months })
  const years = Math.floor(months / 12)
  return years === 1 ? t('profile', 'yearAgo') : t('profile', 'yearsAgo', { count: years })
}

export default function WorkerProfile({ bundle, slug }: { bundle: WorkerProfileBundle; slug: string }) {
  return (
    <LanguageProvider>
      <ProfileInner bundle={bundle} slug={slug} />
    </LanguageProvider>
  )
}

function ProfileInner({ bundle, slug }: { bundle: WorkerProfileBundle; slug: string }) {
  const { lang, setLang } = useLanguage()
  const t = useT()
  const { worker, evidence, totalConfirmed, confirmedWork, activeMonthsCount, activeMonthsWindow, ratedFourPlusCount, photos } = bundle

  const [requesting, setRequesting] = useState(false)
  const [showSticky, setShowSticky] = useState(false)
  const [showAllWork, setShowAllWork] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [shareCopied, setShareCopied] = useState(false)

  useEffect(() => {
    function onScroll() {
      setShowSticky(window.scrollY > 240)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (requesting) {
    return <WorkRequestFlow bundle={{ worker, evidence }} slug={slug} />
  }

  async function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: worker.display_name, url })
        return
      } catch {
        // Share sheet dismissed — fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      // Clipboard unavailable — nothing more to do.
    }
  }

  const initial = worker.display_name.charAt(0).toUpperCase()
  const categoryText = worker.category ? CATEGORY_LABELS[worker.category][lang] : null
  const hasWork = totalConfirmed > 0
  const visibleWork = showAllWork ? confirmedWork : confirmedWork.slice(0, 3)

  return (
    <div className="flex min-h-dvh flex-col pb-28">
      <div className="page-container pt-5 sm:pt-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="link-hover tap flex items-center gap-1.5 text-sm font-extrabold text-ink active:opacity-70">
            <HomeIcon />
            VOUCH
          </Link>
          <div className="pill p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`tap rounded-pill px-3.5 py-1.5 ${lang === 'en' ? 'bg-ink text-white' : 'text-muted'}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('sw')}
              className={`tap rounded-pill px-3.5 py-1.5 ${lang === 'sw' ? 'bg-ink text-white' : 'text-muted'}`}
            >
              SW
            </button>
          </div>
        </div>
        <p className="mt-1 text-right text-xs text-muted">{t('profile', 'publicProfile')}</p>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-6">
          {/* Left column on desktop: identity, about, evidence, the record */}
          <div className="space-y-4">
            <section className="hero-card p-5 sm:p-7">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-white/50 bg-white/25 text-3xl font-bold text-white sm:h-24 sm:w-24">
                {worker.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a local/optimizable asset
                  <img src={worker.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </div>

              <h1 className="mt-4 text-2xl font-extrabold text-white sm:text-3xl">{worker.display_name}</h1>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {categoryText && <Badge variant="onHero">{categoryText}</Badge>}
                {worker.location && (
                  <span className="flex items-center gap-1 text-xs text-white/85">
                    <PinIcon />
                    {worker.location}
                  </span>
                )}
              </div>

              <div className="mt-3">
                {hasWork ? (
                  <>
                    <p className="text-base font-bold text-white">
                      {t('directory', 'evidenceCount', {
                        records: totalConfirmed,
                        confirmers: evidence?.distinct_confirmers ?? 0,
                      })}
                    </p>
                    {!!evidence?.repeat_clients && (
                      <p className="mt-1 text-sm font-bold text-white/90">
                        {t('directory', evidence.repeat_clients === 1 ? 'repeatClient' : 'repeatClients', {
                          count: evidence.repeat_clients,
                        })}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-base font-bold text-white">{t('profile', 'newOnVouchFull')}</p>
                )}
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setRequesting(true)}
                  className="btn btn-dark tap flex-1 py-3.5 text-sm active:opacity-80"
                >
                  {t('profile', 'requestWork')}
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="btn btn-glass tap gap-1.5 px-5 py-3.5 text-sm active:opacity-70"
                >
                  <ShareIcon />
                  {shareCopied ? t('profile', 'linkCopied') : t('profile', 'share')}
                </button>
              </div>
            </section>

            {!!worker.bio && (
              <div className="glass p-card">
                <p className="text-[11px] font-bold tracking-wide text-muted">{t('profile', 'aboutLabel')}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink">{worker.bio}</p>
              </div>
            )}

            <div className="glass p-card">
              <p className="text-[11px] font-bold tracking-wide text-muted">{t('profile', 'recordLabel')}</p>

              <div className="mt-3 grid grid-cols-3 gap-2.5">
                <StatTile
                  tone="orange"
                  icon={<CheckIcon />}
                  value={String(totalConfirmed)}
                  label={t('profile', 'jobsConfirmed')}
                />
                <StatTile
                  tone="blue"
                  icon={<PeopleIcon />}
                  value={String(evidence?.distinct_confirmers ?? 0)}
                  label={t('profile', 'differentClients')}
                />
                <StatTile
                  tone="green"
                  icon={<RepeatIcon />}
                  value={String(evidence?.repeat_clients ?? 0)}
                  label={t('profile', 'hiredAgainRow')}
                />
              </div>

              <RecordRow
                label={t('profile', 'active')}
                value={hasWork ? t('profile', 'activeMonths', { count: activeMonthsCount, window: activeMonthsWindow }) : '—'}
                first
              />
              <RecordRow
                label={t('profile', 'lastConfirmed')}
                value={hasWork && evidence?.last_confirmed_at ? formatRelative(evidence.last_confirmed_at, lang, t) : '—'}
              />
              <RecordRow
                label={t('profile', 'ratedFourPlus')}
                value={hasWork ? t('profile', 'ratedFraction', { count: ratedFourPlusCount, total: totalConfirmed }) : '—'}
              />
            </div>
          </div>

          {/* Right column on desktop: confirmed work and photos */}
          <div className="space-y-4">
            <div className="glass p-card">
              <p className="text-[11px] font-bold tracking-wide text-muted">{t('profile', 'confirmedWorkLabel')}</p>

              {!hasWork ? (
                <div className="mt-3 rounded-2xl bg-orange-light p-card">
                  <p className="text-sm font-bold text-ink">{t('profile', 'noWorkTitle')}</p>
                  <p className="mt-1 text-sm text-muted">{t('profile', 'noWorkBody')}</p>
                </div>
              ) : (
                <>
                  <div className="mt-3 space-y-3">
                    {visibleWork.map((item, i) => (
                      <ConfirmedWorkEntry key={item.record.id} item={item} index={i} lang={lang} />
                    ))}
                  </div>

                  {!showAllWork && confirmedWork.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllWork(true)}
                      className="link-hover tap mt-4 flex w-full items-center justify-between border-t border-card-border pt-4 text-sm font-bold text-blue"
                    >
                      {t('profile', 'seeAll', { count: confirmedWork.length })}
                      <span>›</span>
                    </button>
                  )}
                  {showAllWork && confirmedWork.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllWork(false)}
                      className="link-hover tap mt-4 w-full border-t border-card-border pt-4 text-sm font-bold text-blue"
                    >
                      {t('profile', 'showLess')}
                    </button>
                  )}
                </>
              )}
            </div>

            {photos.length > 0 && (
              <div className="glass p-card">
                <p className="mb-3 text-[11px] font-bold tracking-wide text-muted">{t('profile', 'photosLabel')}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
                  {photos.map((photo, i) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setLightboxIndex(i)}
                      className="lift aspect-square overflow-hidden rounded-2xl bg-card-border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL */}
                      <img src={photo.file_url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          images={photos.map((p) => p.file_url)}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}

      <div
        className={`glass-bar fixed inset-x-0 bottom-0 z-10 border-t py-3 transition-transform duration-200 ${
          showSticky ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="page-container">
          <div className="mx-auto w-full max-w-[560px]">
            <button
              type="button"
              onClick={() => setRequesting(true)}
              className="btn btn-dark tap w-full py-3.5 text-sm active:opacity-80"
            >
              {t('profile', 'requestWork')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const ACCENTS = ['orange', 'blue', 'green'] as const

function ConfirmedWorkEntry({
  item,
  index,
  lang,
}: {
  item: ConfirmedWorkItem
  index: number
  lang: 'en' | 'sw'
}) {
  const t = useT()
  const ref = useScrollReveal<HTMLDivElement>(index)
  const accent = ACCENTS[index % 3]

  return (
    <div ref={ref} className={`reveal-on-scroll accent-bar accent-${accent} rounded-2xl bg-white/70 py-3 pr-4 pl-4`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-ink">{item.record.title}</p>
        {item.hiredAgain && (
          <Badge variant="green" size="sm" className="shrink-0">
            {t('profile', 'hiredAgainPill')}
          </Badge>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">
        {item.confirmerName
          ? t('profile', 'confirmedByLine', {
              name: item.confirmerName,
              date: formatMonthYear(item.record.confirmed_at, lang) ?? '',
            })
          : t('profile', 'confirmedByUnknown', {
              date: formatMonthYear(item.record.confirmed_at, lang) ?? '',
            })}
      </p>
      {item.stars !== null && (
        <div className="mt-1.5 flex gap-0.5" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={n <= item.stars! ? 'text-orange' : 'text-card-border'}>
              ★
            </span>
          ))}
        </div>
      )}
      {!!item.comment && <p className="mt-1.5 text-sm text-ink">&ldquo;{item.comment}&rdquo;</p>}
    </div>
  )
}

function StatTile({
  tone,
  icon,
  value,
  label,
}: {
  tone: 'orange' | 'blue' | 'green'
  icon: React.ReactNode
  value: string
  label: string
}) {
  return (
    <div className="stat-tile">
      <span className={`icon-circle icon-circle-${tone}`}>{icon}</span>
      <p className="text-xl leading-none font-extrabold text-ink">{value}</p>
      <p className="text-[11px] leading-tight font-semibold text-muted">{label}</p>
    </div>
  )
}

function RecordRow({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-3 ${first ? 'mt-3 border-t border-card-border' : 'border-t border-card-border'}`}>
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-bold text-ink">{value}</span>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M16.5 14.2c2.6.2 4.5 2.3 4.5 5.3" />
    </svg>
  )
}

function RepeatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 2l3 3-3 3" />
      <path d="M4 11V9a4 4 0 0 1 4-4h12" />
      <path d="M7 22l-3-3 3-3" />
      <path d="M20 13v2a4 4 0 0 1-4 4H4" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
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

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6" />
    </svg>
  )
}
