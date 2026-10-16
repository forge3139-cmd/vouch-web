import { getSignedInApplicant } from '@/lib/auth/session'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'

export const dynamic = 'force-dynamic'

/**
 * Signed-in applicants get the dashboard shell (sidebar nav) for this
 * whole section, including the assessment sub-page. Signed-out visitors
 * get the page's own centered sign-in form with no extra chrome — same as
 * before this existed. SiteHeader hides itself on this path only once
 * someone IS signed in (see components/SiteHeader.tsx), so there's never
 * two navs stacked.
 */
export default async function ApplicationsLayout({ children }: LayoutProps<'/applications'>) {
  const applicant = await getSignedInApplicant()
  if (!applicant) return <>{children}</>

  return (
    <div className="dashboard-shell">
      <DashboardSidebar slug={applicant.slug} />
      <main className="dashboard-main">{children}</main>
    </div>
  )
}
