import type { Metadata } from 'next'
import './globals.css'
import { MonitoringScripts } from '../components/monitoring-scripts'

export const metadata: Metadata = {
  title: 'TaskTasker - Tree-based Task Planning',
  description: 'TaskTasker is a modern task + planning web app built for people who think in trees, not flat lists.',
  icons: {
    icon: '/tasktasker-logo-icon.svg',
    shortcut: '/tasktasker-logo-icon.svg',
    apple: '/tasktasker-logo-icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <MonitoringScripts />
        {/* Work in Progress Banner */}
        <div className="sticky top-0 z-50 bg-amber-500/90 text-slate-900 px-6 py-3 text-center font-semibold border-b border-amber-600">
          ⚠️ Work in Progress (v0.1.1) - This is a proof of concept. Full v1 release coming soon.
        </div>
        {children}
      </body>
    </html>
  )
}
