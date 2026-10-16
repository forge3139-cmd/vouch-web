import Directory from '@/components/Directory'
import { loadDirectory } from '@/lib/directory'

export const dynamic = 'force-dynamic'

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const entries = await loadDirectory({ sort: 'recently_active' })

  return <Directory initialEntries={entries} initialQuery={q} />
}
