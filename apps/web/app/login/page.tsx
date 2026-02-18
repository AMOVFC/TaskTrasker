import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getAuthErrorMessage, normalizeNextPath } from '../../lib/auth/login-flow.mjs'
import { assertSupabaseConfiguredOutsideLocalMode, getSupabaseEnvOrNull, isLocalNoSupabaseModeEnabled } from '../../lib/supabase/env'
import { createClient } from '../../lib/supabase/server'
import BrandLogo from '../../components/brand-logo'
import { signInWithGoogle } from '../plan/actions'

export const runtime = 'nodejs'

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function normalizeSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  assertSupabaseConfiguredOutsideLocalMode()
  const resolvedSearchParams = await searchParams
  const nextParam = normalizeSearchParam(resolvedSearchParams?.next)
  const authErrorCode = normalizeSearchParam(resolvedSearchParams?.error) ?? null
  const authErrorMessage = getAuthErrorMessage(authErrorCode)
  const next = normalizeNextPath(nextParam)

  const hasSupabase = Boolean(getSupabaseEnvOrNull())
  const allowLocalNoSupabase = isLocalNoSupabaseModeEnabled()

  if (!hasSupabase && allowLocalNoSupabase) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
          <BrandLogo href="/" className="mb-6" />
          <h1 className="text-2xl font-semibold text-slate-100">Local mode is enabled</h1>
          <p className="mt-2 text-sm text-slate-300">
            Supabase environment variables are not configured. For local testing, go to the plan page to use the offline task playground.
          </p>
          <Link href="/plan" className="mt-5 inline-flex text-sm text-cyan-300 hover:text-cyan-200">
            Open local plan mode
          </Link>
        </section>
      </main>
    )
  }

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
        <BrandLogo href="/" className="mb-6" />
        <h1 className="text-2xl font-semibold text-slate-100">Sign in to your workspace</h1>
        <p className="mt-2 text-sm text-slate-300">Continue with Google to access your task workspace.</p>
        {authErrorMessage ? <p className="mt-3 text-sm text-rose-300">{authErrorMessage}</p> : null}

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
