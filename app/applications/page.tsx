import ApplicationsView from '@/components/ApplicationsView'
import { getSignedInApplicant } from '@/lib/auth/session'
import { loadMyApplications } from '@/lib/myApplications'
import { loadRecommendedJobs } from '@/lib/recommendedJobs'
import { getMyPendingAssessmentsAction } from '@/lib/assessmentActions'
import { previewPassportAction } from '@/lib/passportActions'

export const dynamic = 'force-dynamic'

const RECOMMENDED_FETCH_LIMIT = 6

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
        pendingAssessments={[]}
        initialAuthError={initialAuthError}
      />
    )
  }

  const hasExpertise = applicant.expertise.length > 0
  // Only look for possibly-relevant jobs if there's expertise to compare;
  // the function returns nothing without it anyway.
  const [items, recommended, pendingAssessments, passport] = await Promise.all([
    loadMyApplications(applicant.identityId),
    hasExpertise ? loadRecommendedJobs(RECOMMENDED_FETCH_LIMIT) : Promise.resolve([]),
    getMyPendingAssessmentsAction(),
    previewPassportAction(),
  ])

  return (
    <ApplicationsView
      signedIn
      items={items ?? []}
      loadFailed={items === null}
      recommended={recommended}
      pendingAssessments={pendingAssessments}
      evidence={passport.ok ? passport.preview.evidence : null}
    />
  )
}
