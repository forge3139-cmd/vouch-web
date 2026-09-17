import 'server-only'
import { getSupabaseServerClient } from './supabase'
import type { ConfirmationRow, IdentityEvidenceRow, IdentityRow, ProofRow, RecordRow } from './types'

export interface ConfirmedWorkItem {
  record: RecordRow
  confirmerName: string | null
  comment: string | null
  /** Average of whichever of the four rating fields are present, rounded to
   * the nearest star for display. Null when the confirmation carries no
   * rating at all. One job's own rating — never averaged across jobs. */
  stars: number | null
  /** This confirmer (by identity, or by contact when anonymous) appears on
   * more than one of this worker's confirmed records. */
  hiredAgain: boolean
}

const ACTIVE_WINDOW_MONTHS = 18

export interface WorkerProfileBundle {
  worker: IdentityRow
  evidence: IdentityEvidenceRow | null
  totalConfirmed: number
  confirmedWork: ConfirmedWorkItem[]
  activeMonthsCount: number
  activeMonthsWindow: number
  ratedFourPlusCount: number
  photos: ProofRow[]
}

export type WorkerProfileResult =
  | { status: 'not_found' }
  | { status: 'ok'; bundle: WorkerProfileBundle }

export async function loadWorkerProfile(slug: string): Promise<WorkerProfileResult> {
  const supabase = getSupabaseServerClient()

  const { data: worker } = await supabase
    .from('identities')
    .select('*')
    .eq('slug', slug)
    .maybeSingle<IdentityRow>()
  if (!worker) return { status: 'not_found' }

  const { data: evidence } = await supabase
    .from('identity_evidence')
    .select('*')
    .eq('identity_id', worker.id)
    .maybeSingle<IdentityEvidenceRow>()

  const { data: recordsData } = await supabase
    .from('records')
    .select('*')
    .eq('worker_id', worker.id)
    .eq('status', 'confirmed')
    .order('confirmed_at', { ascending: false })
  const records = (recordsData ?? []) as RecordRow[]

  let confirmations: ConfirmationRow[] = []
  let photos: ProofRow[] = []
  if (records.length > 0) {
    const recordIds = records.map((r) => r.id)

    const { data: confirmationsData } = await supabase
      .from('confirmations')
      .select('*')
      .in('record_id', recordIds)
    confirmations = (confirmationsData ?? []) as ConfirmationRow[]

    const { data: proofsData } = await supabase
      .from('proofs')
      .select('*')
      .in('record_id', recordIds)
      .order('created_at', { ascending: true })
    photos = (proofsData ?? []) as ProofRow[]
  }

  const confirmationByRecordId = new Map(confirmations.map((c) => [c.record_id, c]))

  // "Hired again" is per-confirmer, not per-worker — group by whoever
  // confirmed (their identity if they have one, else their raw contact) and
  // flag any record whose confirmer shows up more than once.
  const confirmerKey = (c: ConfirmationRow | undefined): string | null =>
    c?.confirmer_id ?? c?.confirmer_contact ?? null

  const countsByConfirmer = new Map<string, number>()
  for (const record of records) {
    const key = confirmerKey(confirmationByRecordId.get(record.id))
    if (!key) continue
    countsByConfirmer.set(key, (countsByConfirmer.get(key) ?? 0) + 1)
  }

  const confirmedWork: ConfirmedWorkItem[] = records.map((record) => {
    const confirmation = confirmationByRecordId.get(record.id)
    const ratings = confirmation
      ? [
          confirmation.rating_reliability,
          confirmation.rating_quality,
          confirmation.rating_communication,
          confirmation.rating_timeliness,
        ].filter((v): v is number => typeof v === 'number')
      : []
    const stars = ratings.length > 0 ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length) : null
    const key = confirmerKey(confirmation)

    return {
      record,
      confirmerName: confirmation?.confirmer_name ?? null,
      comment: confirmation?.comment ?? null,
      stars,
      hiredAgain: key !== null && (countsByConfirmer.get(key) ?? 0) > 1,
    }
  })

  const totalConfirmed = evidence?.records_confirmed ?? records.length
  const ratedFourPlusCount = confirmedWork.filter((w) => w.stars !== null && w.stars >= 4).length

  const activeMonthKeys = new Set<string>()
  const now = new Date()
  for (const record of records) {
    if (!record.confirmed_at) continue
    const d = new Date(record.confirmed_at)
    const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
    if (monthsAgo >= 0 && monthsAgo < ACTIVE_WINDOW_MONTHS) {
      activeMonthKeys.add(`${d.getFullYear()}-${d.getMonth()}`)
    }
  }

  return {
    status: 'ok',
    bundle: {
      worker,
      evidence: evidence ?? null,
      totalConfirmed,
      confirmedWork,
      activeMonthsCount: activeMonthKeys.size,
      activeMonthsWindow: ACTIVE_WINDOW_MONTHS,
      ratedFourPlusCount,
      photos,
    },
  }
}
