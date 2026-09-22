'use client'

import { useState } from 'react'
import { useT } from '@/components/LanguageContext'
import Button from '@/components/ui/Button'
import { signInAction, signInWithGoogleAction, signUpAction, type AuthErrorCode } from '@/lib/auth/authActions'
import type { ApplicantView } from '@/lib/auth/session'
import { getVisitorId } from '@/lib/funnelClient'

type Mode = 'signin' | 'create'

const ERROR_KEYS: Record<AuthErrorCode, 'errRequired' | 'errBadContact' | 'errWeakPassword' | 'errInvalid' | 'errExists' | 'errConfirmEmail' | 'errSetup' | 'errTooMany' | 'errUnconfigured' | 'errGoogleFailed' | 'errGeneric'> = {
  required: 'errRequired',
  badContact: 'errBadContact',
  weakPassword: 'errWeakPassword',
  invalid: 'errInvalid',
  exists: 'errExists',
  confirmEmail: 'errConfirmEmail',
  setupFailed: 'errSetup',
  tooMany: 'errTooMany',
  unconfigured: 'errUnconfigured',
  googleFailed: 'errGoogleFailed',
  generic: 'errGeneric',
}

/**
 * The one inline screen: Continue with Google, or sign in / create an
 * account with just a name, a phone or email, and a password. It's content
 * only — the caller wraps it (and owns everything the applicant has typed,
 * which is why nothing here can lose it). Sessions are set by the server
 * actions as HttpOnly cookies; nothing about the session is ever stored in
 * the browser.
 *
 * Google is a full-page round trip to Google's own consent screen, so
 * `next` is where the browser comes back to afterwards (the callback route
 * redirects there once the session cookie is set) — unlike email/password,
 * this can't just call `onSignedIn` in place.
 */
export default function AuthPanel({
  jobSlug,
  next,
  onSignedIn,
  showTitle = true,
  initialError = null,
}: {
  /** When set, sign-in/up steps are logged against this job's funnel. */
  jobSlug?: string
  /** Where Google sign-in returns the browser to once it's done. */
  next: string
  onSignedIn: (applicant: ApplicantView) => void
  showTitle?: boolean
  /** Set when arriving back from a failed Google round trip. */
  initialError?: AuthErrorCode | null
}) {
  const t = useT()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AuthErrorCode | null>(initialError)

  const canSubmit = contact.trim() && password && (mode === 'signin' || name.trim()) && !pending

  async function handleGoogle() {
    setPending(true)
    setError(null)

    const formData = new FormData()
    formData.set('next', next)
    if (jobSlug) {
      formData.set('jobSlug', jobSlug)
      formData.set('visitorId', getVisitorId())
    }

    try {
      // On success this never returns — the browser navigates to Google.
      const result = await signInWithGoogleAction(formData)
      setError(result.error)
    } catch {
      setError('generic')
    }
    setPending(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setPending(true)
    setError(null)

    const formData = new FormData()
    formData.set('contact', contact)
    formData.set('password', password)
    if (mode === 'create') formData.set('name', name)
    if (jobSlug) {
      formData.set('jobSlug', jobSlug)
      formData.set('visitorId', getVisitorId())
    }

    try {
      const result = await (mode === 'create' ? signUpAction(formData) : signInAction(formData))
      if (result.ok) {
        onSignedIn(result.applicant)
        return
      }
      setError(result.error)
      // Account made but it needs confirming first — send them to sign-in.
      if (result.error === 'confirmEmail') setMode('signin')
      if (result.error === 'exists') setMode('signin')
    } catch {
      setError('generic')
    }
    setPending(false)
  }

  return (
    <div>
      {showTitle && (
        <>
          <h1 className="text-2xl font-extrabold text-ink">{t('auth', 'title')}</h1>
          <p className="mt-2 text-sm text-muted">{t('auth', 'intro')}</p>
        </>
      )}

      <button
        type="button"
        onClick={handleGoogle}
        disabled={pending}
        className="btn btn-glass tap mt-6 w-full gap-3 py-3.5 text-sm disabled:opacity-50"
      >
        <GoogleIcon />
        {t('auth', 'continueWithGoogle')}
      </button>

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-card-border" />
        <span className="text-xs font-semibold text-muted">{t('auth', 'orContinueWith')}</span>
        <span className="h-px flex-1 bg-card-border" />
      </div>

      <div className="pill flex p-0.5 text-sm font-bold" role="tablist">
        {(['signin', 'create'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m)
              setError(null)
            }}
            className={`tap flex-1 rounded-pill px-4 py-2.5 ${mode === m ? 'bg-ink text-white' : 'text-muted'}`}
          >
            {t('auth', m === 'signin' ? 'tabSignIn' : 'tabCreate')}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {mode === 'create' && (
          <fieldset>
            <legend className="mb-2 text-sm font-bold text-ink">{t('auth', 'nameLabel')}</legend>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={100}
              className="field w-full p-4 text-base"
            />
          </fieldset>
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">{t('auth', 'contactLabel')}</legend>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            className="field w-full p-4 text-base"
          />
          {mode === 'create' && <p className="mt-2 text-xs text-muted">{t('auth', 'contactHint')}</p>}
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">{t('auth', 'passwordLabel')}</legend>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
            className="field w-full p-4 text-base"
          />
          {mode === 'create' && <p className="mt-2 text-xs text-muted">{t('auth', 'passwordHint')}</p>}
        </fieldset>

        {error && (
          <p role="alert" className={`text-sm font-semibold ${error === 'confirmEmail' ? 'text-neutral' : 'text-red-600'}`}>
            {t('auth', ERROR_KEYS[error])}
          </p>
        )}

        <Button type="submit" disabled={!canSubmit}>
          {pending ? t('auth', 'working') : t('auth', mode === 'signin' ? 'signIn' : 'create')}
        </Button>
      </form>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  )
}
