import ConfirmationFlow from '@/components/ConfirmationFlow'
import { loadConfirmation } from '@/lib/confirmation'
import { dictionaries } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

function TerminalPage({
  section,
  vars,
}: {
  section: 'invalid' | 'expired' | 'alreadyDone'
  vars?: Record<string, string>
}) {
  const en = dictionaries.en[section]
  const sw = dictionaries.sw[section]

  const fill = (raw: string) =>
    vars ? Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, v), raw) : raw

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-extrabold text-ink">VOUCH</h1>
      <div className="mt-8 max-w-sm">
        <p className="text-lg font-bold text-ink">{fill(en.title)}</p>
        <p className="mt-2 text-sm text-muted">{fill(en.body)}</p>
      </div>
      <div className="mt-6 max-w-sm border-t border-card-border pt-6">
        <p className="text-lg font-bold text-ink">{fill(sw.title)}</p>
        <p className="mt-2 text-sm text-muted">{fill(sw.body)}</p>
      </div>
    </div>
  )
}

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const result = await loadConfirmation(token)

  if (result.status === 'not_found') {
    return <TerminalPage section="invalid" />
  }

  if (result.status === 'expired') {
    return <TerminalPage section="expired" />
  }

  if (result.status === 'already_completed') {
    const date = new Date(result.completedAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    return <TerminalPage section="alreadyDone" vars={{ date }} />
  }

  return <ConfirmationFlow bundle={result.bundle} />
}
