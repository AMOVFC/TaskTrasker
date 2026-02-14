'use client'

import { useState } from 'react'
import { Mail, Check, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800))
    
    setSubmitted(true)
    setEmail('')
    setLoading(false)
    
    // Reset after 3 seconds
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            TaskTasker
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/demo"
              className="px-4 py-2 text-sm font-medium text-slate-200 hover:text-white transition-colors"
            >
              View Demo
            </Link>
            <Link
              href="/plan"
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-white text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Sign in with Google
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Main Heading */}
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight">
              Planning for People Who Think in <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Trees</span>
            </h1>
            
            <p className="text-xl text-slate-300 leading-relaxed">
              TaskTasker is a modern task + planning web app built around structured thinking. No more flat lists. Just infinite nesting, workflow states, and dependencies.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-8">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="text-blue-400 font-semibold text-sm mb-2">Nested Tasks</div>
              <p className="text-slate-400 text-sm">Unlimited nesting for complex planning</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="text-cyan-400 font-semibold text-sm mb-2">Workflow States</div>
              <p className="text-slate-400 text-sm">todo, in progress, blocked, delayed, done</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="text-purple-400 font-semibold text-sm mb-2">Dependencies</div>
              <p className="text-slate-400 text-sm">Track what depends on what</p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="space-y-6 pt-8">
            <p className="text-slate-300">
              Get notified when TaskTasker v1 launches
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="flex-1 relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
                <Mail className="absolute right-4 top-3.5 w-5 h-5 text-slate-500" />
              </div>
              
              <button
                type="submit"
                disabled={loading || submitted}
                className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                  submitted
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : loading
                    ? 'bg-slate-700 text-slate-400 opacity-50 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-500/50'
                }`}
              >
                {submitted ? (
                  <>
                    <Check className="w-5 h-5" />
                    Got it!
                  </>
                ) : loading ? (
                  <>
                    <span className="inline-block animate-spin">⏳</span>
                    Sending...
                  </>
                ) : (
                  <>
                    Notify Me
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {submitted && (
              <p className="text-green-400 text-sm animate-fade-in">
                ✓ Thanks! We&apos;ll let you know when we launch.
              </p>
            )}

          </div>

          {/* Demo Link */}
          <div className="pt-4">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors group"
            >
              View interactive demo →
            </Link>
          </div>
        </div>

        {/* Floating Cards Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-32 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-slate-400 text-sm">
          <p>TaskTasker v0.0.1 • Early Proof of Concept • v1 First Full Release Coming Soon</p>
        </div>
      </footer>
    </div>
  )
}
