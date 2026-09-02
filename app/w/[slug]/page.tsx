import WorkRequestFlow from '@/components/WorkRequestFlow'
import TerminalPage from '@/components/TerminalPage'
import { loadWorkerBySlug } from '@/lib/workRequest'

export const dynamic = 'force-dynamic'

export default async function WorkRequestPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const result = await loadWorkerBySlug(slug)

  if (result.status === 'not_found') {
    return <TerminalPage section="invalid" />
  }

  return <WorkRequestFlow bundle={result.bundle} slug={slug} />
}
