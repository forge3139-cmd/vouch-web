import { useT } from '@/components/LanguageContext'

/** The same facts a company sees on the Hiring Passport (passport_facts'
 * `evidence`) — never a rating or score, on purpose: VOUCH doesn't rank
 * people, so this dashboard doesn't invent a number that implies it does.
 * Three plain white tiles plus one lime highlight on the last — applications
 * sent is the one number that's entirely this person's own doing. */
export default function StatTiles({
  recordsConfirmed,
  distinctConfirmers,
  repeatClients,
  applicationsSent,
}: {
  recordsConfirmed: number
  distinctConfirmers: number
  repeatClients: number
  applicationsSent: number
}) {
  const t = useT()

  const tiles = [
    { label: t('dashboard', 'statConfirmed'), value: recordsConfirmed, highlight: false },
    { label: t('dashboard', 'statConfirmers'), value: distinctConfirmers, highlight: false },
    { label: t('dashboard', 'statRepeat'), value: repeatClients, highlight: false },
    { label: t('dashboard', 'statSent'), value: applicationsSent, highlight: true },
  ]

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className={tile.highlight ? 'rounded-[var(--radius-card)] bg-orange p-4' : 'glass p-4'}>
          <p className="text-3xl font-extrabold leading-none text-ink">{tile.value}</p>
          <p className={`mt-2 text-xs font-semibold ${tile.highlight ? 'text-ink/70' : 'text-muted'}`}>{tile.label}</p>
        </div>
      ))}
    </div>
  )
}
