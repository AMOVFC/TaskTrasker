'use client'

import { useEffect, useMemo, useState } from 'react'

import { createClient } from '../lib/supabase/client'

export type TaskRecord = {
  id: string
  user_id: string
  parent_id: string | null
  blocking_task_id: string | null
  title: string
  status: 'todo' | 'in_progress' | 'blocked' | 'delayed' | 'done'
  force_completed: boolean
  due_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

type DropPosition = 'before' | 'inside'

const statusOptions: TaskRecord['status'][] = ['todo', 'in_progress', 'blocked', 'delayed', 'done']

function parseDueDateFromDescription(description: string): string | null {
  const ymdMatch = description.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  const mdyMatch = description.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/)
  const duePhraseMatch = description.match(/due\s*[:\-]\s*([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})/i)

  const candidate = ymdMatch?.[1] ?? mdyMatch?.[1] ?? duePhraseMatch?.[1]
  if (!candidate) return null

  const parsed = new Date(candidate)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed.toISOString()
}

function formatDueDate(value: string | null): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString()
}

function orderTasks(tasks: TaskRecord[]) {
  return [...tasks].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.created_at.localeCompare(b.created_at)
  })
}

export default function PlanWorkspace({
  userId,
  initialTasks,
  mode = 'supabase',
}: {
  userId: string
  initialTasks: TaskRecord[]
  mode?: 'supabase' | 'demo'
}) {
  const [supabase, setSupabase] = useState<Awaited<ReturnType<typeof createClient>> | null>(null)
  const [tasks, setTasks] = useState<TaskRecord[]>(orderTasks(initialTasks))
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [newChildTitles, setNewChildTitles] = useState<Record<string, string>>({})
  const [descriptions, setDescriptions] = useState<Record<string, string>>({})

  useEffect(() => {
    if (mode !== 'supabase') return
    createClient()
      .then((client) => setSupabase(client))
      .catch((clientError: Error) => setError(clientError.message))
  }, [mode])

  useEffect(() => {
    setTasks(orderTasks(initialTasks))
  }, [initialTasks])

  useEffect(() => {
    setDescriptions((prev) => {
      const next = { ...prev }
      for (const task of initialTasks) {
        next[task.id] = next[task.id] ?? ''
      }
      return next
    })
  }, [initialTasks])

  useEffect(() => {
    if (!supabase || mode !== 'supabase') return

    const channel = supabase
      .channel('tasks-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        (payload: { eventType: string; new: unknown; old: unknown }) => {
          if (payload.eventType === 'INSERT') {
            const incoming = payload.new as TaskRecord
            setTasks((prev) => {
              const existing = prev.find((task) => task.id === incoming.id)
              if (existing) return prev
              return orderTasks([...prev, incoming])
            })
          }

          if (payload.eventType === 'UPDATE') {
            const incoming = payload.new as TaskRecord
            setTasks((prev) =>
              orderTasks(
                prev.map((task) => {
                  if (task.id !== incoming.id) return task
                  return new Date(incoming.updated_at) >= new Date(task.updated_at) ? incoming : task
                })
              )
            )
          }

          if (payload.eventType === 'DELETE') {
            const outgoing = payload.old as { id: string }
            setTasks((prev) => prev.filter((task) => task.id !== outgoing.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId, mode])

  const childrenByParent = useMemo(() => {
    const map: Record<string, TaskRecord[]> = {}
    for (const task of tasks) {
      const key = task.parent_id ?? 'root'
      map[key] = map[key] ?? []
      map[key].push(task)
    }

    for (const key of Object.keys(map)) {
      map[key] = orderTasks(map[key])
    }

    return map
  }, [tasks])

  const taskById = useMemo(() => Object.fromEntries(tasks.map((task) => [task.id, task])), [tasks])

  const descendantsDone = (taskId: string): boolean => {
    const children = childrenByParent[taskId] ?? []
    return children.every((child) => child.status === 'done' && descendantsDone(child.id))
  }

  const canMarkComplete = (task: TaskRecord): { ok: boolean; message?: string } => {
    if (!descendantsDone(task.id)) {
      return { ok: false, message: 'Finish all nested subtasks before completing this task.' }
    }

    if (task.blocking_task_id) {
      const blocker = taskById[task.blocking_task_id]
      if (!blocker) {
        return { ok: false, message: 'The assigned blocking task no longer exists.' }
      }

      if (blocker.status !== 'done') {
        return { ok: false, message: `This task is blocked by: ${blocker.title}` }
      }
    }

    return { ok: true }
  }

  const patchTask = async (task: TaskRecord, payload: Record<string, unknown>, fallbackMessage: string) => {
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      setError(fallbackMessage)
      return null
    }

    const result = (await response.json()) as { task: TaskRecord }
    return result.task
  }

  const updateTaskDueAt = async (taskId: string, dueAt: string | null) => {
    const task = taskById[taskId]
    if (!task || task.due_at === dueAt) return

    const previousTask = task
    const optimistic = { ...task, due_at: dueAt, updated_at: new Date().toISOString() }
    setTasks((prev) => orderTasks(prev.map((item) => (item.id === task.id ? optimistic : item))))
    setPending((prev) => ({ ...prev, [task.id]: true }))

    if (mode === 'demo') {
      setPending((prev) => ({ ...prev, [task.id]: false }))
      return
    }

    const updated = await patchTask(task, { due_at: dueAt }, 'Could not update due date.')
    if (!updated) {
      setTasks((prev) => orderTasks(prev.map((item) => (item.id === task.id ? previousTask : item))))
      setPending((prev) => ({ ...prev, [task.id]: false }))
      return
    }

    setTasks((prev) => orderTasks(prev.map((item) => (item.id === task.id ? updated : item))))
    setPending((prev) => ({ ...prev, [task.id]: false }))
  }

  const createTask = async () => {
    setError('')
    const title = newTaskTitle.trim()

    if (!title) {
      setError('Enter a task title to create a row.')
      return
    }

    const tempId = `temp-${crypto.randomUUID()}`
    const rootSortOrder = (childrenByParent.root ?? []).length
    const optimistic: TaskRecord = {
      id: tempId,
      user_id: userId,
      parent_id: null,
      blocking_task_id: null,
      title,
      status: 'todo',
      force_completed: false,
      due_at: null,
      sort_order: rootSortOrder,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setTasks((prev) => orderTasks([...prev, optimistic]))
    setPending((prev) => ({ ...prev, [tempId]: true }))
    setNewTaskTitle('')

    if (mode === 'demo') {
      setPending((prev) => ({ ...prev, [tempId]: false }))
      return
    }

    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, sort_order: rootSortOrder }),
    })

    if (!response.ok) {
      setTasks((prev) => prev.filter((task) => task.id !== tempId))
      setPending((prev) => ({ ...prev, [tempId]: false }))
      setError('Could not create task in Supabase.')
      return
    }

    const payload = (await response.json()) as { task: TaskRecord }
    setTasks((prev) => orderTasks(prev.map((task) => (task.id === tempId ? payload.task : task))))
    setPending((prev) => ({ ...prev, [tempId]: false }))
  }

  const createChildTask = async (parentTask: TaskRecord) => {
    setError('')
    const title = (newChildTitles[parentTask.id] ?? '').trim()

    if (!title) {
      setError('Enter a subtask title before adding.')
      return
    }

    const childSortOrder = (childrenByParent[parentTask.id] ?? []).length
    const tempId = `temp-${crypto.randomUUID()}`
    const optimistic: TaskRecord = {
      id: tempId,
      user_id: userId,
      parent_id: parentTask.id,
      blocking_task_id: null,
      title,
      status: 'todo',
      force_completed: false,
      due_at: null,
      sort_order: childSortOrder,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setTasks((prev) => orderTasks([...prev, optimistic]))
    setPending((prev) => ({ ...prev, [tempId]: true }))
    setNewChildTitles((prev) => ({ ...prev, [parentTask.id]: '' }))

    if (mode === 'demo') {
      setPending((prev) => ({ ...prev, [tempId]: false }))
      return
    }

    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, parent_id: parentTask.id, sort_order: childSortOrder }),
    })

    if (!response.ok) {
      setTasks((prev) => prev.filter((task) => task.id !== tempId))
      setPending((prev) => ({ ...prev, [tempId]: false }))
      setError('Could not create subtask in Supabase.')
      return
    }

    const payload = (await response.json()) as { task: TaskRecord }
    setTasks((prev) => orderTasks(prev.map((task) => (task.id === tempId ? payload.task : task))))
    setPending((prev) => ({ ...prev, [tempId]: false }))
  }

  const updateTaskStatus = async (task: TaskRecord, status: TaskRecord['status']) => {
    setError('')
    const optimistic = { ...task, status, force_completed: false, updated_at: new Date().toISOString() }

    setTasks((prev) => orderTasks(prev.map((item) => (item.id === task.id ? optimistic : item))))
    setPending((prev) => ({ ...prev, [task.id]: true }))

    if (mode === 'demo') {
      setPending((prev) => ({ ...prev, [task.id]: false }))
      return
    }

    const updated = await patchTask(task, { status, force_completed: false }, 'Could not update task status.')
    if (!updated) {
      setTasks((prev) => orderTasks(prev.map((item) => (item.id === task.id ? task : item))))
      setPending((prev) => ({ ...prev, [task.id]: false }))
      return
    }

    setTasks((prev) => orderTasks(prev.map((item) => (item.id === task.id ? updated : item))))
    setPending((prev) => ({ ...prev, [task.id]: false }))
  }

  const completeTask = async (task: TaskRecord, force: boolean) => {
    setError('')
    if (!force) {
      const completeCheck = canMarkComplete(task)
      if (!completeCheck.ok) {
        setError(completeCheck.message ?? 'This task is currently blocked.')
        return
      }
    }

    const optimistic = {
      ...task,
      status: 'done' as const,
      force_completed: force,
      updated_at: new Date().toISOString(),
    }

    setTasks((prev) => orderTasks(prev.map((item) => (item.id === task.id ? optimistic : item))))
    setPending((prev) => ({ ...prev, [task.id]: true }))

    if (mode === 'demo') {
      setPending((prev) => ({ ...prev, [task.id]: false }))
      return
    }

    const updated = await patchTask(
      task,
      { status: 'done', force_completed: force },
      force ? 'Could not force complete task.' : 'Could not complete task.'
    )

    if (!updated) {
      setTasks((prev) => orderTasks(prev.map((item) => (item.id === task.id ? task : item))))
      setPending((prev) => ({ ...prev, [task.id]: false }))
      return
    }

    setTasks((prev) => orderTasks(prev.map((item) => (item.id === task.id ? updated : item))))
    setPending((prev) => ({ ...prev, [task.id]: false }))
  }

  const moveTask = async (sourceTaskId: string, targetParentId: string | null, targetSortOrder: number) => {
    const sourceTask = taskById[sourceTaskId]
    if (!sourceTask) return

    setError('')
    const previousTasks = tasks

    const sourceSiblings = [...(childrenByParent[sourceTask.parent_id ?? 'root'] ?? [])]
      .filter((task) => task.id !== sourceTask.id)
      .map((task, index) => ({ ...task, sort_order: index }))

    const destinationSiblings = [...(childrenByParent[targetParentId ?? 'root'] ?? [])].filter(
      (task) => task.id !== sourceTask.id
    )
    const destinationIndex = Math.max(0, Math.min(targetSortOrder, destinationSiblings.length))
    const movedTask: TaskRecord = {
      ...sourceTask,
      parent_id: targetParentId,
      sort_order: destinationIndex,
      updated_at: new Date().toISOString(),
    }
    destinationSiblings.splice(destinationIndex, 0, movedTask)
    const destinationReordered = destinationSiblings.map((task, index) => ({ ...task, sort_order: index }))

    const updates = new Map<string, TaskRecord>()
    for (const task of sourceSiblings) {
      const original = taskById[task.id]
      if (original && (original.sort_order !== task.sort_order || original.parent_id !== task.parent_id)) {
        updates.set(task.id, task)
      }
    }
    for (const task of destinationReordered) {
      const original = taskById[task.id]
      if (original && (original.sort_order !== task.sort_order || original.parent_id !== task.parent_id)) {
        updates.set(task.id, task)
      }
    }

    if (updates.size === 0) {
      return
    }

    const pendingFlags = Array.from(updates.keys()).reduce<Record<string, boolean>>((acc, id) => {
      acc[id] = true
      return acc
    }, {})

    setPending((prev) => ({ ...prev, ...pendingFlags }))
    setTasks((prev) => {
      const byId = Object.fromEntries(prev.map((item) => [item.id, item])) as Record<string, TaskRecord>
      for (const [id, nextTask] of updates.entries()) {
        byId[id] = { ...byId[id], ...nextTask }
      }
      return orderTasks(Object.values(byId))
    })

    if (mode === 'demo') {
      setPending((prev) => {
        const next = { ...prev }
        for (const id of updates.keys()) {
          next[id] = false
        }
        return next
      })
      return
    }

    const results = await Promise.all(
      Array.from(updates.values()).map(async (task) => {
        const response = await fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parent_id: task.parent_id, sort_order: task.sort_order }),
        })

        if (!response.ok) {
          return { ok: false as const, id: task.id }
        }

        const payload = (await response.json()) as { task: TaskRecord }
        return { ok: true as const, task: payload.task }
      })
    )

    const failed = results.some((result) => !result.ok)
    if (failed) {
      setTasks(previousTasks)
      setError('Could not move task.')
    } else {
      const updatedTasks = results
        .filter((result): result is { ok: true; task: TaskRecord } => result.ok)
        .map((result) => result.task)
      setTasks((prev) => orderTasks(prev.map((task) => updatedTasks.find((updated) => updated.id === task.id) ?? task)))
    }

    setPending((prev) => {
      const next = { ...prev }
      for (const id of updates.keys()) {
        next[id] = false
      }
      return next
    })
  }

  const isDescendant = (candidateParentId: string, taskId: string): boolean => {
    const children = childrenByParent[taskId] ?? []
    for (const child of children) {
      if (child.id === candidateParentId || isDescendant(candidateParentId, child.id)) {
        return true
      }
    }
    return false
  }

  const onDropTask = (targetTask: TaskRecord, position: DropPosition) => {
    if (!dragTaskId || dragTaskId === targetTask.id) return

    if (position === 'inside') {
      if (isDescendant(targetTask.id, dragTaskId)) {
        setError('Cannot move a task into one of its nested children.')
        return
      }

      const siblingCount = (childrenByParent[targetTask.id] ?? []).length
      void moveTask(dragTaskId, targetTask.id, siblingCount)
      return
    }

    const siblings = childrenByParent[targetTask.parent_id ?? 'root'] ?? []
    const targetIndex = siblings.findIndex((task) => task.id === targetTask.id)
    if (targetIndex === -1) return

    void moveTask(dragTaskId, targetTask.parent_id, targetIndex)
  }

  const updateBlocker = async (task: TaskRecord, blockerId: string) => {
    setError('')
    const blockingTaskId = blockerId || null

    if (blockingTaskId && isDescendant(blockingTaskId, task.id)) {
      setError('A task cannot be blocked by one of its own subtasks.')
      return
    }

    const optimistic = { ...task, blocking_task_id: blockingTaskId, updated_at: new Date().toISOString() }

    setTasks((prev) => orderTasks(prev.map((item) => (item.id === task.id ? optimistic : item))))
    setPending((prev) => ({ ...prev, [task.id]: true }))

    if (mode === 'demo') {
      setPending((prev) => ({ ...prev, [task.id]: false }))
      return
    }

    const updated = await patchTask(task, { blocking_task_id: blockingTaskId }, 'Could not set task blocker.')
    if (!updated) {
      setTasks((prev) => orderTasks(prev.map((item) => (item.id === task.id ? task : item))))
      setPending((prev) => ({ ...prev, [task.id]: false }))
      return
    }

    setTasks((prev) => orderTasks(prev.map((item) => (item.id === task.id ? updated : item))))
    setPending((prev) => ({ ...prev, [task.id]: false }))
  }

  const deleteTask = async (task: TaskRecord) => {
    setError('')
    const previous = tasks

    setTasks((prev) => prev.filter((item) => item.id !== task.id))
    setPending((prev) => ({ ...prev, [task.id]: true }))

    if (mode === 'demo') {
      setPending((prev) => ({ ...prev, [task.id]: false }))
      return
    }

    const response = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })

    if (!response.ok) {
      setTasks(previous)
      setPending((prev) => ({ ...prev, [task.id]: false }))
      setError('Could not delete task.')
      return
    }

    setPending((prev) => ({ ...prev, [task.id]: false }))
  }

  const renderTasks = (parentId: string | null, depth = 0) => {
    const branchTasks = childrenByParent[parentId ?? 'root'] ?? []

    return branchTasks.map((task) => {
      const blockedBy = task.blocking_task_id ? taskById[task.blocking_task_id] : null
      const isDone = task.status === 'done'

      return (
        <div key={task.id} className="space-y-2">
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              onDropTask(task, 'before')
            }}
            className="h-1 rounded bg-transparent hover:bg-cyan-700/60"
          />
          <div
            draggable
            onDragStart={() => setDragTaskId(task.id)}
            onDragEnd={() => setDragTaskId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              onDropTask(task, 'inside')
            }}
            className={`rounded-lg border p-3 ${isDone ? 'border-slate-700 bg-slate-900/50' : 'border-slate-700 bg-slate-950/80'}`}
            style={{ marginLeft: `${depth * 20}px` }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className={`font-medium ${isDone ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{task.title}</p>
                <p className="text-xs text-slate-500">{task.id}</p>
                {blockedBy ? <p className="text-xs text-amber-300">Blocked by: {blockedBy.title}</p> : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={task.status}
                  onChange={(event) => updateTaskStatus(task, event.target.value as TaskRecord['status'])}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <select
                  value={task.blocking_task_id ?? ''}
                  onChange={(event) => updateBlocker(task, event.target.value)}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                >
                  <option value="">No blocker</option>
                  {tasks
                    .filter((candidate) => candidate.id !== task.id)
                    .map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.title}
                      </option>
                    ))}
                </select>
                <div className="relative flex items-center rounded border border-emerald-500/40 bg-emerald-500/5 text-emerald-300">
                  <button
                    type="button"
                    onClick={() => completeTask(task, false)}
                    className="px-2 py-1 text-xs transition-colors hover:bg-emerald-500/15 hover:text-emerald-200"
                  >
                    Done ✓
                  </button>
                  <details className="relative">
                    <summary className="list-none cursor-pointer border-l border-emerald-500/30 px-2 py-1 text-xs text-emerald-300 transition-colors hover:bg-emerald-500/15 hover:text-emerald-200">
                      ▾
                    </summary>
                    <div className="absolute right-0 z-20 mt-1 w-40 space-y-1 rounded border border-slate-700 bg-slate-950 p-2 shadow-lg">
                      <button
                        type="button"
                        onClick={() => completeTask(task, true)}
                        className="block w-full rounded px-2 py-1 text-left text-xs text-amber-300 transition-colors hover:bg-amber-500/10 hover:text-amber-200"
                      >
                        Force complete
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTask(task)}
                        className="block w-full rounded px-2 py-1 text-left text-xs text-rose-300 transition-colors hover:bg-rose-500/10 hover:text-rose-200"
                      >
                        Delete
                      </button>
                    </div>
                  </details>
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <label className="text-xs text-slate-400">Description (demo parses dates like 2026-03-01, 03/01/2026, or &quot;due: March 1, 2026&quot;)</label>
              <textarea
                value={descriptions[task.id] ?? ''}
                onChange={(event) => {
                  const value = event.target.value
                  setDescriptions((prev) => ({ ...prev, [task.id]: value }))
                  const parsedDueDate = parseDueDateFromDescription(value)
                  const currentTask = taskById[task.id]
                  if (!currentTask || currentTask.due_at === parsedDueDate) return
                  setTasks((prev) =>
                    orderTasks(
                      prev.map((item) =>
                        item.id === task.id ? { ...item, due_at: parsedDueDate, updated_at: new Date().toISOString() } : item
                      )
                    )
                  )
                }}
                onBlur={() => {
                  const parsedDueDate = parseDueDateFromDescription(descriptions[task.id] ?? '')
                  void updateTaskDueAt(task.id, parsedDueDate)
                }}
                rows={2}
                placeholder="Add details and include a due date to auto-assign."
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
              />
              <p className="text-xs text-slate-400">Due date: {formatDueDate(taskById[task.id]?.due_at) ?? 'None parsed yet'}</p>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={newChildTitles[task.id] ?? ''}
                onChange={(event) => setNewChildTitles((prev) => ({ ...prev, [task.id]: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  void createChildTask(task)
                }}
                placeholder="Add subtask"
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 sm:max-w-xs"
              />
              <button
                type="button"
                onClick={() => createChildTask(task)}
                className="rounded border border-cyan-500/40 px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-500/10"
              >
                Add subtask
              </button>
            </div>
            {task.force_completed ? <p className="mt-2 text-xs text-amber-300">Completed with override.</p> : null}
            {pending[task.id] ? <p className="mt-2 text-xs text-cyan-300">Syncing…</p> : null}
          </div>
          {renderTasks(task.id, depth + 1)}
        </div>
      )
    })
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-white">{mode === 'demo' ? 'Demo Tasks (local placeholders)' : 'Signed-in Tasks (Supabase)'}</h2>
        <p className="text-sm text-slate-400">
          Drag tasks before/inside each other, assign blockers, and complete with optional force override.
          {mode === 'demo' ? ' Changes stay in-memory for this browser session only.' : ''}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={newTaskTitle}
          onChange={(event) => setNewTaskTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            void createTask()
          }}
          placeholder="Add a task title"
          className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <button
          type="button"
          onClick={createTask}
          className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
        >
          Create task
        </button>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div
        className="rounded border border-dashed border-slate-700 p-2 text-xs text-slate-400"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          if (!dragTaskId) return
          const rootCount = (childrenByParent.root ?? []).length
          void moveTask(dragTaskId, null, rootCount)
        }}
      >
        Drop here to move a task to the root level
      </div>

      <div className="space-y-2">{renderTasks(null)}</div>
    </section>
  )
}
