import Link from 'next/link'

import BrandLogo from '../../components/brand-logo'

const sections = [
  {
    title: '1. Scope and summary',
    body: [
      'TaskTrasker is an early-stage task planning product. This page describes what information the site collects, why it is processed, how long it is retained, and what choices users have over that data.',
      'This policy is intended to support transparency and baseline privacy compliance work for the product. It should be reviewed by legal counsel before production launch in additional jurisdictions or for specialized regulated use cases.',
    ],
  },
  {
    title: '2. Data we collect',
    body: [
      'Account and identity data, such as your email address and authentication identifiers, when you sign in through the supported login flow.',
      'Workspace data that you create in the app, including tasks, nested task relationships, workflow states, due dates, and related planning metadata.',
      'Device or usage data that may be collected if you opt into analytics or when limited operational telemetry is needed to secure and operate the service.',
    ],
  },
  {
    title: '3. Why we use data',
    body: [
      'To provide the core TaskTrasker service, authenticate users, store workspace content, sync task data, prevent abuse, and maintain service reliability.',
      'To communicate important product, privacy, and security updates, especially when users enable product updates or when notices are legally or operationally required.',
      'To analyze and improve the product only where permitted by the user privacy controls or where strictly necessary for security and service delivery.',
    ],
  },
  {
    title: '4. Legal bases and user choices',
    body: [
      'Where applicable, TaskTrasker relies on performance of a contract to provide the service, legitimate interests to secure and improve the product, and consent for optional analytics or communications where required by law.',
      'Users can manage available privacy settings from the settings page, including optional analytics and future visibility defaults, and can request deletion of their TaskTrasker workspace data from the same area.',
    ],
  },
  {
    title: '5. Sharing and processors',
    body: [
      'TaskTrasker may use service providers for hosting, authentication, database storage, analytics, monitoring, and email delivery. Those providers process data on behalf of the service under their own contractual and security terms.',
      'TaskTrasker does not sell personal information. If collaboration or public-sharing features are added later, this policy should be updated before those features are enabled broadly.',
    ],
  },
  {
    title: '6. Retention',
    body: [
      'Workspace data is retained until a user deletes it, the account is deleted, or the data is removed under internal retention and security policies.',
      'Operational logs and security records may be retained for a limited period when necessary to investigate incidents, enforce terms, comply with legal obligations, or protect the service.',
    ],
  },
  {
    title: '7. Deletion and rights requests',
    body: [
      'Users can use the in-app Delete all account data control to erase TaskTrasker workspace records stored for the account. That action currently removes the product data managed by TaskTrasker and signs the user out.',
      'If authentication credentials are provided by an external identity provider, the provider may continue to retain its own records independently. Additional deletion or access requests may require contacting the relevant provider or TaskTrasker support.',
      'Depending on the applicable law, users may have rights to access, correct, delete, restrict, object to, or export certain personal information.',
    ],
  },
  {
    title: '8. Cookies and local storage',
    body: [
      'The site may use cookies or similar browser storage to maintain login sessions, remember user preferences, and support secure product operation.',
      'In the current beta, some privacy preferences are stored locally in the browser until account-synced preference storage is implemented.',
    ],
  },
  {
    title: '9. Security',
    body: [
      'TaskTrasker uses reasonable administrative, technical, and organizational measures intended to protect personal information. No system can guarantee absolute security, so users should avoid placing highly sensitive regulated information into the product unless and until explicitly supported.',
    ],
  },
  {
    title: '10. International transfers and children',
    body: [
      'Data may be processed in countries other than the user’s own depending on hosting and subprocessors. Appropriate safeguards should be added where required.',
      'TaskTrasker is not intended for children under 13, or under the minimum digital consent age in the relevant jurisdiction, unless explicitly stated otherwise in future product materials.',
    ],
  },
  {
    title: '11. Updates to this policy',
    body: [
      'TaskTrasker may update this policy as the product evolves. Material changes should be reflected on this page with a revised effective date and, where appropriate, communicated to users through the product or email.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <BrandLogo compact />
          <div className="flex items-center gap-4 text-sm">
            <Link href="/settings" className="text-slate-300 hover:text-white">
              Settings
            </Link>
            <Link href="/plan" className="text-slate-300 hover:text-white">
              Workspace
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-slate-950/20">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">Privacy & data policy</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">How TaskTrasker handles user data</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            Effective date: March 19, 2026. This policy explains the current beta handling of account, workspace, and operational data for the TaskTrasker
            website.
          </p>
        </section>

        <div className="mt-6 grid gap-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-xl font-semibold text-white">{section.title}</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6">
          <h2 className="text-xl font-semibold text-white">Questions or requests</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-cyan-50">
            If you add a public support address, company address, or formal privacy request workflow later, update this page so users can submit access,
            deletion, correction, or complaint requests through an official channel.
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm">
            <Link href="/settings" className="rounded-lg bg-white px-4 py-2 font-semibold text-slate-900 hover:bg-slate-100">
              Manage privacy settings
            </Link>
            <Link href="/" className="rounded-lg border border-cyan-200/30 px-4 py-2 font-semibold text-cyan-50 hover:border-cyan-200/60">
              Return home
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
