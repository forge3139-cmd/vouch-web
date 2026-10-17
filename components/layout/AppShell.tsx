import type { ReactNode } from 'react'
import AppTopbar from './AppTopbar'

/**
 * Every page's content sits directly on the site's own warm canvas,
 * beside the sidebar (a sibling of this, placed by RootLayout). The
 * topbar (wordmark, language, notifications, account) is shared chrome
 * that belongs above every page, so it lives here rather than being
 * repeated per screen. `pb-20` clears AppSidebar's fixed bottom bar on
 * phone; it's `static` again from `lg:` up, so no padding is needed there.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen min-w-0 flex-1 flex-col pb-20 lg:pb-0">
      <AppTopbar />
      {children}
    </main>
  )
}
