'use client'

import { useState } from 'react'
import { useT } from '@/components/LanguageContext'
import Button from '@/components/ui/Button'
import { signInAction, signUpAction, type AuthErrorCode } from '@/lib/auth/authActions'
import type { ApplicantView } from '@/lib/auth/session'
import { getVisitorId } from '@/lib/funnelClient'

type Mode = 'signin' | 'create'

const ERROR_KEYS: Record<AuthErrorCode, 'errRequired' | 'errBadContact' | 'errWeakPassword' | 'errInvalid' | 'errExists' | 'errConfirmEmail' | 'errSetup' | 'errTooMany' | 'errUnconfigured' | 'errGeneric'> = {
  required: 'errRequired',
  badContact: 'errBadContact',
  weakPassword: 'errWeakPassword',
  invalid: 'errInvalid',
  exists: 'errExists',
  confirmEmail: 'errConfirmEmail',
  setupFailed: 'errSetup',
  tooMany: 'errTooMany',
  unconfigured: 'errUnconfigured',
  generic: 'errGeneric',
}

/**
 * The one inline screen: sign in, or create an account with just a name,
 * a phone or email, and a password. It's content only — the caller wraps
 * it (and owns everything the applicant has typed, which is why nothing
 * here can lose it). Sessions are set by the server action as HttpOnly
 * cookies; nothing about the session is ever stored in the browser.
 */
export default function AuthPanel({
  jobSlug,
  onSignedIn,
  showTitle = true,
}: {
  /** When set, sign-in/up steps are logged against this job's funnel. */
  jobSlug?: string
  onSignedIn: (applicant: ApplicantView) => void
  showTitle?: boolean
}) {
  const t = useT()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AuthErrorCode | null>(null)

  const canSubmit = contact.trim() && password && (mode === 'signin' || name.trim()) && !pending

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

      <div className="pill mt-6 flex p-0.5 text-sm font-bold" role="tablist">
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
