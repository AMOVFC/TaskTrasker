'use client'

import { useEffect, useMemo, useState } from 'react'

type PrivacySettings = {
  analyticsEnabled: boolean
  productUpdatesEnabled: boolean
  profileDiscoverable: boolean
  securityAlertsEnabled: boolean
}

const STORAGE_KEY = 'tasktrasker-privacy-settings'

const defaultSettings: PrivacySettings = {
  analyticsEnabled: false,
  productUpdatesEnabled: true,
  profileDiscoverable: false,
  securityAlertsEnabled: true,
}

const settingDefinitions: Array<{
  key: keyof PrivacySettings
  title: string
  description: string
  hint: string
}> = [
  {
    key: 'analyticsEnabled',
    title: 'Product analytics',
    description: 'Allow TaskTrasker to collect anonymized usage analytics that help improve planning flows and reliability.',
    hint: 'Recommended off by default until you explicitly opt in.',
  },
  {
    key: 'productUpdatesEnabled',
    title: 'Product updates',
    description: 'Receive launch notes, release announcements, and privacy-impacting change notices by email when available.',
    hint: 'Useful for policy updates and important product changes.',
  },
  {
    key: 'profileDiscoverable',
    title: 'Profile discoverability',
    description: 'Control whether your account can be surfaced in future collaboration features such as shared workspaces or mentions.',
    hint: 'Currently reserved for future collaboration features.',
  },
  {
    key: 'securityAlertsEnabled',
    title: 'Security alerts',
    description: 'Keep mandatory security and account-safety notifications enabled so you can be warned about suspicious sign-ins or changes.',
    hint: 'This should generally stay on.',
  },
]

export default function PrivacySettingsPanel() {
  const [settings, setSettings] = useState<PrivacySettings>(defaultSettings)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle')

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<PrivacySettings>
        setSettings({ ...defaultSettings, ...parsed })
      } catch {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    }

    setHasLoaded(true)
  }, [])

  useEffect(() => {
    if (!hasLoaded || typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    setSaveState('saved')
    const timeoutId = window.setTimeout(() => setSaveState('idle'), 1800)

    return () => window.clearTimeout(timeoutId)
  }, [hasLoaded, settings])

  const enabledCount = useMemo(() => Object.values(settings).filter(Boolean).length, [settings])

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/30">
      <div className="flex flex-col gap-3 border-b border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">Privacy controls</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Choose how your data is used</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            These controls are saved in this browser for the current beta build. They let users opt out of non-essential data use now, even before full
            synced account preferences ship.
          </p>
        </div>

        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
          <div className="font-semibold">{enabledCount} preferences enabled</div>
          <div className="mt-1 text-cyan-100/80">{saveState === 'saved' ? 'Saved on this device.' : 'Changes save automatically.'}</div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {settingDefinitions.map((setting) => {
          const checked = settings[setting.key]

          return (
            <label
              key={setting.key}
              className="flex cursor-pointer flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 transition hover:border-slate-700 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-white">{setting.title}</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      checked ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {checked ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{setting.description}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">{setting.hint}</p>
              </div>

              <div className="flex items-center">
                <span className="sr-only">Toggle {setting.title}</span>
                <button
                  type="button"
                  aria-pressed={checked}
                  onClick={() => setSettings((current) => ({ ...current, [setting.key]: !current[setting.key] }))}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full border transition ${
                    checked ? 'border-cyan-400 bg-cyan-400/20' : 'border-slate-700 bg-slate-900'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 rounded-full bg-white shadow-lg transition ${checked ? 'translate-x-7' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            </label>
          )
        })}
      </div>
    </section>
  )
}
