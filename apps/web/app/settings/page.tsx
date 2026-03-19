import Link from 'next/link'

import BrandLogo from '../../components/brand-logo'
import PrivacySettingsPanel from '../../components/privacy-settings-panel'
import { getSupabaseEnvOrNull, isLocalNoSupabaseModeEnabled } from '../../lib/supabase/env'
import { createClient } from '../../lib/supabase/server'
import { deleteAllAccountData } from './actions'

export const runtime = 'nodejs'

export default async function SettingsPage() {
  const hasSupabase = Boolean(getSupabaseEnvOrNull())
  const allowLocalNoSupabase = isLocalNoSupabaseModeEnabled()
  const supabase = hasSupabase ? await createClient() : null
  const user = supabase ? (await supabase.auth.getUser()).data.user : null

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <BrandLogo compact />
          <div className="flex items-center gap-4 text-sm">
            <Link href="/plan" className="text-slate-300 hover:text-white">
              Workspace
            </Link>
            <Link href="/privacy" className="text-slate-300 hover:text-white">
              Privacy policy
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-slate-950/20">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">Account settings</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Privacy and data controls</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            Give users a dedicated place to review how TaskTrasker uses their data, manage privacy preferences, and permanently erase their workspace
            data when they no longer want an account.
          </p>
        </section>

        {hasSupabase ? (
          user ? (
            <>
              <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Signed in account</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{user.email ?? 'Authenticated user'}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Your authentication is handled through Supabase and your selected sign-in provider. The controls below cover TaskTrasker product data and
                    account privacy choices for this site.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                  <div className="text-sm font-semibold text-white">What you can do here</div>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                    <li>• Turn optional product analytics on or off.</li>
                    <li>• Control future profile visibility defaults.</li>
                    <li>• Review the site privacy and data policy.</li>
                    <li>• Delete all TaskTrasker workspace data from your account.</li>
                  </ul>
                </div>
              </section>

              <PrivacySettingsPanel />

              <section className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 shadow-lg shadow-rose-950/10">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-rose-200">Danger zone</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Delete all account data</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-rose-100/90">
                  This permanently deletes all TaskTrasker workspace records associated with your account, including tasks and planning data stored for the
                  app. After deletion, you will be signed out and returned to the home page.
                </p>
                <p className="mt-3 text-sm leading-7 text-rose-100/80">
                  Authentication records managed by your external sign-in provider may still exist outside TaskTrasker. See the privacy policy for details.
                </p>

                <form action={deleteAllAccountData} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-rose-100/80">This action cannot be undone.</div>
                  <button className="inline-flex items-center justify-center rounded-xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-400">
                    Delete all account data
                  </button>
                </form>
              </section>
            </>
          ) : (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-xl font-semibold text-white">Sign in required</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Users need to be signed in to manage privacy settings or delete account data. You can still review the public privacy and data policy at any
                time.
              </p>
              <div className="mt-5 flex flex-wrap gap-4">
                <Link href="/login?next=/settings" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                  Go to login
                </Link>
                <Link href="/privacy" className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-600 hover:text-white">
                  Read privacy policy
                </Link>
              </div>
            </section>
          )
        ) : allowLocalNoSupabase ? (
          <>
            <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6">
              <h2 className="text-xl font-semibold text-amber-100">Local beta settings mode</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-amber-50">
                Supabase is not configured, so privacy controls can be previewed locally without a live account. The deletion action is unavailable because
                there is no remote account data to remove in local mode.
              </p>
            </section>
            <PrivacySettingsPanel />
          </>
        ) : (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold text-white">Settings are unavailable right now</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              The app is missing its authentication configuration, so user privacy settings cannot be loaded in this environment. The privacy and data policy
              page is still available publicly.
            </p>
            <Link href="/privacy" className="mt-5 inline-flex rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-600 hover:text-white">
              Open privacy policy
            </Link>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/plan" className="text-cyan-300 hover:text-cyan-200">
            ← Back to workspace
          </Link>
          <Link href="/privacy" className="text-slate-300 hover:text-white">
            Privacy & data policy
          </Link>
        </div>
      </div>
    </main>
  )
}
