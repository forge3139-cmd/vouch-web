import type { ReactNode } from 'react'

/**
 * Every page's content sits directly on the site's own dark Luna canvas,
 * beside the sidebar (a sibling of this, placed by RootLayout) — there's
 * no separate white sheet to float on it; the atmospheric glow behind
 * everything (globals.css `body::before`) is what gives the page depth.
 * Navigation already lives in AppSidebar, so this is just the content
 * column: no second nav bar duplicating it.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen min-w-0 flex-1 flex-col">
      {children}
    </main>
  )
}
