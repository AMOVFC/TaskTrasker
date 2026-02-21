import { CheckCircle2, Circle, AlertCircle, Zap, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import PlanWorkspace, { type TaskRecord } from '../../components/plan-workspace'

const statusLegend = [
  { label: 'Todo', icon: Circle, color: 'text-slate-400' },
  { label: 'In Progress', icon: Zap, color: 'text-blue-400' },
  { label: 'Blocked', icon: AlertCircle, color: 'text-amber-400' },
  { label: 'Done', icon: CheckCircle2, color: 'text-green-400' },
]

export default function DemoPage() {
  const demoTasks: TaskRecord[] = [
    {
      id: 'demo-root-1',
      user_id: 'demo-user',
      parent_id: null,
      blocking_task_id: null,
      title: 'Launch TaskTrasker v1',
      status: 'in_progress',
      force_completed: false,
      due_at: null,
      sort_order: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'demo-child-1',
      user_id: 'demo-user',
      parent_id: 'demo-root-1',
      blocking_task_id: null,
      title: 'Build auth + onboarding',
      status: 'todo',
      force_completed: false,
      due_at: null,
      sort_order: 0,
      created_at: '2026-01-01T00:01:00.000Z',
      updated_at: '2026-01-01T00:01:00.000Z',
    },
    {
      id: 'demo-child-2',
      user_id: 'demo-user',
      parent_id: 'demo-root-1',
      blocking_task_id: 'demo-child-1',
      title: 'Finalize task tree interactions',
      status: 'blocked',
      force_completed: false,
      due_at: null,
      sort_order: 1,
      created_at: '2026-01-01T00:02:00.000Z',
      updated_at: '2026-01-01T00:02:00.000Z',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <h1 className="text-4xl font-bold mb-4">Interactive Task Tree Demo</h1>
          <p className="text-slate-300 mb-2">
            This proof of concept demonstrates TaskTrasker&apos;s core concept: <strong>every task is a node, and every node is first-class.</strong>
          </p>
          <p className="text-slate-400 text-sm">Try editing tasks, adding labels, and nesting in multiple ways to explore the upcoming product behavior.</p>
        </div>

        <div className="mb-8 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-100">
            Public demo mode: no sign-in required and no backend saving. Data is temporary and resets when the page session is refreshed.
          </p>
        </div>

        <div className="mb-8 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
          <div className="text-sm font-semibold text-slate-300 mb-3">Workflow States:</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statusLegend.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-sm text-slate-300">{item.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mb-12">
          <PlanWorkspace userId="demo-user" initialTasks={demoTasks} mode="demo" />
        </div>

        <div className="bg-slate-800/20 rounded-lg border border-slate-700/50 p-8">
          <h2 className="text-lg font-bold mb-4">Why TaskTrasker Differs</h2>
          <div className="space-y-4 text-slate-300">
            <p>
              <strong className="text-slate-100">Traditional apps:</strong> flatten work into lists.
            </p>
            <p>
              <strong className="text-slate-100">TaskTrasker:</strong> every task can become its own plan with nested child tasks and richer workflow states.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
