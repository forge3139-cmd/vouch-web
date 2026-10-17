'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useT } from '@/components/LanguageContext'
import LangToggle from '@/components/ui/LangToggle'
import { AUTH_CHANGED_EVENT } from '@/lib/auth/events'
import { signOutAction } from '@/lib/auth/authActions'
import { getHeaderSessionAction, type HeaderSession } from '@/lib/auth/headerSession'

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
 * The site's one navigation surface — a labelled sidebar on desktop, a
 * slim top bar with an expandable menu on phones. Replaces the old top
 * SiteHeader and the dashboard's own icon-only rail: one component, same
 * session-aware links, everywhere.
 */
export default function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useT()
  const [session, setSession] = useState<HeaderSession | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const refreshSession = useCallback(() => {
    getHeaderSessionAction()
      .then(setSession)
      .catch(() => setSession({ signedIn: false }))
  }, [])

  useEffect(() => {
    refreshSession()
  }, [pathname, refreshSession])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshSession()
    }
    window.addEventListener(AUTH_CHANGED_EVENT, refreshSession)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, refreshSession)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refreshSession])

  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setMenuOpen(false)
    setProfileOpen(false)
  }

  useEffect(() => {
    if (!profileOpen) return
    const onDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [profileOpen])

  async function handleSignOut() {
    setMenuOpen(false)
    setProfileOpen(false)
    await signOutAction().catch(() => {})
    setSession({ signedIn: false })
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
    router.push('/')
    router.refresh()
  }

  if (HIDDEN_ON.some((prefix) => pathname.startsWith(prefix))) return null

  const signedIn = session?.signedIn === true

  return (
    <>
      {/* Phone: a slim top bar instead of a side column. */}
      <div className="flex items-center justify-between gap-3 border-b border-card-border bg-cream px-4 py-3 lg:hidden">
        <Link href="/" className="tap flex items-center gap-2" aria-label={t('nav', 'home')}>
          <Logo />
          <span className="text-base font-extrabold text-ink">VOUCH</span>
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="app-nav"
          aria-label={menuOpen ? t('nav', 'menuClose') : t('nav', 'menuOpen')}
          className="tap flex h-10 w-10 items-center justify-center rounded-full"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      <aside
        id="app-nav"
        className={`${menuOpen ? 'flex' : 'hidden'} w-full flex-col gap-7 border-b border-card-border bg-sand px-4 py-6 lg:flex lg:w-[232px] lg:shrink-0 lg:border-b-0 lg:border-r lg:py-7`}
      >
        <Link href="/" className="tap hidden items-center gap-2.5 px-2 lg:flex" aria-label={t('nav', 'home')}>
          <Logo />
          <span className="text-lg font-extrabold tracking-tight text-ink">VOUCH</span>
        </Link>

        <nav aria-label="Main" className="flex flex-col gap-1">
          {LINKS.filter((l) => l.key !== 'myApplications' || signedIn).map((link) => {
            const active = link.matches(pathname)
            return (
              <Link
                key={link.key}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`tap flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm ${
                  active ? 'bg-orange font-bold text-[#011c40]' : 'font-semibold text-ink/70 hover:bg-ink/5 hover:text-ink'
                }`}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {link.icon}
                </svg>
                {t('nav', link.key)}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          <div ref={profileRef} className="relative">
            {session?.signedIn ? (
              <>
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  className="tap flex w-full items-center gap-2.5 rounded-2xl px-2 py-2 hover:bg-ink/5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange text-sm font-bold text-[#011c40]">
                    {session.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-left text-sm font-bold text-ink">{session.name}</span>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-ink/50">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                {profileOpen && (
                  <div role="menu" className="glass absolute bottom-full left-0 z-40 mb-2 w-full p-2">
                    {session.slug && (
                      <Link
                        href={`/w/${session.slug}`}
                        role="menuitem"
                        className="tap block rounded-xl px-3 py-2 text-sm font-semibold text-ink hover:bg-ink/5"
                      >
                        {t('nav', 'myProfile')}
                      </Link>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSignOut}
                      className="tap block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-ink/5"
                    >
                      {t('nav', 'signOut')}
                    </button>
                  </div>
                )}
              </>
            ) : session ? (
              <Link href="/applications" className="btn btn-dark tap w-full py-2.5 text-xs">
                {t('nav', 'signIn')}
              </Link>
            ) : (
              <div className="h-9" />
            )}
          </div>
          <LangToggle />
        </div>
      </aside>
    </>
  )
}

function Logo() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[image:var(--gradient-hero)] text-sm font-extrabold text-white">
      V
    </span>
  )
}
