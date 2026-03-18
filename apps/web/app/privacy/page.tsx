import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import BrandLogo from '../../components/brand-logo'

export const metadata = {
  title: 'Privacy Policy - TaskTrasker',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen text-white">
      <nav className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <BrandLogo compact />
          <Link href="/" className="text-sm text-slate-300 hover:text-white transition-colors">
            Back to home
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Home
        </Link>

        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-slate-400 mb-10">Last updated: March 2026</p>

        <div className="space-y-8 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What we collect</h2>
            <p>
              When you sign in with Google, we receive your name, email address, and profile picture from your Google account. We store your tasks, including their titles, statuses, due dates, and tree structure, in order to provide the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How we use your data</h2>
            <p>
              Your data is used solely to provide and improve TaskTrasker. We do not sell your personal information. We do not share your task data with third parties. Analytics tools (Google Analytics, Microsoft Clarity) may be used to understand usage patterns and improve the experience.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Data storage</h2>
            <p>
              Your data is stored securely using Supabase (powered by PostgreSQL) with row-level security ensuring that only you can access your own tasks. Data is encrypted in transit using HTTPS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Your rights</h2>
            <p>
              You can delete your tasks at any time from within the app. If you would like to delete your account and all associated data, please contact us and we will process your request promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Cookies</h2>
            <p>
              We use essential cookies for authentication sessions. Analytics tools may set additional cookies to understand usage patterns. No advertising cookies are used.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Changes</h2>
            <p>
              We may update this policy from time to time. Significant changes will be communicated through the app or via email.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
