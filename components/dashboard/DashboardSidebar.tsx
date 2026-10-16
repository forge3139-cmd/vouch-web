'use client'

import { useState } from 'react'
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
    icon: (
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    ),
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

export default function DashboardSidebar({ slug }: { slug: string | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useT()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await signOutAction().catch(() => {})
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-card-border bg-cream/95 px-4 py-3 lg:hidden">
        <Link href="/" className="tap flex items-center gap-2" aria-label={t('nav', 'home')}>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[image:var(--gradient-hero)] text-sm font-extrabold text-white">V</span>
          <span className="text-base font-extrabold text-ink">VOUCH</span>
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="dashboard-nav"
          aria-label={menuOpen ? t('nav', 'menuClose') : t('nav', 'menuOpen')}
          className="tap flex h-9 w-9 items-center justify-center rounded-full"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      <aside
        id="dashboard-nav"
        className={`${menuOpen ? 'flex' : 'hidden'} w-full flex-col gap-7 bg-dash-ink px-4 py-7 text-white lg:flex lg:w-[260px] lg:shrink-0`}
      >
        <Link href="/" className="tap hidden items-center gap-2.5 px-2 lg:flex" aria-label={t('nav', 'home')}>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[image:var(--gradient-hero)] text-sm font-extrabold text-white">V</span>
          <span className="text-lg font-extrabold tracking-tight">VOUCH</span>
        </Link>

        <nav aria-label="Main" className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-white/40">{t('dashboard', 'dashboard')}</p>
          {LINKS.map((link) => {
            const active = link.matches(pathname)
            return (
              <Link
                key={link.key}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`tap flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                  active ? 'border-l-[3px] border-dash-teal bg-white/10 font-bold text-white' : 'font-semibold text-white/75 hover:text-white'
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

        <div className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-white/40">{t('nav', 'account')}</p>
          {slug && (
            <Link href={`/w/${slug}`} className="tap flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/75 hover:text-white">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
              </svg>
              {t('nav', 'myProfile')}
            </Link>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="tap flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/75 hover:text-white"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            {t('nav', 'signOut')}
          </button>
        </div>

        {slug && <ShareProfileCard slug={slug} />}
      </aside>
    </>
  )
}

function ShareProfileCard({ slug }: { slug: string }) {
  const t = useT()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const url = `${window.location.origin}/w/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard permission denied or unavailable — the link is still
      // right there on the profile page itself, nothing else to do here.
    }
  }

  return (
    <div className="mt-auto rounded-2xl bg-gradient-to-br from-dash-teal to-dash-olive p-4 text-[#10231e]">
      <p className="text-[13px] font-extrabold">{t('dashboard', 'shareProfile')}</p>
      <p className="mt-1 text-xs leading-relaxed text-[#10231e]/75">{t('dashboard', 'shareProfileBody')}</p>
      <button
        type="button"
        onClick={handleCopy}
        className="tap mt-3 w-full rounded-full bg-[#10231e] py-2 text-xs font-bold text-white"
      >
        {copied ? t('dashboard', 'linkCopied') : t('dashboard', 'copyLink')}
      </button>
    </div>
  )
}
