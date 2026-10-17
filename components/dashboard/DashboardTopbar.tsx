import { useT } from '@/components/LanguageContext'

/** Server-renderable (no client state) — the search box is a plain GET
 * form to "/", so it works even before hydration, and the bell is a plain
 * anchor to the notifications section already on this page. */
export default function DashboardTopbar({
  name,
  unreadCount,
}: {
  name: string
  unreadCount: number
}) {
  const t = useT()

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{t('dashboard', 'dashboard')}</p>
        <h1 className="mt-0.5 text-2xl font-extrabold text-ink">{t('dashboard', 'welcomeBack', { name })}</h1>
        <p className="mt-1 text-sm text-muted">{t('dashboard', 'subtitle')}</p>
      </div>

      <div className="flex items-center gap-3">
        <form action="/" method="GET" className="relative hidden sm:block">
          <label htmlFor="dash-search" className="sr-only">
            {t('dashboard', 'searchLabel')}
          </label>
          <svg
            viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            id="dash-search"
            type="search"
            name="q"
            placeholder={t('dashboard', 'searchPlaceholder')}
            className="glass w-56 rounded-full py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-muted focus:border-orange focus:outline-none"
          />
        </form>

        <a
          href="#notif-heading"
          aria-label={t('dashboard', 'notifications')}
          className="glass tap relative flex h-10 w-10 items-center justify-center rounded-full"
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-orange" aria-hidden="true" />
          )}
        </a>
      </div>
    </div>
  )
}
