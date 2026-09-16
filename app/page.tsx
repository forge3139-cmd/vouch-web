import Directory from '@/components/Directory'
import { loadDirectory } from '@/lib/directory'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const entries = await loadDirectory({ sort: 'recently_active' })

  return <Directory initialEntries={entries} />
}
