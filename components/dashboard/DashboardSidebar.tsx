'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useT } from '@/components/LanguageContext'
import { AUTH_CHANGED_EVENT } from '@/lib/auth/events'
import { signOutAction } from '@/lib/auth/authActions'

type NavKey = 'findPeople' | 'jobs' | 'requests' | 'myApplications'

const LINKS: { key: NavKey; href: string; matches: (path: string) => boolean; icon: React.ReactNode }[] = [
  {
    key: 'findPeople',
    href: '/',
    matches: (p) => p === '/' || p.startsWith('/w/'),
    icon: <path d="m3 11 9-8 9 8M5 10v10h5v-6h4v6h5V10" />,
  },
  {
    key: 'jobs',
    href: '/jobs',
    matches: (p) => p === '/jobs' || p.startsWith('/j/') || p.startsWith('/careers/'),
    icon: <path d="M2 7h20v14H2zM16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />,
  },
  {
    key: 'requests',
    href: '/request',
    matches: (p) => p === '/request',
    icon: <path d="m3 11 18-5v12L3 14v-3ZM11.6 16.8a3 3 0 1 1-5.8-1.6" />,
  },
  {
    key: 'myApplications',
    href: '/applications',
    matches: (p) => p.startsWith('/applications'),
    icon: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15h6M9 11h6" />,
  },
]

/**
 * A narrow icon rail rather than a labelled list — every icon still has a
 * real `aria-label` plus a visible hover/focus tooltip (CSS only, no JS),
 * so dropping the text labels on screen never drops them for anyone
 * using a keyboard or a screen reader.
 */
export default function DashboardSidebar({ slug }: { slug: string | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useT()

  async function handleSignOut() {
    await signOutAction().catch(() => {})
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
    router.push('/')
    router.refresh()
  }

  return (
    <aside className="flex w-[68px] shrink-0 flex-col items-center gap-2 bg-[linear-gradient(180deg,var(--dash-navy),var(--dash-teal))] py-5">
      <RailLink href="/" label={t('nav', 'home')} active={false} tone="brand">
        <path d="M12 2 3 7v6c0 5 4 8 9 9 5-1 9-4 9-9V7l-9-5ZM9 12l2 2 4-4" />
      </RailLink>

      <nav aria-label="Main" className="mt-3 flex flex-col items-center gap-2">
        {LINKS.map((link) => (
          <RailLink key={link.key} href={link.href} label={t('nav', link.key)} active={link.matches(pathname)}>
            {link.icon}
          </RailLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-2">
        {slug && (
          <RailLink href={`/w/${slug}`} label={t('nav', 'myProfile')} active={pathname === `/w/${slug}`}>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
          </RailLink>
        )}
        <div className="group relative">
          <button
            type="button"
            onClick={handleSignOut}
            aria-label={t('nav', 'signOut')}
            className="tap flex h-10 w-10 items-center justify-center rounded-2xl text-white/85 hover:bg-white/15 hover:text-white"
          >
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
          <RailTooltip label={t('nav', 'signOut')} />
        </div>
      </div>
    </aside>
  )
}

function RailLink({
  href, label, active, tone = 'default', children,
}: {
  href: string
  label: string
  active: boolean
  tone?: 'default' | 'brand'
  children: React.ReactNode
}) {
  return (
    <div className="group relative">
      <Link
        href={href}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={`tap flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${
          active
            ? 'bg-white text-dash-navy'
            : tone === 'brand'
              ? 'bg-white/95 text-dash-navy'
              : 'text-white/85 hover:bg-white/15 hover:text-white'
        }`}
      >
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {children}
        </svg>
      </Link>
      <RailTooltip label={label} />
    </div>
  )
}

function RailTooltip({ label }: { label: string }) {
  return (
    <span
      role="presentation"
      className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-30 -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100"
    >
      {label}
    </span>
  )
}
