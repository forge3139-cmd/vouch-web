import ConfirmationFlow from '@/components/ConfirmationFlow'
import TerminalPage from '@/components/TerminalPage'
import { loadConfirmation } from '@/lib/confirmation'

export const dynamic = 'force-dynamic'

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const result = await loadConfirmation(token)

  if (result.status === 'not_found') {
    return <TerminalPage section="invalid" />
  }

  if (result.status === 'rate_limited') {
    return <TerminalPage section="rateLimited" />
  }

  if (result.status === 'expired') {
    return <TerminalPage section="expired" />
  }

  if (result.status === 'already_completed') {
    const date = new Date(result.completedAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    return <TerminalPage section="alreadyDone" vars={{ date }} />
  }

  return <ConfirmationFlow bundle={result.bundle} />
}
