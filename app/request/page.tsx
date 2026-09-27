import OpenRequestView from '@/components/OpenRequestView'
import { getSignedInApplicant } from '@/lib/auth/session'
import { listMyOpenRequestsAction } from '@/lib/openRequestActions'

export const dynamic = 'force-dynamic'

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<{ googleError?: string }>
}) {
  const { googleError } = await searchParams
  const initialAuthError = googleError === '1' ? ('googleFailed' as const) : null
  const applicant = await getSignedInApplicant()

  if (!applicant) {
    return <OpenRequestView signedIn={false} items={[]} initialAuthError={initialAuthError} />
  }

  const items = await listMyOpenRequestsAction()
  return <OpenRequestView signedIn items={items ?? []} loadFailed={items === null} />
}
