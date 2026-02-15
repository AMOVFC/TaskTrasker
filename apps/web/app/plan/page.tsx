import Link from 'next/link'

import BrandLogo from '../../components/brand-logo'
import PlanWorkspace from '../../components/plan-workspace'
import { createClient } from '../../lib/supabase/server'
import { signInWithGoogle, signOut } from './actions'

export default async function PlanPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const tasks = user
    ? (
        await supabase
          .from('tasks')
          .select('id,user_id,parent_id,title,status,due_at,sort_order,created_at,updated_at')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true })
      ).data ?? []
    : []

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <BrandLogo compact />

          {user ? (
            <form action={signOut}>
              <button className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                Sign out
              </button>
            </form>
          ) : (
            <form action={signInWithGoogle}>
              <input type="hidden" name="next" value="/plan" />
              <button className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                Continue with Google
              </button>
            </form>
          )}
        </div>
      </nav>

      <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
        <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-100">
          This is now wired for Supabase auth/session, task CRUD, optimistic updates, and realtime sync events.
        </div>

        {user ? (
          <PlanWorkspace userId={user.id} initialTasks={tasks} />
        ) : (
          <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-xl font-semibold">Sign in required</h2>
            <p className="mt-2 text-sm text-slate-300">
              Use Continue with Google to start the OAuth flow and load your user-scoped tasks.
            </p>
            <Link href="/login?next=/plan" className="mt-4 inline-flex text-sm text-cyan-300 hover:text-cyan-200">
              Open login page
            </Link>
          </section>
        )}

        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
            ← Back to home
          </Link>
          <Link href="/demo" className="text-sm text-slate-300 hover:text-white">
            Open public demo mode
          </Link>
        </div>
      </div>
    </main>
  )
}
