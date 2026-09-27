import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import HandoffListener from '@/components/HandoffListener'
import SiteHeader from '@/components/SiteHeader'
import { LanguageProvider } from '@/components/LanguageContext'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'VOUCH',
  description: 'Confirm work on VOUCH — no account needed.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream text-ink">
        <HandoffListener />
        <LanguageProvider>
          <SiteHeader />
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
