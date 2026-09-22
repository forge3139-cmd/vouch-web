import { CATEGORY_LABELS, CATEGORY_VALUES, type Category } from './categories'

// Shared by server and client code — pure data and helpers only, nothing
// that touches the database. The server-only loaders live in lib/jobs.ts
// and lib/myApplications.ts.

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'one_off'
export type JobStatus = 'open' | 'closed'
export type ApplicationStatus = 'new' | 'reviewed' | 'shortlisted' | 'interviewing' | 'hired' | 'not_selected'

/** Exactly the columns the public job page may see. Deliberately no
 * poster_id, no id — the page needs nothing about who owns the job. */
export interface PublicJob {
  slug: string
  title: string
  company_name: string
  description: string
  requirements: string
  location: string
  employment_type: EmploymentType
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  deadline: string
  status: JobStatus
}

export const EMPLOYMENT_LABEL_KEYS = {
  full_time: 'empFullTime',
  part_time: 'empPartTime',
  contract: 'empContract',
  one_off: 'empOneOff',
} as const

/** What's stored in job_applications.availability is the English value, so
 * the company sees readable text whatever language the applicant used. */
export const AVAILABILITY_OPTIONS = [
  { value: 'Immediately', labelKey: 'availImmediately' },
  { value: 'Within 2 weeks', labelKey: 'availTwoWeeks' },
  { value: 'Within a month', labelKey: 'availOneMonth' },
  { value: 'Not sure yet', labelKey: 'availNotSure' },
] as const

export const AVAILABILITY_VALUES: readonly string[] = AVAILABILITY_OPTIONS.map((o) => o.value)

/** Capability chips are the directory's trades (bilingual labels already
 * exist). "Other" isn't a chip — the free-text box covers it. The English
 * label is what gets stored. */
export const CAPABILITY_CHIPS: Category[] = CATEGORY_VALUES.filter((c) => c !== 'other')

export const CAPABILITY_CHIP_EN_LABELS: readonly string[] = CAPABILITY_CHIPS.map((c) => CATEGORY_LABELS[c].en)

export const STATUS_LABEL_KEYS = {
  new: 'statusNew',
  reviewed: 'statusReviewed',
  shortlisted: 'statusShortlisted',
  interviewing: 'statusInterviewing',
  hired: 'statusHired',
  not_selected: 'statusNotSelected',
} as const

/** The forward path, in order. "Not selected" is an outcome, not a stage. */
export const STATUS_STEPS: ApplicationStatus[] = ['new', 'reviewed', 'shortlisted', 'interviewing', 'hired']

/** Today's date (YYYY-MM-DD) in East Africa, where these jobs are posted —
 * so a deadline of "the 12th" stays open until the end of the 12th there,
 * not until midnight UTC. */
export function todayInEastAfrica(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Dar_es_Salaam' })
}

/** Closed means closed by the company OR past its deadline. Either way it
 * is a normal state to show clearly, never an error. */
export function isJobClosed(job: Pick<PublicJob, 'status' | 'deadline'>): boolean {
  return job.status === 'closed' || job.deadline < todayInEastAfrica()
}

export function formatSalary(job: Pick<PublicJob, 'salary_min' | 'salary_max' | 'salary_currency'>): string | null {
  const { salary_min: min, salary_max: max, salary_currency: cur } = job
  const fmt = (n: number) => Number(n).toLocaleString('en-US')
  if (min != null && max != null) return `${cur} ${fmt(min)} – ${fmt(max)}`
  if (min != null) return `${cur} ${fmt(min)}+`
  if (max != null) return `${cur} ≤ ${fmt(max)}`
  return null
}

// Phone normalisation lives in ./phone (lib/phone.ts) — the ONE copy shared
// verbatim with the mobile app. Import normalizePhone/parseContact/
// storableContact/telUrl from there, not from here.
