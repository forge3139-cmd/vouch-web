import ApplicationsView from '@/components/ApplicationsView'
import { getSignedInApplicant } from '@/lib/auth/session'
import { loadMyApplications } from '@/lib/myApplications'
import { loadRecommendedJobs } from '@/lib/recommendedJobs'

export const dynamic = 'force-dynamic'

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
        initialAuthError={initialAuthError}
      />
    )
  }

  const hasTrade = applicant.category !== null
  // Only look for matching jobs if there's a trade to match; the function
  // returns nothing without one anyway.
  const [items, recommended] = await Promise.all([
    loadMyApplications(applicant.identityId),
    hasTrade ? loadRecommendedJobs() : Promise.resolve([]),
  ])

  return (
    <ApplicationsView
      signedIn
      items={items ?? []}
      loadFailed={items === null}
      recommended={recommended}
      hasTrade={hasTrade}
    />
  )
}
