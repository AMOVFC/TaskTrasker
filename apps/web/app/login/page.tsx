import Link from 'next/link'
import { redirect } from 'next/navigation'

import { normalizeNextPath } from '../../lib/auth/next-path'
import { createClient } from '../../lib/supabase/server'
import { signInWithGoogle } from '../plan/actions'

type LoginPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const rawNext = searchParams?.next
  const nextParam = Array.isArray(rawNext) ? rawNext[0] : rawNext
  const next = normalizeNextPath(nextParam)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(next)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <h1 className="text-2xl font-semibold text-slate-100">Sign in to TaskTasker</h1>
        <p className="mt-2 text-sm text-slate-300">Continue with Google to access your task workspace.</p>

        <form action={signInWithGoogle} className="mt-6">
          <input type="hidden" name="next" value={next} />
          <button className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
            Continue with Google
          </button>
        </form>

        <Link href="/" className="mt-5 inline-flex text-sm text-cyan-300 hover:text-cyan-200">
          Back to home
        </Link>
      </section>
    </main>
  )
}
