'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLanguage, useT } from '@/components/LanguageContext'
import { AUTH_CHANGED_EVENT } from '@/lib/auth/events'
import { signOutAction } from '@/lib/auth/authActions'
import { getHeaderSessionAction, type HeaderSession } from '@/lib/auth/headerSession'
import { getUnreadNotificationCountAction } from '@/lib/notificationActions'

// Same one-purpose exception as the sidebar — no site chrome on a
// confirmation link someone followed from a message.
const HIDDEN_ON = ['/c/']

/**
 * The wordmark, language toggle, notification bell and account cluster —
 * shared chrome above the content on every page, next to AppSidebar's
 * icon rail.
 */
export default function AppTopbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { lang, setLang } = useLanguage()
  const t = useT()
  const [session, setSession] = useState<HeaderSession | null>(null)
  const [unread, setUnread] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(() => {
    getHeaderSessionAction()
      .then(setSession)
      .catch(() => setSession({ signedIn: false }))
    getUnreadNotificationCountAction()
      .then(setUnread)
      .catch(() => setUnread(0))
  }, [])

  useEffect(() => {
    refresh()
  }, [pathname, refresh])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener(AUTH_CHANGED_EVENT, refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  if (HIDDEN_ON.some((prefix) => pathname.startsWith(prefix))) return null

  async function handleSignOut() {
    setMenuOpen(false)
    await signOutAction().catch(() => {})
    setSession({ signedIn: false })
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
    router.push('/')
    router.refresh()
  }

  return (
    <header className="flex items-center justify-between gap-3 px-5 py-5 sm:px-8 sm:py-6">
      <Link href="/" className="tap text-xl font-extrabold tracking-tight text-ink" aria-label={t('nav', 'home')}>
        VOUCH.
      </Link>

      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="glass-solid flex items-center gap-1 rounded-pill px-3.5 py-2 text-xs font-bold">
          <button type="button" onClick={() => setLang('en')} className={lang === 'en' ? 'text-ink' : 'text-faint'}>
            EN
          </button>
          <span className="text-faint">/</span>
          <button type="button" onClick={() => setLang('sw')} className={lang === 'sw' ? 'text-ink' : 'text-faint'}>
            SW
          </button>
        </div>

        <Link
          href="/applications"
          aria-label={t('dashboard', 'notifications')}
          className="glass-solid tap relative flex h-10 w-10 items-center justify-center rounded-full"
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          {unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange" aria-hidden="true" />}
        </Link>

        {session?.signedIn ? (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="glass-solid tap flex items-center gap-2.5 rounded-pill py-1.5 pr-4 pl-1.5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
                {session.name.charAt(0).toUpperCase()}
              </span>
              <span className="text-left">
                <span className="block text-sm font-bold leading-tight text-ink">{session.name}</span>
                <span className="block text-[11px] font-semibold leading-tight text-blue">{t('nav', 'myProfile')}</span>
              </span>
            </button>
            {menuOpen && (
              <div role="menu" className="glass absolute right-0 top-full z-40 mt-2 w-48 p-2">
                {session.slug && (
                  <Link
                    href={`/w/${session.slug}`}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
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
          </div>
        ) : session ? (
          <Link href="/applications" className="btn btn-dark tap px-4 py-2 text-xs">
            {t('nav', 'signIn')}
          </Link>
        ) : (
          <div className="h-10 w-10" />
        )}
      </div>
    </header>
  )
}
