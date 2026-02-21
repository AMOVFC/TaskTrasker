'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Circle, AlertCircle, Clock3, Plus, ChevronDown, ChevronRight, Link2, BellRing } from 'lucide-react'

type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'delayed' | 'done'
type BlockMode = 'none' | 'task' | 'expression'

interface TaskNode {
  id: string
  alias: string
  title: string
  description: string
  status: TaskStatus
  labels: string[]
  links: string[]
  dueAt?: string
  blockMode?: BlockMode
  blockingTaskId?: string
  blockExpression?: string
  children: TaskNode[]
}

interface ReminderItem {
  taskId: string
  taskTitle: string
  dueAt: string
  remindAt: string
}

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'done', label: 'Done' },
]

const statusStyle: Record<TaskStatus, { dot: string; chip: string; icon: typeof Circle }> = {
  todo: { dot: 'text-slate-400', chip: 'bg-slate-700 text-slate-200', icon: Circle },
  in_progress: { dot: 'text-blue-400', chip: 'bg-blue-500/20 text-blue-300', icon: Clock3 },
  blocked: { dot: 'text-amber-400', chip: 'bg-amber-500/20 text-amber-200', icon: AlertCircle },
  delayed: { dot: 'text-violet-400', chip: 'bg-violet-500/20 text-violet-200', icon: Clock3 },
  done: { dot: 'text-green-400', chip: 'bg-green-500/20 text-green-200', icon: CheckCircle2 },
}

const makeId = () => Math.random().toString(36).slice(2, 11)
const makeAlias = () => `task_${Math.random().toString(36).slice(2, 7)}`

function parseDescriptionMeta(description: string): { dueAt?: string; links: string[] } {
  const links = Array.from(new Set(description.match(/https?:\/\/[^\s)]+/g) ?? []))

  const ymdMatch = description.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  const mdyMatch = description.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/)
  const duePhraseMatch = description.match(/due\s*[:\-]\s*([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})/i)

  const candidate = ymdMatch?.[1] ?? mdyMatch?.[1] ?? duePhraseMatch?.[1]
  if (!candidate) return { links }

  const parsed = new Date(candidate)
  if (Number.isNaN(parsed.getTime())) return { links }

  return { dueAt: parsed.toISOString(), links }
}

const initialTree: TaskNode[] = [
  {
    id: makeId(),
    alias: 'task1',
    title: 'Launch TaskTrasker v1',
    description: 'due: 2026-03-01\nSpec doc: https://tasktasker.com/spec',
    status: 'in_progress',
    labels: ['release', 'priority-high'],
    ...parseDescriptionMeta('due: 2026-03-01\nSpec doc: https://tasktasker.com/spec'),
    blockMode: 'none',
    children: [
      {
        id: makeId(),
        alias: 'task2',
        title: 'Build auth + onboarding',
        description: 'Gather login UX examples',
        status: 'todo',
        labels: ['auth'],
        links: [],
        blockMode: 'none',
        children: [],
      },
      {
        id: makeId(),
        alias: 'task3',
        title: 'Finalize task tree interactions',
        description: 'due: 03/05/2026\nReference: https://example.com/tree-patterns',
        status: 'in_progress',
        labels: ['ux'],
        ...parseDescriptionMeta('due: 03/05/2026\nReference: https://example.com/tree-patterns'),
        blockMode: 'task',
        children: [],
      },
    ],
  },
]

function flattenTasks(tree: TaskNode[]): TaskNode[] {
  return tree.flatMap((node) => [node, ...flattenTasks(node.children)])
}

function getNodeAtPath(tree: TaskNode[], path: number[]): TaskNode {
  let list = tree
  let node = tree[path[0]]
  for (let i = 0; i < path.length; i++) {
    node = list[path[i]]
    list = node.children
  }
  return node
}

function findPathById(tree: TaskNode[], id: string, path: number[] = []): number[] | null {
  for (let i = 0; i < tree.length; i++) {
    const currentPath = [...path, i]
    if (tree[i].id === id) return currentPath
    const childPath = findPathById(tree[i].children, id, currentPath)
    if (childPath) return childPath
  }
  return null
}

function updateAtPath(tree: TaskNode[], path: number[], updater: (node: TaskNode) => TaskNode): TaskNode[] {
  if (path.length === 0) return tree
  const [idx, ...rest] = path
  return tree.map((node, i) => {
    if (i !== idx) return node
    if (rest.length === 0) return updater(node)
    return { ...node, children: updateAtPath(node.children, rest, updater) }
  })
}

function removeAtPath(tree: TaskNode[], path: number[]): { tree: TaskNode[]; removed: TaskNode } {
  const [idx, ...rest] = path
  if (rest.length === 0) {
    const removed = tree[idx]
    const next = tree.filter((_, i) => i !== idx)
    return { tree: next, removed }
  }

  const node = tree[idx]
  const result = removeAtPath(node.children, rest)
  return {
    tree: tree.map((n, i) => (i === idx ? { ...n, children: result.tree } : n)),
    removed: result.removed,
  }
}

function insertAtPath(tree: TaskNode[], path: number[], nodeToInsert: TaskNode): TaskNode[] {
  if (path.length === 1) {
    const [index] = path
    return [...tree.slice(0, index), nodeToInsert, ...tree.slice(index)]
  }

  const [idx, ...rest] = path
  return tree.map((node, i) => {
    if (i !== idx) return node
    return { ...node, children: insertAtPath(node.children, rest, nodeToInsert) }
  })
}

function countNodes(tree: TaskNode[]): number {
  return tree.reduce((acc, node) => acc + 1 + countNodes(node.children), 0)
}

function evaluateExpression(expr: string, completionByAlias: Record<string, number>): { ok: boolean; message?: string } {
  const aliases = Object.keys(completionByAlias)
  let processed = expr

  for (const alias of aliases) {
    processed = processed.replace(new RegExp(`\\b${alias}\\b`, 'g'), String(completionByAlias[alias]))
  }

  const safePattern = /^[\d\s()+\-*/<>=!&|.]+$/
  if (!safePattern.test(processed)) {
    return { ok: false, message: 'Block expression has unsupported characters.' }
  }

  try {
    const result = Function(`"use strict"; return (${processed});`)()
    return { ok: Boolean(result) }
  } catch {
    return { ok: false, message: 'Invalid block expression syntax.' }
  }
}

export default function TaskTreePlayground({
  title,
  subtitle,
  persistenceKey,
}: {
  title: string
  subtitle: string
  persistenceKey?: string
}) {
  const [tasks, setTasks] = useState<TaskNode[]>(initialTree)
  const [newRootTitle, setNewRootTitle] = useState('')
  const [newChildTitle, setNewChildTitle] = useState<Record<string, string>>({})
  const [newLabel, setNewLabel] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [blockInput, setBlockInput] = useState<Record<string, string>>({})
  const [blockErrors, setBlockErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!persistenceKey || typeof window === 'undefined') return
    const raw = window.localStorage.getItem(persistenceKey)
    if (!raw) return
    try {
      setTasks(JSON.parse(raw) as TaskNode[])
    } catch {
      // ignore invalid local data
    }
  }, [persistenceKey])

  useEffect(() => {
    if (!persistenceKey || typeof window === 'undefined') return
    window.localStorage.setItem(persistenceKey, JSON.stringify(tasks))
  }, [tasks, persistenceKey])

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Element | null
      if (target?.closest('[data-ui-dropdown="true"]')) return

      document.querySelectorAll<HTMLDetailsElement>('[data-ui-dropdown="true"] details[open]').forEach((details) => {
        details.open = false
      })
    }

    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const total = useMemo(() => countNodes(tasks), [tasks])
  const flatTasks = useMemo(() => flattenTasks(tasks), [tasks])
  const completionByAlias = useMemo(
    () => Object.fromEntries(flatTasks.map((task) => [task.alias, task.status === 'done' ? 1 : 0])),
    [flatTasks]
  )

  const reminders = useMemo<ReminderItem[]>(() => {
    return flatTasks
      .filter((task) => task.dueAt && task.status !== 'done')
      .map((task) => {
        const dueAt = new Date(task.dueAt!)
        const remindAt = new Date(dueAt)
        remindAt.setDate(dueAt.getDate() - 1)
        return {
          taskId: task.id,
          taskTitle: task.title,
          dueAt: dueAt.toISOString(),
          remindAt: remindAt.toISOString(),
        }
      })
      .sort((a, b) => a.remindAt.localeCompare(b.remindAt))
  }, [flatTasks])

  const updateNodeById = (id: string, updater: (node: TaskNode) => TaskNode) => {
    const path = findPathById(tasks, id)
    if (!path) return
    setTasks((prev) => updateAtPath(prev, path, updater))
  }

  const canMarkDone = (task: TaskNode): { ok: boolean; message?: string } => {
    if (task.blockMode === 'task' && task.blockingTaskId) {
      const blocker = flatTasks.find((candidate) => candidate.id === task.blockingTaskId)
      if (!blocker) return { ok: false, message: 'Selected block task was not found.' }
      if (blocker.status !== 'done') return { ok: false, message: `Blocked until done: ${blocker.title}` }
      return { ok: true }
    }

    if (task.blockMode === 'expression' && task.blockExpression?.trim()) {
      return evaluateExpression(task.blockExpression.trim(), completionByAlias)
    }

    return { ok: true }
  }

  const applyBlockInput = (task: TaskNode) => {
    const value = (blockInput[task.id] ?? '').trim()
    if (!value) {
      updateNodeById(task.id, (node) => ({ ...node, blockMode: 'none', blockingTaskId: undefined, blockExpression: undefined }))
      setBlockErrors((prev) => ({ ...prev, [task.id]: '' }))
      return
    }

    const byTitle = flatTasks.find((candidate) => candidate.id !== task.id && candidate.title.toLowerCase() === value.toLowerCase())
    const byAlias = flatTasks.find((candidate) => candidate.id !== task.id && candidate.alias.toLowerCase() === value.toLowerCase())
    const selected = byTitle ?? byAlias

    if (selected) {
      updateNodeById(task.id, (node) => ({
        ...node,
        blockMode: 'task',
        blockingTaskId: selected.id,
        blockExpression: undefined,
      }))
      setBlockErrors((prev) => ({ ...prev, [task.id]: '' }))
      return
    }

    updateNodeById(task.id, (node) => ({
      ...node,
      blockMode: 'expression',
      blockExpression: value,
      blockingTaskId: undefined,
    }))
    setBlockErrors((prev) => ({ ...prev, [task.id]: '' }))
  }

  const updateDescription = (id: string, description: string) => {
    const meta = parseDescriptionMeta(description)
    updateNodeById(id, (node) => ({ ...node, description, ...meta }))
  }

  const addRoot = () => {
    const titleValue = newRootTitle.trim()
    if (!titleValue) return
    setTasks((prev) => [
      ...prev,
      {
        id: makeId(),
        alias: makeAlias(),
        title: titleValue,
        description: '',
        status: 'todo',
        labels: [],
        links: [],
        blockMode: 'none',
        children: [],
      },
    ])
    setNewRootTitle('')
  }

  const addChild = (id: string) => {
    const titleValue = (newChildTitle[id] ?? '').trim()
    if (!titleValue) return

    updateNodeById(id, (node) => ({
      ...node,
      children: [
        ...node.children,
        {
          id: makeId(),
          alias: makeAlias(),
          title: titleValue,
          description: '',
          status: 'todo',
          labels: [],
          links: [],
          blockMode: 'none',
          children: [],
        },
      ],
    }))

    setExpanded((prev) => ({ ...prev, [id]: true }))
    setNewChildTitle((prev) => ({ ...prev, [id]: '' }))
  }

  const addLabel = (id: string) => {
    const value = (newLabel[id] ?? '').trim().toLowerCase().replace(/\s+/g, '-')
    if (!value) return
    updateNodeById(id, (node) => ({ ...node, labels: Array.from(new Set([...node.labels, value])) }))
    setNewLabel((prev) => ({ ...prev, [id]: '' }))
  }

  const moveUp = (id: string) => {
    const path = findPathById(tasks, id)
    if (!path) return
    const index = path[path.length - 1]
    if (index === 0) return

    const removedResult = removeAtPath(tasks, path)
    const insertPath = [...path.slice(0, -1), index - 1]
    setTasks(insertAtPath(removedResult.tree, insertPath, removedResult.removed))
  }

  const moveDown = (id: string) => {
    const path = findPathById(tasks, id)
    if (!path) return
    const parentPath = path.slice(0, -1)
    const index = path[path.length - 1]
    const siblings = parentPath.length === 0 ? tasks : getNodeAtPath(tasks, parentPath).children
    if (index >= siblings.length - 1) return

    const removedResult = removeAtPath(tasks, path)
    const insertPath = [...path.slice(0, -1), index + 1]
    setTasks(insertAtPath(removedResult.tree, insertPath, removedResult.removed))
  }

  const indent = (id: string) => {
    const path = findPathById(tasks, id)
    if (!path) return
    const index = path[path.length - 1]
    if (index === 0) return

    const prevSiblingPath = [...path.slice(0, -1), index - 1]
    const removedResult = removeAtPath(tasks, path)
    setTasks(() => updateAtPath(removedResult.tree, prevSiblingPath, (node) => ({ ...node, children: [...node.children, removedResult.removed] })))
    const prevSibling = getNodeAtPath(tasks, prevSiblingPath)
    setExpanded((prev) => ({ ...prev, [prevSibling.id]: true }))
  }

  const outdent = (id: string) => {
    const path = findPathById(tasks, id)
    if (!path || path.length < 2) return

    const parentIndex = path[path.length - 2]
    const grandParentPath = path.slice(0, -2)
    const removedResult = removeAtPath(tasks, path)
    const insertPath = [...grandParentPath, parentIndex + 1]
    setTasks(insertAtPath(removedResult.tree, insertPath, removedResult.removed))
  }

  const removeNode = (id: string) => {
    const path = findPathById(tasks, id)
    if (!path) return
    setTasks(removeAtPath(tasks, path).tree)
  }

  const closeDropdown = (event: { currentTarget: EventTarget & HTMLElement }) => {
    const details = event.currentTarget.closest('details')
    if (details) details.removeAttribute('open')
  }

  const renderNode = (node: TaskNode) => {
    const isExpanded = expanded[node.id] ?? true
    const Icon = statusStyle[node.status].icon

    const setNodeStatus = (nextStatus: TaskStatus) => {
      if (nextStatus === 'done') {
        const result = canMarkDone(node)
        if (!result.ok) {
          setBlockErrors((prev) => ({ ...prev, [node.id]: result.message ?? 'Task is blocked.' }))
          return
        }
      }
      setBlockErrors((prev) => ({ ...prev, [node.id]: '' }))
      updateNodeById(node.id, (n) => ({ ...n, status: nextStatus }))
    }

    return (
      <div key={node.id} className="space-y-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => setExpanded((prev) => ({ ...prev, [node.id]: !isExpanded }))}
              className="mt-1 text-slate-400 hover:text-white"
            >
              {node.children.length > 0 ? (
                isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              ) : (
                <span className="inline-block w-4" />
              )}
            </button>

            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Icon className={`w-4 h-4 ${statusStyle[node.status].dot}`} />
                <input
                  value={node.title}
                  onChange={(e) => updateNodeById(node.id, (n) => ({ ...n, title: e.target.value }))}
                  className="flex-1 min-w-[180px] bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm"
                />
                <input
                  value={node.alias}
                  onChange={(e) => updateNodeById(node.id, (n) => ({ ...n, alias: e.target.value.trim() || n.alias }))}
                  className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs"
                  title="Variable name for block expressions"
                />
                <div className="relative flex items-center rounded border border-slate-700 bg-slate-800 text-slate-100" data-ui-dropdown="true">
                  <button type="button" className="px-2 py-1 text-xs">
                    Status: {statusOptions.find((opt) => opt.value === node.status)?.label ?? node.status}
                  </button>
                  <details className="relative">
                    <summary className="list-none cursor-pointer border-l border-slate-700 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700 hover:text-slate-100">
                      ▾
                    </summary>
                    <div className="absolute left-0 z-20 mt-1 w-40 space-y-1 rounded border border-slate-700 bg-slate-950 p-2 shadow-lg">
                      {statusOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={(event) => {
                            closeDropdown(event)
                            setNodeStatus(opt.value)
                          }}
                          className={`block w-full rounded px-2 py-1 text-left text-xs transition-colors ${
                            node.status === opt.value
                              ? 'bg-cyan-500/15 text-cyan-200'
                              : 'text-slate-200 hover:bg-slate-800 hover:text-slate-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </details>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${statusStyle[node.status].chip}`}>{node.status.replace('_', ' ')}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="md:col-span-3 space-y-2">
                  <label className="text-[11px] text-slate-400">Description</label>
                  <textarea
                    value={node.description}
                    onChange={(e) => updateDescription(node.id, e.target.value)}
                    placeholder="Description (any format). Add date like 2026-04-03 or due: March 12, 2026. Paste links to auto-pull references."
                    className="w-full min-h-24 bg-slate-800 border border-slate-700 rounded px-2 py-2 text-xs"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[11px] text-slate-400">Tags + extracted info</label>
                  <div className="min-h-24 bg-slate-800/60 border border-slate-700 rounded p-2 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {node.labels.length === 0 && <span className="text-[11px] text-slate-500">No labels yet</span>}
                      {node.labels.map((label) => (
                        <span key={label} className="text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-200">
                          {label}
                        </span>
                      ))}
                    </div>

                    {(node.dueAt || node.links.length > 0) && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {node.dueAt && (
                          <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-200 inline-flex items-center gap-1">
                            <BellRing className="w-3 h-3" /> due {new Date(node.dueAt).toLocaleDateString()}
                          </span>
                        )}
                        {node.links.map((link) => (
                          <a
                            key={link}
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-200 inline-flex items-center gap-1 hover:bg-cyan-500/30 max-w-full break-all"
                          >
                            <Link2 className="w-3 h-3" /> {link}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                <div className="flex gap-2">
                  <input
                    value={newChildTitle[node.id] ?? ''}
                    onChange={(e) => setNewChildTitle((prev) => ({ ...prev, [node.id]: e.target.value }))}
                    placeholder="Add child task"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs"
                  />
                  <button type="button" onClick={() => addChild(node.id)} className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500">
                    Add child
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    value={newLabel[node.id] ?? ''}
                    onChange={(e) => setNewLabel((prev) => ({ ...prev, [node.id]: e.target.value }))}
                    placeholder="label"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs"
                  />
                  <button type="button" onClick={() => addLabel(node.id)} className="px-2 py-1 text-xs rounded bg-cyan-600 hover:bg-cyan-500">
                    Add label
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[11px] text-slate-400">Blocks:</span>
                <input
                  list={`block-options-${node.id}`}
                  value={blockInput[node.id] ?? node.blockExpression ?? flatTasks.find((x) => x.id === node.blockingTaskId)?.title ?? ''}
                  onChange={(e) => setBlockInput((prev) => ({ ...prev, [node.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab' || e.key === 'Enter') {
                      e.preventDefault()
                      applyBlockInput(node)
                    }
                  }}
                  placeholder="Task title/alias or expression"
                  className="px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700 w-56"
                  title="Type existing task title/alias for blocker, or expression like task1 && task2 < 1"
                />
                <datalist id={`block-options-${node.id}`}>
                  {flatTasks
                    .filter((candidate) => candidate.id !== node.id)
                    .map((candidate) => (
                      <option key={candidate.id} value={candidate.title}>
                        {candidate.alias}
                      </option>
                    ))}
                </datalist>
                <button type="button" onClick={() => applyBlockInput(node)} className="px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700">
                  Apply
                </button>
                {node.blockMode !== 'none' && (
                  <button
                    type="button"
                    onClick={() => {
                      setBlockInput((prev) => ({ ...prev, [node.id]: '' }))
                      updateNodeById(node.id, (n) => ({ ...n, blockMode: 'none', blockExpression: undefined, blockingTaskId: undefined }))
                    }}
                    className="px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700"
                  >
                    Clear
                  </button>
                )}
                <span className="text-[11px] text-slate-500">Tab/Enter applies autocomplete.</span>
              </div>

              {blockErrors[node.id] && <p className="text-xs text-amber-300">{blockErrors[node.id]}</p>}

              <div className="flex flex-wrap gap-2 text-xs">
                <button type="button" onClick={() => moveUp(node.id)} className="px-2 py-1 rounded bg-slate-800 border border-slate-700">↑ Up</button>
                <button type="button" onClick={() => moveDown(node.id)} className="px-2 py-1 rounded bg-slate-800 border border-slate-700">↓ Down</button>
                <button type="button" onClick={() => indent(node.id)} className="px-2 py-1 rounded bg-slate-800 border border-slate-700">→ Nest</button>
                <button type="button" onClick={() => outdent(node.id)} className="px-2 py-1 rounded bg-slate-800 border border-slate-700">← Unnest</button>
                <button type="button" onClick={() => removeNode(node.id)} className="px-2 py-1 rounded bg-rose-600/80 hover:bg-rose-500">Delete</button>
              </div>
            </div>
          </div>
        </div>

        {isExpanded && node.children.length > 0 && <div className="ml-6 space-y-2">{node.children.map((child) => renderNode(child))}</div>}
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-slate-300 text-sm">{subtitle}</p>
        </div>
        <div className="text-xs text-slate-400">{total} total tasks</div>
      </div>

      {reminders.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="text-sm font-semibold text-amber-100 mb-2">Day-before reminders (parsed from descriptions)</div>
          <ul className="text-xs text-amber-50 space-y-1">
            {reminders.map((item) => (
              <li key={item.taskId}>
                {item.taskTitle}: remind on {new Date(item.remindAt).toLocaleDateString()} (due {new Date(item.dueAt).toLocaleDateString()})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <div className="flex gap-2">
          <input
            value={newRootTitle}
            onChange={(e) => setNewRootTitle(e.target.value)}
            placeholder="Add top-level task"
            className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
          />
          <button type="button" onClick={addRoot} className="inline-flex items-center gap-1 px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm">
            <Plus className="w-4 h-4" /> Add task
          </button>
        </div>

        <div className="space-y-2">{tasks.map((task) => renderNode(task))}</div>
      </div>
    </section>
  )
}
