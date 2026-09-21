import { dictionaries } from '@/lib/i18n'

export default function TerminalPage({
  section,
  vars,
}: {
  section: 'invalid' | 'expired' | 'alreadyDone' | 'rateLimited'
  vars?: Record<string, string>
}) {
  const en = dictionaries.en[section]
  const sw = dictionaries.sw[section]

  const fill = (raw: string) =>
    vars ? Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, v), raw) : raw

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col items-center justify-center px-6 text-center">
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
