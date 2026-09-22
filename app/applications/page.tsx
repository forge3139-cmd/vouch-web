import ApplicationsView from '@/components/ApplicationsView'
import { getSignedInApplicant } from '@/lib/auth/session'
import { loadMyApplications } from '@/lib/myApplications'
import { loadRecommendedJobs } from '@/lib/recommendedJobs'
import { loadNotifications } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

// Display shows a handful; the new-jobs count looks a bit further back so
// it doesn't undercount just because the list itself is short.
const RECOMMENDED_DISPLAY_LIMIT = 6
const RECOMMENDED_FETCH_LIMIT = 20

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ googleError?: string }>
}) {
  const { googleError } = await searchParams
  const initialAuthError = googleError === '1' ? ('googleFailed' as const) : null
  const applicant = await getSignedInApplicant()

  if (!applicant) {
    return (
      <ApplicationsView
        signedIn={false}
        items={[]}
        loadFailed={false}
        recommended={[]}
        hasTrade={false}
        newJobsCount={0}
        notifications={[]}
        initialAuthError={initialAuthError}
      />
    )
  }

  const hasTrade = applicant.category !== null
  // Only look for matching jobs if there's a trade to match; the function
  // returns nothing without one anyway.
  const [items, recommended, notifications] = await Promise.all([
    loadMyApplications(applicant.identityId),
    hasTrade ? loadRecommendedJobs(RECOMMENDED_FETCH_LIMIT) : Promise.resolve([]),
    loadNotifications(),
  ])

  // Computed from the OLD jobs_last_seen_at, read moments ago as part of
  // the session — this reflects what's new for THIS visit. The client
  // marks the visit seen afterwards (see ApplicationsView), which is what
  // makes next visit's count smaller.
  const since = applicant.jobsLastSeenAt ?? '1970-01-01T00:00:00Z'
  const newJobsCount = applicant.jobAlertsEnabled
    ? (recommended ?? []).filter((j) => j.createdAt > since).length
    : 0

  return (
    <ApplicationsView
      signedIn
      items={items ?? []}
      loadFailed={items === null}
      recommended={recommended ? recommended.slice(0, RECOMMENDED_DISPLAY_LIMIT) : null}
      hasTrade={hasTrade}
      newJobsCount={newJobsCount}
      notifications={notifications ?? []}
    />
  )
}
