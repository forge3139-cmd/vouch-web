import JobPage from '@/components/JobPage'
import TerminalPage from '@/components/TerminalPage'
import { loadPublicJob } from '@/lib/jobs'
import { getSignedInApplicant, toApplicantView } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function PublicJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ resume?: string; googleError?: string }>
}) {
  const { slug } = await params
  const { resume, googleError } = await searchParams
  const result = await loadPublicJob(slug)

  if (result.status === 'not_found') {
    return <TerminalPage section="invalid" />
  }

  // Anyone can view the job. If they happen to be signed in, hand down just
  // their name and phone so the form can prefill; visitors with no auth
  // cookie cost no extra work here at all.
  const applicant = await getSignedInApplicant()

  return (
    <JobPage
      job={result.job}
      initialApplicant={applicant ? toApplicantView(applicant) : null}
      // Set only right after a Google round trip (see the callback route),
      // so a signed-in visitor lands straight back in the form they were
      // filling in rather than on the job's overview.
      resumeApply={resume === '1'}
      initialAuthError={googleError === '1' ? 'googleFailed' : null}
    />
  )
}
