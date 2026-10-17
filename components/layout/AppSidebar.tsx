'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useT } from '@/components/LanguageContext'

// The confirmation link is a one-purpose page for someone who arrived from a
// message; site navigation there would only distract.
const HIDDEN_ON = ['/c/']

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
    icon: <path d="M3 3h14l4 4v14H3zM17 3v6h4M8 13h8M8 17h5" />,
  },
  {
    key: 'myApplications',
    href: '/applications',
    matches: (p) => p.startsWith('/applications'),
    icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  },
]

/**
 * The site's one navigation surface — an icon-only rail (a vertical bar on
 * desktop, a fixed bottom bar on phone). Account info and sign-in live in
 * AppTopbar now; this is just the four destinations plus a profile
 * shortcut, so it never needs to know whether anyone's signed in.
 */
export default function AppSidebar() {
  const pathname = usePathname()
  const t = useT()

  if (HIDDEN_ON.some((prefix) => pathname.startsWith(prefix))) return null

  return (
    <aside className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around bg-ink px-2 py-2 lg:static lg:inset-auto lg:z-auto lg:h-auto lg:w-[84px] lg:shrink-0 lg:flex-col lg:justify-start lg:gap-7 lg:px-3 lg:py-7">
      <Link
        href="/"
        aria-label={t('nav', 'home')}
        className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-white/15 text-base font-extrabold text-white lg:flex"
      >
        V
      </Link>

      <nav aria-label="Main" className="flex items-center justify-around gap-1 lg:flex-col lg:items-stretch lg:gap-2">
        {LINKS.map((link) => {
          const active = link.matches(pathname)
          return (
            <Link
              key={link.key}
              href={link.href}
              aria-label={t('nav', link.key)}
              aria-current={active ? 'page' : undefined}
              className={`tap flex h-11 w-11 items-center justify-center rounded-2xl ${
                active ? 'bg-orange text-ink' : 'text-white/55 hover:bg-white/10 hover:text-white'
              }`}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {link.icon}
              </svg>
            </Link>
          )
        })}
      </nav>

      <Link
        href="/applications"
        aria-label={t('nav', 'account')}
        className="hidden h-11 w-11 items-center justify-center rounded-2xl text-white/55 hover:bg-white/10 hover:text-white lg:mt-auto lg:flex"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" />
        </svg>
      </Link>
    </aside>
  )
}
