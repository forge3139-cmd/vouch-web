import WorkerProfile from '@/components/WorkerProfile'
import TerminalPage from '@/components/TerminalPage'
import { loadWorkerProfile } from '@/lib/workerProfile'

export const dynamic = 'force-dynamic'

export default async function WorkerProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const result = await loadWorkerProfile(slug)

  if (result.status === 'not_found') {
    return <TerminalPage section="invalid" />
  }

  return <WorkerProfile bundle={result.bundle} slug={slug} />
}
