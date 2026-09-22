import JobsBoard from '@/components/JobsBoard'
import { loadOpenJobs } from '@/lib/jobs'

export const dynamic = 'force-dynamic'

export default async function JobsPage() {
  const jobs = await loadOpenJobs()
  return <JobsBoard jobs={jobs} />
}
