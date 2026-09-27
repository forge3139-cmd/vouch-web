import AssessmentView from '@/components/AssessmentView'
import { getSignedInApplicant } from '@/lib/auth/session'
import { getAssessmentForApplicationAction } from '@/lib/assessmentActions'

export const dynamic = 'force-dynamic'

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ applicationId: string }>
}) {
  const { applicationId } = await params
  const applicant = await getSignedInApplicant()

  if (!applicant) {
    return <AssessmentView applicationId={applicationId} initial={{ ok: false, error: 'signedOut' }} />
  }

  const result = await getAssessmentForApplicationAction(applicationId)
  return <AssessmentView applicationId={applicationId} initial={result} />
}
