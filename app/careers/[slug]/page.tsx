import CareersPage from '@/components/CareersPage'
import TerminalPage from '@/components/TerminalPage'
import { loadCareersJobs } from '@/lib/jobs'

export const dynamic = 'force-dynamic'

export default async function CareersRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = await loadCareersJobs(slug)

  if (result.status === 'not_found') {
    return <TerminalPage section="invalid" />
  }

  return <CareersPage poster={result.poster} jobs={result.jobs} />
}
