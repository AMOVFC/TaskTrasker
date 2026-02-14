import Link from 'next/link'

import TaskTreePlayground from '../../components/task-tree-playground'

export default function PlanPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-slate-100">
            TaskTasker
          </Link>
          <Link
            href="/plan"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-white text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Sign in with Google
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          Signed-in testing view: this mirrors the public demo interactions, but in production this page will persist data using Google SSO + Supabase.
        </div>

        <TaskTreePlayground
          title="Signed-in Task Workspace (Preview)"
          subtitle="Rough app behavior preview. Current persistence is local-only until Supabase auth/session writes are connected."
          persistenceKey="tasktasker-signed-preview"
        />

        <div className="flex items-center gap-4">
          <Link href="/" className="text-cyan-300 hover:text-cyan-200 text-sm">
            ← Back to home
          </Link>
          <Link href="/demo" className="text-slate-300 hover:text-white text-sm">
            Open public demo mode
          </Link>
        </div>
      </div>
    </main>
  )
}
