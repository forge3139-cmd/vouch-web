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

const LINKS: { key: NavKey; href: string; matches: (path: string) => boolean }[] = [
  { key: 'findPeople', href: '/', matches: (p) => p === '/' || p.startsWith('/w/') },
  { key: 'jobs', href: '/jobs', matches: (p) => p === '/jobs' || p.startsWith('/j/') || p.startsWith('/careers/') },
  { key: 'requests', href: '/request', matches: (p) => p === '/request' },
  { key: 'myApplications', href: '/applications', matches: (p) => p === '/applications' },
]

export default function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useT()
  // null = not known yet: the account area stays empty rather than flashing
  // "Sign in" at someone who is already signed in.
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

  // Close any open menu when the page changes (state adjusted during render,
  // not in an effect, so there's no extra paint with the menu still open).
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
    router.refresh()
  }

  if (HIDDEN_ON.some((prefix) => pathname.startsWith(prefix))) return null

  const signedIn = session?.signedIn === true
  const links = LINKS.filter((l) => l.key !== 'myApplications' || signedIn)

  return (
    <header className="glass-bar sticky top-0 z-30 border-b">
      <div className="page-container flex items-center justify-between gap-4 py-2.5">
        <Link href="/" aria-label={t('nav', 'home')} className="tap flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[image:var(--gradient-hero)] text-sm font-extrabold text-white">
            V
          </span>
          <span className="text-lg font-extrabold text-ink">VOUCH</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
          {links.map((link) => (
            <NavLink key={link.key} href={link.href} active={link.matches(pathname)}>
              {t('nav', link.key)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <LangToggle />
          </div>

          <div className="hidden sm:block">
            {session?.signedIn ? (
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  aria-label={t('nav', 'account')}
                  className="tap flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-bold text-white"
                >
                  {session.name.charAt(0).toUpperCase()}
                </button>
                {profileOpen && (
                  <div role="menu" className="glass-solid absolute right-0 top-full z-40 mt-2 w-56 p-2">
                    <p className="truncate px-3 py-2 text-sm font-extrabold text-ink">{session.name}</p>
                    {session.slug && (
                      <Link
                        href={`/w/${session.slug}`}
                        role="menuitem"
                        className="tap block rounded-xl px-3 py-2 text-sm font-semibold text-ink hover:bg-white/60"
                      >
                        {t('nav', 'myProfile')}
                      </Link>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSignOut}
                      className="tap block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-white/60"
                    >
                      {t('nav', 'signOut')}
                    </button>
                  </div>
                )}
              </div>
            ) : session ? (
              <Link href="/applications" className="btn btn-dark tap px-4 py-2 text-xs">
                {t('nav', 'signIn')}
              </Link>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? t('nav', 'menuClose') : t('nav', 'menuOpen')}
            className="tap flex h-10 w-10 items-center justify-center rounded-full sm:hidden"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-card-border sm:hidden">
          <nav aria-label="Main" className="page-container flex flex-col py-2">
            {links.map((link) => (
              <NavLink key={link.key} href={link.href} active={link.matches(pathname)} block>
                {t('nav', link.key)}
              </NavLink>
            ))}
            {session?.signedIn && session.slug && (
              <NavLink href={`/w/${session.slug}`} active={false} block>
                {t('nav', 'myProfile')}
              </NavLink>
            )}
          </nav>
          <div className="page-container flex items-center justify-between pb-3 pt-1">
            <LangToggle />
            {session?.signedIn ? (
              <button type="button" onClick={handleSignOut} className="tap text-sm font-bold text-ink">
                {t('nav', 'signOut')}
              </button>
            ) : session ? (
              <Link href="/applications" className="btn btn-dark tap px-4 py-2 text-xs">
                {t('nav', 'signIn')}
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </header>
  )
}

/** The current page is marked by weight and an underline bar as well as
 * colour, so it never depends on colour alone. */
function NavLink({
  href,
  active,
  block = false,
  children,
}: {
  href: string
  active: boolean
  block?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`tap text-sm ${block ? 'block py-3' : 'px-3 py-2'} ${
        active
          ? 'font-extrabold text-ink underline decoration-orange decoration-2 underline-offset-[10px]'
          : 'font-semibold text-muted hover:text-ink'
      }`}
    >
      {children}
    </Link>
  )
}
