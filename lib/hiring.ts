import type { Category } from './categories'

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
  /** Was two columns (description + requirements) before Post a Job
   * merged them into one "Job Details" field on the mobile poster form —
   * see vouch-jobs-merge-details.sql. */
  details: string
  location: string
  employment_type: EmploymentType
  category: Category | null
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
 * the company sees readable text whatever language the applicant used.
 * "Pick a date" pairs with the start_date column — see ApplicationForm. */
export const AVAILABILITY_OPTIONS = [
  { value: 'Immediately', labelKey: 'availImmediately' },
  { value: 'Within 2 weeks', labelKey: 'availTwoWeeks' },
  { value: 'Within a month', labelKey: 'availOneMonth' },
  { value: 'Pick a date', labelKey: 'availPickDate' },
] as const

export const AVAILABILITY_VALUES: readonly string[] = AVAILABILITY_OPTIONS.map((o) => o.value)

/** Tanzanian trade qualifications only — deliberately no EPA, NATE or any
 * US licence. Stored as job_applications.qualifications (text[]); a
 * person can hold more than one, except 'none_yet' which the form treats
 * as exclusive of the others. */
export const QUALIFICATION_OPTIONS = [
  { value: 'veta_trade_test_3', labelKey: 'qualVetaTradeTest3' },
  { value: 'veta_trade_test_2', labelKey: 'qualVetaTradeTest2' },
  { value: 'veta_trade_test_1', labelKey: 'qualVetaTradeTest1' },
  { value: 'veta_certificate', labelKey: 'qualVetaCertificate' },
  { value: 'nactvet_diploma', labelKey: 'qualNactvetDiploma' },
  { value: 'driving_licence', labelKey: 'qualDrivingLicence' },
  { value: 'none_yet', labelKey: 'qualNoneYet' },
] as const

export const QUALIFICATION_VALUES: readonly string[] = QUALIFICATION_OPTIONS.map((o) => o.value)

/** Structured, not free text, so the company can scan it at a glance. */
export const YEARS_EXPERIENCE_OPTIONS = [
  { value: 'entry_level', labelKey: 'yearsEntryLevel' },
  { value: 'less_than_1', labelKey: 'yearsLessThan1' },
  { value: '1_to_3', labelKey: 'years1to3' },
  { value: '3_to_5', labelKey: 'years3to5' },
  { value: '5_plus', labelKey: 'years5Plus' },
] as const

export const YEARS_EXPERIENCE_VALUES: readonly string[] = YEARS_EXPERIENCE_OPTIONS.map((o) => o.value)

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
