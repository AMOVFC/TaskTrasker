'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, TreePine, Workflow, Link2, Calendar, LayoutGrid, GripVertical } from 'lucide-react'
import Link from 'next/link'

import BrandLogo from '../components/brand-logo'
import GoogleLogo from '../components/google-logo'
import { appVersion } from '../lib/app-version'
import { getSupabaseEnvOrNull } from '../lib/supabase/env'
import { createClient as createSupabaseClient } from '../lib/supabase/client'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let ignore = false

    if (!getSupabaseEnvOrNull()) {
      return
    }

    createSupabaseClient()
      .then((supabase) => supabase.auth.getUser())
      .then(({ data }) => {
        if (!ignore) {
          setIsAuthenticated(Boolean(data.user))
        }
      })
      .catch(() => {
        if (!ignore) {
          setIsAuthenticated(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <BrandLogo compact />
          <div className="flex items-center gap-2">
            <Link
              href="/demo"
              className="px-4 py-2 text-sm font-medium text-slate-200 hover:text-white transition-colors"
            >
              Demo
            </Link>
            <Link
              href={isAuthenticated ? '/plan' : '/login?next=/plan'}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-white text-slate-900 hover:bg-slate-100 transition-colors inline-flex items-center gap-2"
            >
              {isAuthenticated ? (
                'My Tasks'
              ) : (
                <>
                  <GoogleLogo className="h-4 w-4" />
                  Sign in with Google
                </>
              )}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center px-6">
        <div className="max-w-4xl mx-auto text-center pt-20 pb-16 space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight">
              Planning for People Who Think in{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Trees</span>
            </h1>

            <p className="text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
              TaskTrasker is a task + planning app built around structured thinking. Infinite nesting, workflow states, dependencies, and multiple views — all in one place.
            </p>
          </div>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href={isAuthenticated ? '/plan' : '/login?next=/plan'}
              className="px-8 py-3.5 rounded-lg font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-500/30 transition-all inline-flex items-center gap-2 text-lg"
            >
              {isAuthenticated ? 'Open My Tasks' : 'Get Started Free'}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/demo"
              className="px-8 py-3.5 rounded-lg font-semibold border border-slate-600 text-slate-200 hover:border-slate-500 hover:text-white transition-all inline-flex items-center gap-2 text-lg"
            >
              Try the Demo
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="max-w-5xl mx-auto w-full pb-20">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Everything you need to plan complex work</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<TreePine className="w-6 h-6 text-blue-400" />}
              title="Infinite Nesting"
              description="Break any task into subtasks, subtasks into sub-subtasks. Your plans go as deep as your thinking."
            />
            <FeatureCard
              icon={<Workflow className="w-6 h-6 text-cyan-400" />}
              title="Workflow States"
              description="Track tasks through todo, in progress, blocked, delayed, and done — see status at a glance."
            />
            <FeatureCard
              icon={<Link2 className="w-6 h-6 text-purple-400" />}
              title="Task Dependencies"
              description="Mark which tasks block others. Know what needs to happen first before moving forward."
            />
            <FeatureCard
              icon={<Calendar className="w-6 h-6 text-amber-400" />}
              title="Due Dates & Calendar"
              description="Set deadlines and view your tasks on a calendar. Stay on top of what's coming up."
            />
            <FeatureCard
              icon={<LayoutGrid className="w-6 h-6 text-green-400" />}
              title="Multiple Views"
              description="Switch between manual, upcoming, calendar, status board, sorted, and web views."
            />
            <FeatureCard
              icon={<GripVertical className="w-6 h-6 text-rose-400" />}
              title="Drag & Drop"
              description="Reorder and re-parent tasks by dragging. Restructure your plan in seconds."
            />
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-4xl mx-auto w-full pb-20">
          <h2 className="text-2xl font-bold text-white text-center mb-10">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard number={1} title="Sign in" description="Use your Google account to get started instantly. No setup required." />
            <StepCard number={2} title="Build your tree" description="Create tasks, nest them as deep as you need, and set statuses and due dates." />
            <StepCard number={3} title="Stay organized" description="Switch between views, track dependencies, and keep your plans moving forward." />
          </div>
        </div>

        {/* Floating Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-20 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-32 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-sm">
          <p>TaskTrasker {appVersion}</p>
          <div className="flex items-center gap-6">
            <Link href="/demo" className="hover:text-slate-200 transition-colors">Demo</Link>
            <Link href="/privacy" className="hover:text-slate-200 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-200 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
      <div className="mb-3">{icon}</div>
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  )
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 text-white font-bold">
        {number}
      </div>
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  )
}
