'use client'

import { useT } from '@/components/LanguageContext'
import { STATUS_STEPS, type ApplicationStatus } from '@/lib/hiring'

type RowState = 'done' | 'current' | 'upcoming' | 'ended'

const STAGE_KEYS = {
  new: 'timelineNew',
  reviewed: 'timelineReviewed',
  shortlisted: 'timelineShortlisted',
  interviewing: 'timelineInterviewing',
  hired: 'timelineHired',
} as const

interface Row {
  key: string
  stage: keyof typeof STAGE_KEYS | 'not_selected'
  state: RowState
}

/** Derived from the single stored status. Not selected stops after the
 * furthest stage reached — later stages are left out, never greyed, so it
 * never implies they were coming. */
function buildRows(status: ApplicationStatus, stageReached: ApplicationStatus | null): Row[] {
  const stages = STATUS_STEPS as (keyof typeof STAGE_KEYS)[]
  if (status === 'not_selected') {
    const reached = Math.max(0, stages.findIndex((s) => s === stageReached))
    return [
      ...stages.slice(0, reached + 1).map((s) => ({ key: s, stage: s, state: 'done' as const })),
      { key: 'not_selected', stage: 'not_selected' as const, state: 'ended' as const },
    ]
  }
  if (status === 'hired') return stages.map((s) => ({ key: s, stage: s, state: 'done' as const }))
  const current = stages.findIndex((s) => s === status)
  return stages.map((s, i) => ({
    key: s,
    stage: s,
    state: i < current ? ('done' as const) : i === current ? ('current' as const) : ('upcoming' as const),
  }))
}

/**
 * Read-only progress timeline for the applicant. Shape and tick carry the
 * meaning — a filled circle with a tick is done, a ringed dot is current, an
 * empty outline is not reached, a dark square with a cross is where it
 * ended — colour only reinforces that.
 */
export default function ApplicationTimeline({
  status,
  stageReached,
  reason,
}: {
  status: ApplicationStatus
  stageReached: ApplicationStatus | null
  reason: string | null
}) {
  const t = useT()
  const rows = buildRows(status, stageReached)

  return (
    <ol className="mt-4" aria-label={t('applied', 'timelineLabel')}>
      {rows.map((row, i) => {
        const last = i === rows.length - 1
        const next = rows[i + 1]
        const label = row.stage === 'not_selected' ? t('applied', 'timelineNotSelected') : t('applied', STAGE_KEYS[row.stage])
        const stateWord =
          row.state === 'done'
            ? t('applied', 'timelineDone')
            : row.state === 'current'
              ? t('applied', 'timelineCurrent')
              : row.state === 'ended'
                ? t('applied', 'timelineEnded')
                : t('applied', 'timelineUpcoming')
        const lineTone =
          row.state === 'done' && next?.state === 'ended'
            ? 'bg-neutral'
            : row.state === 'done'
              ? 'bg-orange'
              : 'bg-card-border'

        return (
          <li key={row.key} className="flex gap-3">
            <div className="flex w-6 shrink-0 flex-col items-center">
              <Node state={row.state} />
              {!last && <span aria-hidden="true" className={`my-1 min-h-4 w-[3px] flex-1 rounded-full ${lineTone}`} />}
            </div>
            <div className={`min-w-0 flex-1 ${last ? '' : 'pb-3'}`}>
              <p
                className={`text-sm leading-6 ${
                  row.state === 'upcoming' ? 'font-semibold text-muted' : row.state === 'done' ? 'font-semibold text-ink' : 'font-extrabold text-ink'
                }`}
              >
                {label}
                <span className="sr-only">
                  {' — '}
                  {stateWord}
                </span>
              </p>
              {row.state === 'ended' && reason && <p className="text-xs leading-relaxed text-neutral">{reason}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function Node({ state }: { state: RowState }) {
  if (state === 'done') {
    return (
      <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-orange text-white">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
    )
  }
  if (state === 'current') {
    return (
      <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-orange p-[3px]">
        <span className="block h-full w-full rounded-full bg-orange" />
      </span>
    )
  }
  if (state === 'ended') {
    return (
      <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral text-white">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </span>
    )
  }
  return <span aria-hidden="true" className="block h-6 w-6 rounded-full border-2 border-card-border" />
}
