import 'server-only'
import { createAuthClient } from './auth/client'
import type { EmploymentType } from './hiring'

export interface RecommendedJob {
  slug: string
  title: string
  companyName: string
  location: string
  employmentType: EmploymentType
  deadline: string
}

interface Row {
  slug: string
  title: string
  company_name: string
  location: string
  employment_type: EmploymentType
  deadline: string
}

/**
 * Open jobs in the same trade category as the person's profile. Nothing
 * smarter than that: the database function (recommended_jobs in
 * vouch-hiring-passport.sql) matches category equality, open status and an
 * unpassed deadline, skips jobs they've already applied to, and orders by
 * newest job first. It ranks jobs by date, never people, and there is no
 * score. Called as the signed-in user, so "the person" is the session.
 *
 * Returns null on failure so the page can say so plainly rather than
 * pretending there are no jobs.
 */
export async function loadRecommendedJobs(limit = 6): Promise<RecommendedJob[] | null> {
  try {
    const supabase = await createAuthClient()
    const { data, error } = await supabase.rpc('recommended_jobs', { p_limit: limit })
    if (error) {
      console.error('[loadRecommendedJobs] rpc failed', error)
      return null
    }
    return ((data ?? []) as Row[]).map((row) => ({
      slug: row.slug,
      title: row.title,
      companyName: row.company_name,
      location: row.location,
      employmentType: row.employment_type,
      deadline: row.deadline,
    }))
  } catch (e) {
    console.error('[loadRecommendedJobs] failed', e)
    return null
  }
}
