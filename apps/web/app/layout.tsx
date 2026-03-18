import type { Metadata } from 'next'
import './globals.css'
import { MonitoringScripts } from '../components/monitoring-scripts'

export const metadata: Metadata = {
  title: 'TaskTrasker - Tree-based Task Planning',
  description: 'TaskTrasker is a task and planning app built for people who think in trees. Infinite nesting, workflow states, dependencies, and multiple views.',
  keywords: ['task management', 'project planning', 'tree structure', 'nested tasks', 'kanban', 'todo app'],
  openGraph: {
    title: 'TaskTrasker - Planning for People Who Think in Trees',
    description: 'A task and planning app with infinite nesting, workflow states, dependencies, and multiple views.',
    type: 'website',
    siteName: 'TaskTrasker',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TaskTrasker - Tree-based Task Planning',
    description: 'A task and planning app with infinite nesting, workflow states, dependencies, and multiple views.',
  },
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
        {children}
      </body>
    </html>
  )
}
