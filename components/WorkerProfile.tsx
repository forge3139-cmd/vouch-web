'use client'

import { useEffect, useState } from 'react'
import { LanguageProvider, useLanguage, useT } from '@/components/LanguageContext'
import WorkRequestFlow from '@/components/WorkRequestFlow'
import PhotoLightbox from '@/components/PhotoLightbox'
import { CATEGORY_LABELS } from '@/lib/categories'
import type { WorkerProfileBundle } from '@/lib/workerProfile'

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
    <div className="flex min-h-dvh flex-col bg-cream pb-28">
      <div className="mx-auto w-full max-w-2xl px-5 pt-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold text-ink">VOUCH</span>
          <div className="flex gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => setLang('en')}
              className={lang === 'en' ? 'text-orange' : 'text-faint'}
            >
              EN
            </button>
            <span className="text-faint">/</span>
            <button
              type="button"
              onClick={() => setLang('sw')}
              className={lang === 'sw' ? 'text-orange' : 'text-faint'}
            >
              SW
            </button>
          </div>
        </div>
        <p className="mt-0.5 text-right text-xs text-muted">{t('profile', 'publicProfile')}</p>

        <div className="mt-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-card-border text-2xl font-bold text-ink">
          {worker.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a local/optimizable asset
            <img src={worker.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </div>

        <h1 className="mt-4 text-2xl font-extrabold text-ink">{worker.display_name}</h1>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {categoryText && (
            <span className="rounded-full bg-orange/10 px-3 py-1 text-xs font-bold text-orange">{categoryText}</span>
          )}
          {worker.location && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <PinIcon />
              {worker.location}
            </span>
          )}
        </div>

        <div className="mt-3">
          {hasWork ? (
            <>
              <p className="text-base font-bold text-ink">
                {t('directory', 'evidenceCount', {
                  records: totalConfirmed,
                  confirmers: evidence?.distinct_confirmers ?? 0,
                })}
              </p>
              {!!evidence?.repeat_clients && (
                <p className="mt-1 text-sm font-bold text-green">
                  {t('directory', evidence.repeat_clients === 1 ? 'repeatClient' : 'repeatClients', {
                    count: evidence.repeat_clients,
                  })}
                </p>
              )}
            </>
          ) : (
            <p className="text-base font-bold text-ink">{t('profile', 'newOnVouchFull')}</p>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => setRequesting(true)}
            className="flex-1 rounded-2xl bg-orange py-3.5 text-sm font-bold text-white active:opacity-80"
          >
            {t('profile', 'requestWork')}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-2xl bg-orange/10 px-4 py-3.5 text-sm font-bold text-orange active:opacity-70"
          >
            <ShareIcon />
            {shareCopied ? t('profile', 'linkCopied') : t('profile', 'share')}
          </button>
        </div>

        {!!worker.bio && (
          <div className="mt-6 rounded-2xl border border-card-border bg-white p-4">
            <p className="text-[11px] font-bold tracking-wide text-muted">{t('profile', 'aboutLabel')}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink">{worker.bio}</p>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-card-border bg-white p-4">
          <p className="text-[11px] font-bold tracking-wide text-muted">{t('profile', 'recordLabel')}</p>
          <RecordRow label={t('profile', 'jobsConfirmed')} value={String(totalConfirmed)} first />
          <RecordRow label={t('profile', 'differentClients')} value={String(evidence?.distinct_confirmers ?? 0)} />
          <RecordRow label={t('profile', 'hiredAgainRow')} value={String(evidence?.repeat_clients ?? 0)} />
          <RecordRow
            label={t('profile', 'active')}
            value={hasWork ? t('profile', 'activeMonths', { count: activeMonthsCount, window: activeMonthsWindow }) : '—'}
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

        <div className="mt-4 rounded-2xl border border-card-border bg-white p-4">
          <p className="text-[11px] font-bold tracking-wide text-muted">{t('profile', 'confirmedWorkLabel')}</p>

          {!hasWork ? (
            <div className="mt-3 rounded-xl bg-orange/5 p-4">
              <p className="text-sm font-bold text-ink">{t('profile', 'noWorkTitle')}</p>
              <p className="mt-1 text-sm text-muted">{t('profile', 'noWorkBody')}</p>
            </div>
          ) : (
            <>
              {visibleWork.map((item, i) => (
                <div key={item.record.id} className={i > 0 ? 'mt-4 border-t border-card-border pt-4' : 'mt-3'}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-ink">{item.record.title}</p>
                    {item.hiredAgain && (
                      <span className="shrink-0 rounded-full bg-green-tint px-2.5 py-1 text-[11px] font-bold text-green">
                        {t('profile', 'hiredAgainPill')}
                      </span>
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
              ))}

              {!showAllWork && confirmedWork.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllWork(true)}
                  className="mt-4 flex w-full items-center justify-between border-t border-card-border pt-4 text-sm font-bold text-orange"
                >
                  {t('profile', 'seeAll', { count: confirmedWork.length })}
                  <span>›</span>
                </button>
              )}
              {showAllWork && confirmedWork.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllWork(false)}
                  className="mt-4 w-full border-t border-card-border pt-4 text-sm font-bold text-orange"
                >
                  {t('profile', 'showLess')}
                </button>
              )}
            </>
          )}
        </div>

        {photos.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-bold tracking-wide text-muted">{t('profile', 'photosLabel')}</p>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, i) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="aspect-square overflow-hidden rounded-xl bg-card-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL */}
                  <img src={photo.file_url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
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
        className={`fixed inset-x-0 bottom-0 z-10 border-t border-card-border bg-white px-5 py-3 transition-transform duration-200 ${
          showSticky ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto w-full max-w-2xl">
          <button
            type="button"
            onClick={() => setRequesting(true)}
            className="w-full rounded-2xl bg-orange py-3.5 text-sm font-bold text-white active:opacity-80"
          >
            {t('profile', 'requestWork')}
          </button>
        </div>
      </div>
    </div>
  )
}

function RecordRow({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-3 ${first ? 'mt-2' : 'border-t border-card-border'}`}>
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-bold text-ink">{value}</span>
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
