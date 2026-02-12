'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, CheckCircle2, Circle, AlertCircle, Clock, Zap, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface TreeNode {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'blocked' | 'done'
  children?: TreeNode[]
  description?: string
}

const demoTasks: TreeNode[] = [
  {
    id: '1',
    title: 'Launch TaskTasker v1',
    status: 'in_progress',
    description: 'Complete first full release',
    children: [
      {
        id: '1-1',
        title: 'Frontend Development',
        status: 'in_progress',
        children: [
          {
            id: '1-1-1',
            title: 'Design landing page',
            status: 'done',
          },
          {
            id: '1-1-2',
            title: 'Implement tree rendering',
            status: 'in_progress',
          },
          {
            id: '1-1-3',
            title: 'Add drag & drop reordering',
            status: 'todo',
          },
          {
            id: '1-1-4',
            title: 'Build status workflow UI',
            status: 'todo',
          },
        ],
      },
      {
        id: '1-2',
        title: 'Backend Setup',
        status: 'in_progress',
        children: [
          {
            id: '1-2-1',
            title: 'Set up database schema',
            status: 'done',
          },
          {
            id: '1-2-2',
            title: 'Create API routes',
            status: 'in_progress',
          },
          {
            id: '1-2-3',
            title: 'Implement authentication',
            status: 'blocked',
          },
        ],
      },
      {
        id: '1-3',
        title: 'Deployment',
        status: 'blocked',
        description: 'Depends on backend & frontend completion',
        children: [
          {
            id: '1-3-1',
            title: 'Set up Vercel hosting',
            status: 'todo',
          },
          {
            id: '1-3-2',
            title: 'Configure database',
            status: 'todo',
          },
        ],
      },
    ],
  },
  {
    id: '2',
    title: 'Beta Testing & Feedback',
    status: 'todo',
    children: [
      {
        id: '2-1',
        title: 'Recruit 50 beta users',
        status: 'todo',
      },
      {
        id: '2-2',
        title: 'Collect feedback & iterate',
        status: 'todo',
      },
      {
        id: '2-3',
        title: 'Fix bugs & polish UX',
        status: 'todo',
      },
    ],
  },
]

const statusConfig = {
  todo: { icon: Circle, color: 'text-slate-400', bg: 'bg-slate-100', label: 'Todo' },
  in_progress: { icon: Zap, color: 'text-blue-500', bg: 'bg-blue-100', label: 'In Progress' },
  blocked: { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-100', label: 'Blocked' },
  done: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100', label: 'Done' },
}

function TreeItem({ node, level = 0 }: { node: TreeNode; level?: number }) {
  const [expanded, setExpanded] = useState(level < 2)
  const hasChildren = node.children && node.children.length > 0
  const statusInfo = statusConfig[node.status]
  const StatusIcon = statusInfo.icon

  return (
    <div>
      <div className="flex items-start gap-2 py-2.5 px-3 hover:bg-slate-700/50 rounded-lg transition-colors group">
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-shrink-0 hover:bg-slate-600 p-1 rounded mt-0.5"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>
        ) : (
          <div className="w-6 flex-shrink-0" />
        )}
        
        <StatusIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${statusInfo.color}`} />
        
        <div className="flex-1 min-w-0">
          <div className="text-slate-100 font-medium">{node.title}</div>
          {node.description && (
            <div className="text-xs text-slate-400 mt-1">{node.description}</div>
          )}
        </div>
        
        <span className={`text-xs px-2.5 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color} opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 whitespace-nowrap`}>
          {statusInfo.label}
        </span>
      </div>
      
      {expanded && hasChildren && (
        <div className="ml-2 border-l border-slate-700/50 pl-0">
          {node.children!.map((child) => (
            <TreeItem key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
          
          <h1 className="text-4xl font-bold mb-4">Interactive Task Tree Demo</h1>
          <p className="text-slate-300 mb-2">
            This proof of concept demonstrates TaskTasker&apos;s core concept: <strong>every task is a node, and every node is first-class.</strong>
          </p>
          <p className="text-slate-400 text-sm">
            Click arrows to expand/collapse nested tasks. Hover over tasks to see their workflow status.
          </p>
        </div>

        {/* Key Concepts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="font-semibold text-sm">Nested Tasks</h3>
            </div>
            <p className="text-slate-400 text-sm">Unlimited nesting. Every node matters.</p>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              </div>
              <h3 className="font-semibold text-sm">Workflow States</h3>
            </div>
            <p className="text-slate-400 text-sm">todo, in progress, blocked, done.</p>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded bg-amber-500/20 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="font-semibold text-sm">Block Detection</h3>
            </div>
            <p className="text-slate-400 text-sm">See what&apos;s blocked and why.</p>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded bg-slate-600/50 flex items-center justify-center">
                <Circle className="w-4 h-4 text-slate-500" />
              </div>
              <h3 className="font-semibold text-sm">Flexibility</h3>
            </div>
            <p className="text-slate-400 text-sm">Reorder and move freely.</p>
          </div>
        </div>

        {/* Status Legend */}
        <div className="mb-8 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
          <div className="text-sm font-semibold text-slate-300 mb-3">Workflow States:</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(statusConfig).map(([key, config]) => {
              const Icon = config.icon
              return (
                <div key={key} className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className="text-sm text-slate-300">{config.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Main Tree Demo */}
        <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-8 mb-12">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-400" />
            TaskTasker v1 Launch Timeline
          </h2>
          
          <div className="space-y-1">
            {demoTasks.map((task) => (
              <TreeItem key={task.id} node={task} />
            ))}
          </div>

          <div className="mt-8 p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
            <p className="text-sm text-slate-300 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>This is a live demonstration of hierarchical task management. In v1, you&apos;ll be able to drag/drop, set due dates, track dependencies, and persist to a database.</span>
            </p>
          </div>
        </div>

        {/* How It Differs */}
        <div className="bg-slate-800/20 rounded-lg border border-slate-700/50 p-8">
          <h2 className="text-lg font-bold mb-4">Why TaskTasker Differs</h2>
          <div className="space-y-4 text-slate-300">
            <p>
              <strong className="text-slate-100">Traditional apps:</strong> Flatten work into lists. A project is a list of tasks. A task is a single item.
            </p>
            <p>
              <strong className="text-slate-100">TaskTasker:</strong> Every task is a tree. A project has subtasks. Subtasks have sub-subtasks. No limits. Every level matters equally.
            </p>
            <p className="pt-4 text-slate-400">
              This structure mirrors how real work actually happens. Most planning isn&apos;t linear—it&apos;s deeply nested, interconnected, and evolving.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-slate-400 text-sm">
            This is v0.0.1 - a proof of concept. Return to <Link href="/" className="text-blue-400 hover:text-blue-300">home</Link> to sign up for v1 launch updates.
          </p>
        </div>
      </div>
    </div>
  )
}
