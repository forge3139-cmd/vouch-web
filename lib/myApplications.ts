import 'server-only'
import { createAuthClient } from './auth/client'
import type { ApplicationStatus } from './hiring'
import type { PassportAccessState } from './passport'

export interface PassportAccess {
  state: PassportAccessState
  grantedAt: string | null
  views: number
  lastViewedAt: string | null
}

export interface MyApplication {
  id: string
  status: ApplicationStatus
  /** For not_selected: the furthest stage they reached first. */
  stageReached: ApplicationStatus | null
  notSelectedReason: string | null
  withdrawn: boolean
  appliedAt: string
  jobTitle: string
  companyName: string
  jobSlug: string
  access: PassportAccess
}

type JobJoin = { title: string; company_name: string; slug: string; status: 'open' | 'closed' }

interface ApplicationRow {
  id: string
  job_id: string
  status: ApplicationStatus
  stage_reached: ApplicationStatus | null
  not_selected_reason: string | null
  withdrawn_at: string | null
  created_at: string
  jobs: JobJoin | JobJoin[] | null
}

interface GrantRow {
  id: string
  job_id: string | null
  granted_at: string
  revoked_at: string | null
  revoked_reason: 'withdrawn' | 'job_closed' | null
}

/**
 * The signed-in applicant's own applications, and for each one where their
 * passport access stands and how often it has been viewed — all read AS
 * THEM (publishable key + their session), so Row Level Security is the
 * gate: applicants can read only their own applications, their own grants,
 * and the log of who viewed THEM.
 *
 * Reads job_applications, jobs, access_grants and access_log only. It never
 * names job_application_notes: that table is company-private, and this file
 * is on the applicant side of the line.
 */
export async function loadMyApplications(identityId: string): Promise<MyApplication[] | null> {
  try {
    const supabase = await createAuthClient()

    const { data: apps, error } = await supabase
      .from('job_applications')
      .select('id, job_id, status, stage_reached, not_selected_reason, withdrawn_at, created_at, jobs(title, company_name, slug, status)')
      .eq('applicant_identity_id', identityId)
      .order('created_at', { ascending: false })
      .returns<ApplicationRow[]>()

    if (error) {
      console.error('[loadMyApplications] applications query failed', error)
      return null
    }

    const { data: grants, error: grantsError } = await supabase
      .from('access_grants')
      .select('id, job_id, granted_at, revoked_at, revoked_reason')
      .eq('subject_id', identityId)
      .not('job_id', 'is', null)
      .returns<GrantRow[]>()
    if (grantsError) {
      console.error('[loadMyApplications] grants query failed', grantsError)
      return null
    }

    // Views of THIS person's passport (the subject can always see who looked).
    const { data: logs, error: logsError } = await supabase
      .from('access_log')
      .select('grant_id, occurred_at')
      .eq('subject_id', identityId)
      .returns<{ grant_id: string | null; occurred_at: string }[]>()
    if (logsError) {
      console.error('[loadMyApplications] access log query failed', logsError)
      return null
    }

    const viewsByGrant = new Map<string, { count: number; last: string }>()
    for (const log of logs ?? []) {
      if (!log.grant_id) continue
      const current = viewsByGrant.get(log.grant_id)
      viewsByGrant.set(log.grant_id, {
        count: (current?.count ?? 0) + 1,
        last: current && current.last > log.occurred_at ? current.last : log.occurred_at,
      })
    }

    // The newest grant per job wins (a re-application after withdrawing
    // creates a fresh one).
    const grantByJob = new Map<string, GrantRow>()
    for (const grant of [...(grants ?? [])].sort((a, b) => a.granted_at.localeCompare(b.granted_at))) {
      if (grant.job_id) grantByJob.set(grant.job_id, grant)
    }

    return (apps ?? []).flatMap((row) => {
      const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs
      if (!job) return []

      const grant = grantByJob.get(row.job_id)
      const views = grant ? viewsByGrant.get(grant.id) : undefined

      let state: PassportAccessState = 'none'
      if (row.withdrawn_at) state = 'withdrawn'
      else if (grant) {
        if (grant.revoked_at) state = grant.revoked_reason === 'withdrawn' ? 'withdrawn' : 'job_closed'
        // Belt and braces: the database trigger revokes on close, but never
        // tell someone a closed job can still see them.
        else state = job.status === 'open' ? 'active' : 'job_closed'
      }

      return [{
        id: row.id,
        status: row.status,
        stageReached: row.stage_reached,
        notSelectedReason: row.not_selected_reason,
        withdrawn: row.withdrawn_at !== null,
        appliedAt: row.created_at,
        jobTitle: job.title,
        companyName: job.company_name,
        jobSlug: job.slug,
        access: {
          state,
          grantedAt: grant?.granted_at ?? null,
          views: views?.count ?? 0,
          lastViewedAt: views?.last ?? null,
        },
      }]
    })
  } catch (e) {
    console.error('[loadMyApplications] failed', e)
    return null
  }
}
