import { useT } from '@/components/LanguageContext'

/** The same facts a company sees on the Hiring Passport (passport_facts'
 * `evidence`) — never a rating or score, on purpose: VOUCH doesn't rank
 * people, so this dashboard doesn't invent a number that implies it does. */
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
    { label: t('dashboard', 'statConfirmed'), value: recordsConfirmed, tint: 'bg-dash-teal/25', icon: <path d="M12 2 3 7v6c0 5 4 8 9 9 5-1 9-4 9-9V7l-9-5ZM9 12l2 2 4-4" /> },
    { label: t('dashboard', 'statConfirmers'), value: distinctConfirmers, tint: 'bg-dash-orange/20', icon: <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /> },
    { label: t('dashboard', 'statRepeat'), value: repeatClients, tint: 'bg-dash-olive/25', icon: <path d="M17 2.1 21 6l-4 3.9M3 12.1v-2a4 4 0 0 1 4-4h14M7 21.9l-4-3.9 4-3.9M21 11.9v2a4 4 0 0 1-4 4H3" /> },
    { label: t('dashboard', 'statSent'), value: applicationsSent, tint: 'bg-dash-coral/20', icon: <path d="m22 2-7 20-4-9-9-4ZM22 2 11 13" /> },
  ]

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="glass p-4">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tile.tint}`}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--color-ink)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {tile.icon}
            </svg>
          </div>
          <p className="mt-3 text-[26px] font-extrabold leading-none text-ink">{tile.value}</p>
          <p className="mt-1.5 text-xs font-semibold text-muted">{tile.label}</p>
        </div>
      ))}
    </div>
  )
}
