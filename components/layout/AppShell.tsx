import type { ReactNode } from 'react'

/**
 * Every page's content sits inside one floating white sheet beside the
 * sidebar (a sibling of this, placed by RootLayout) — the cream page
 * shows only as the margin around it. Navigation already lives in
 * AppSidebar, so this is just the sheet itself: no second nav bar
 * duplicating it.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-5 lg:p-6">
      <main className="min-h-[calc(100vh-1.5rem)] flex-1 overflow-hidden rounded-[1.75rem] bg-white shadow-[0_24px_60px_-20px_rgba(22,30,47,0.18)]">
        {children}
      </main>
    </div>
  )
}
