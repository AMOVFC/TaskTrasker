import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import BrandLogo from '../../components/brand-logo'

export const metadata = {
  title: 'Terms of Service - TaskTrasker',
}

export default function TermsPage() {
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

        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-slate-400 mb-10">Last updated: March 2026</p>

        <div className="space-y-8 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Using TaskTrasker</h2>
            <p>
              By using TaskTrasker, you agree to these terms. TaskTrasker provides a task management and planning service. You must be at least 13 years old to use this service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Your account</h2>
            <p>
              You sign in using your Google account. You are responsible for maintaining the security of your Google account and for all activity under your TaskTrasker account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Your content</h2>
            <p>
              You retain ownership of all tasks and content you create in TaskTrasker. We do not claim any rights over your content. You grant us permission to store and display your content as necessary to provide the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Acceptable use</h2>
            <p>
              Do not use TaskTrasker to store or transmit illegal content, malware, or content that violates the rights of others. We reserve the right to suspend accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Service availability</h2>
            <p>
              We strive to keep TaskTrasker available and reliable, but we do not guarantee uninterrupted access. The service is provided &ldquo;as is&rdquo; without warranties of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Changes to these terms</h2>
            <p>
              We may update these terms from time to time. Continued use of TaskTrasker after changes constitutes acceptance of the updated terms.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
