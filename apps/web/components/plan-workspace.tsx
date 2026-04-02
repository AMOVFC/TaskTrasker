'use client'

import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'

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
type WorkspaceView = 'manual' | 'upcoming' | 'calendar' | 'status_board' | 'sorted' | 'web'

const viewOptions: { id: WorkspaceView; label: string; description: string }[] = [
  {
    id: 'manual',
    label: 'Manual',
    description: 'Default drag-and-drop layout. Your custom order is preserved.',
  },
  {
    id: 'upcoming',
    label: 'Upcoming',
    description: 'Timeline-style grouping focused on what needs attention soon.',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    description: 'Monthly date grid grouped by each task due date.',
  },
  {
    id: 'status_board',
    label: 'Status board',
    description: 'Kanban-style swimlanes by status for fast progress scanning.',
  },
  {
    id: 'sorted',
    label: 'Sorted',
    description: 'Sorted by status priority: blocked, in progress, to do, delayed, done.',
  },
  {
    id: 'web',
    label: 'Web layout',
    description: 'Network-style cards that spread tasks across the page.',
  },
]

const statusOptions: TaskRecord['status'][] = ['todo', 'in_progress', 'blocked', 'delayed', 'done']

function formatStatusLabel(status: TaskRecord['status']): string {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

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

function formatDateInputValue(value: string | Date | null): string {
  if (!value) return ''
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
  const showDevDetails = process.env.NODE_ENV !== 'production'
  const [supabase, setSupabase] = useState<Awaited<ReturnType<typeof createClient>> | null>(null)
  const [tasks, setTasks] = useState<TaskRecord[]>(orderTasks(initialTasks))
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [newChildTitles, setNewChildTitles] = useState<Record<string, string>>({})
  const [descriptions, setDescriptions] = useState<Record<string, string>>({})
  const [dueDateLocked, setDueDateLocked] = useState<Record<string, boolean>>({})
  const [activeView, setActiveView] = useState<WorkspaceView>('manual')
  const [isWideScreen, setIsWideScreen] = useState(false)
  const [hideCompleted, setHideCompleted] = useState(false)
  const [completedRetentionDays, setCompletedRetentionDays] = useState<7 | 30 | 90>(30)
  const [showDeveloperMetadata, setShowDeveloperMetadata] = useState(false)
  const [groupByKeyword, setGroupByKeyword] = useState(false)
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [editingTitleValue, setEditingTitleValue] = useState('')

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
    setShowDeveloperMetadata(window.location.hostname === 'dev.tasktrasker.com')
  }, [])

  useEffect(() => {
    setDescriptions((prev) => {
      const next = { ...prev }
      for (const task of initialTasks) {
        next[task.id] = next[task.id] ?? ''
      }
      return next
    })
    setDueDateLocked((prev) => {
      const next = { ...prev }
      for (const task of initialTasks) {
        if (!(task.id in next)) next[task.id] = true
      }
      return next
    })
  }, [initialTasks])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('tasktasker-plan-active-view')
    if (stored && viewOptions.some((view) => view.id === stored)) {
      setActiveView(stored as WorkspaceView)
    }

    const storedWide = window.localStorage.getItem('tasktasker-plan-wide-screen')
    if (storedWide === 'true') {
      setIsWideScreen(true)
    }

    const storedHideCompleted = window.localStorage.getItem('tasktasker-plan-hide-completed')
    if (storedHideCompleted === 'true') {
      setHideCompleted(true)
    }

    const storedRetentionDays = window.localStorage.getItem('tasktasker-plan-retention-days')
    if (storedRetentionDays === '7' || storedRetentionDays === '30' || storedRetentionDays === '90') {
      setCompletedRetentionDays(Number(storedRetentionDays) as 7 | 30 | 90)
    }

    const storedGroupByKeyword = window.localStorage.getItem('tasktasker-plan-group-by-keyword')
    if (storedGroupByKeyword === 'true') {
      setGroupByKeyword(true)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('tasktasker-plan-active-view', activeView)
  }, [activeView])

  useEffect(() => {
    if (typeof window === 'undefined') return
    document.documentElement.dataset.planWide = isWideScreen ? 'true' : 'false'
    window.localStorage.setItem('tasktasker-plan-wide-screen', String(isWideScreen))

    return () => {
      delete document.documentElement.dataset.planWide
    }
  }, [isWideScreen])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('tasktasker-plan-hide-completed', String(hideCompleted))
  }, [hideCompleted])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('tasktasker-plan-retention-days', String(completedRetentionDays))
  }, [completedRetentionDays])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('tasktasker-plan-group-by-keyword', String(groupByKeyword))
  }, [groupByKeyword])

  useEffect(() => {
    const onMouseDown = (event: globalThis.MouseEvent) => {
      const target = event.target as Element | null
      if (target?.closest('[data-ui-dropdown="true"]')) return

      document.querySelectorAll<HTMLDetailsElement>('[data-ui-dropdown="true"] details[open]').forEach((details) => {
        details.open = false
      })
    }

    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

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

  const visibleTasks = useMemo(() => tasks.filter((task) => !hideCompleted || task.status !== 'done'), [hideCompleted, tasks])

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

  const closeDropdown = (event: ReactMouseEvent<HTMLElement>) => {
    const details = event.currentTarget.closest('details')
    if (details instanceof HTMLDetailsElement) {
      details.open = false
    }
  }

  const tasksByDueDate = useMemo(() => {
    const map: Record<string, TaskRecord[]> = {}

    for (const task of visibleTasks) {
      if (!task.due_at) continue
      const dayKey = formatDateInputValue(task.due_at)
      if (!dayKey) continue
      map[dayKey] = map[dayKey] ?? []
      map[dayKey].push(task)
    }

    for (const key of Object.keys(map)) {
      map[key] = orderTasks(map[key])
    }

    return map
  }, [visibleTasks])

  const STOP_WORDS = useMemo(
    () =>
      new Set([
        'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'is', 'it', 'this', 'that', 'from', 'as', 'be',
        'was', 'are', 'do', 'has', 'had', 'not', 'no', 'so', 'if', 'my', 'up',
        'add', 'get', 'set', 'new', 'make', 'due', 'all', 'we', 'i',
      ]),
    []
  )

  const keywordGroups = useMemo(() => {
    if (!groupByKeyword) return { groups: {} as Record<string, TaskRecord[]>, ungrouped: [] as TaskRecord[] }

    const rootTasks = (childrenByParent.root ?? []).filter((t) => !hideCompleted || t.status !== 'done')

    const freq: Record<string, number> = {}
    for (const task of rootTasks) {
      const words = task.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
      const unique = [...new Set(words)] as string[]
      for (const w of unique) {
        freq[w] = (freq[w] ?? 0) + 1
      }
    }

    const keywords = Object.entries(freq)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)

    const groups: Record<string, TaskRecord[]> = {}
    const grouped = new Set<string>()

    for (const keyword of keywords) {
      for (const task of rootTasks) {
        const titleLower = task.title.toLowerCase()
        if (titleLower.includes(keyword) && !grouped.has(task.id)) {
          groups[keyword] = groups[keyword] ?? []
          groups[keyword].push(task)
          grouped.add(task.id)
        }
      }
    }

    const ungrouped = rootTasks.filter((t) => !grouped.has(t.id))

    return { groups, ungrouped }
  }, [groupByKeyword, childrenByParent, hideCompleted, STOP_WORDS])

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

  const updateTaskTitle = async (taskId: string, newTitle: string) => {
    const task = taskById[taskId]
    const title = newTitle.trim()
    if (!task || !title || task.title === title) return

    const previousTask = task
    const parsedDueDate = parseDueDateFromDescription(title) ?? parseDueDateFromDescription(descriptions[task.id] ?? '')
    const optimistic = { ...task, title, due_at: dueDateLocked[task.id] !== false ? (parsedDueDate ?? task.due_at) : task.due_at, updated_at: new Date().toISOString() }
    setTasks((prev) => orderTasks(prev.map((item) => (item.id === task.id ? optimistic : item))))
    setPending((prev) => ({ ...prev, [task.id]: true }))

    if (mode === 'demo') {
      setPending((prev) => ({ ...prev, [task.id]: false }))
      return
    }

    const updated = await patchTask(task, { title }, 'Could not update task title.')
    if (!updated) {
      setTasks((prev) => orderTasks(prev.map((item) => (item.id === task.id ? previousTask : item))))
      setPending((prev) => ({ ...prev, [task.id]: false }))
      return
    }

    setTasks((prev) => orderTasks(prev.map((item) => (item.id === task.id ? { ...updated, due_at: optimistic.due_at } : item))))
    setPending((prev) => ({ ...prev, [task.id]: false }))

    if (dueDateLocked[task.id] !== false && parsedDueDate && updated.due_at !== parsedDueDate) {
      void updateTaskDueAt(task.id, parsedDueDate)
    }
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
    const parsedDueDate = parseDueDateFromDescription(title)
    const optimistic: TaskRecord = {
      id: tempId,
      user_id: userId,
      parent_id: null,
      blocking_task_id: null,
      title,
      status: 'todo',
      force_completed: false,
      due_at: parsedDueDate,
      sort_order: rootSortOrder,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setTasks((prev) => orderTasks([...prev, optimistic]))
    setPending((prev) => ({ ...prev, [tempId]: true }))
    setDueDateLocked((prev) => ({ ...prev, [tempId]: true }))
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
      setError(showDevDetails ? 'Could not create task in Supabase.' : 'Could not create task right now.')
      return
    }

    const payload = (await response.json()) as { task: TaskRecord }
    const createdTask = payload.task
    setTasks((prev) => orderTasks(prev.map((task) => (task.id === tempId ? createdTask : task))))
    setDueDateLocked((prev) => {
      const next = { ...prev, [createdTask.id]: true }
      delete next[tempId]
      return next
    })
    setPending((prev) => ({ ...prev, [tempId]: false }))

    if (parsedDueDate && createdTask.due_at !== parsedDueDate) {
      void updateTaskDueAt(createdTask.id, parsedDueDate)
    }
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
    const childParsedDueDate = parseDueDateFromDescription(title)
    const optimistic: TaskRecord = {
      id: tempId,
      user_id: userId,
      parent_id: parentTask.id,
      blocking_task_id: null,
      title,
      status: 'todo',
      force_completed: false,
      due_at: childParsedDueDate,
      sort_order: childSortOrder,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setTasks((prev) => orderTasks([...prev, optimistic]))
    setPending((prev) => ({ ...prev, [tempId]: true }))
    setDueDateLocked((prev) => ({ ...prev, [tempId]: true }))
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
      setError(showDevDetails ? 'Could not create subtask in Supabase.' : 'Could not create subtask right now.')
      return
    }

    const payload = (await response.json()) as { task: TaskRecord }
    const createdChild = payload.task
    setTasks((prev) => orderTasks(prev.map((task) => (task.id === tempId ? createdChild : task))))
    setDueDateLocked((prev) => {
      const next = { ...prev, [createdChild.id]: true }
      delete next[tempId]
      return next
    })
    setPending((prev) => ({ ...prev, [tempId]: false }))

    if (childParsedDueDate && createdChild.due_at !== childParsedDueDate) {
      void updateTaskDueAt(createdChild.id, childParsedDueDate)
    }
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

  const deleteTask = useCallback(async (task: TaskRecord) => {
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
  }, [mode, tasks])

  useEffect(() => {
    const now = Date.now()
    const retentionMs = completedRetentionDays * 24 * 60 * 60 * 1000
    const completedToDelete = tasks.filter((task) => {
      if (task.status !== 'done') return false
      if (pending[task.id]) return false

      const completedAt = new Date(task.updated_at).getTime()
      if (Number.isNaN(completedAt)) return false
      return now - completedAt >= retentionMs
    })

    if (!completedToDelete.length) return

    completedToDelete.forEach((task) => {
      void deleteTask(task)
    })
  }, [completedRetentionDays, deleteTask, pending, tasks])

  const renderTaskSummaryCard = (task: TaskRecord) => {
    const blockedBy = task.blocking_task_id ? taskById[task.blocking_task_id] : null
    const parsedDue = formatDueDate(task.due_at)
    return (
      <article key={task.id} className="rounded-md border border-slate-700 bg-slate-950/80 p-3 text-sm">
        <p className={`font-medium ${task.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{task.title}</p>
        <div className="mt-2 space-y-1 text-xs text-slate-400">
          <p>Status: {task.status.replace('_', ' ')}</p>
          {parsedDue ? <p>Due: {parsedDue}</p> : <p>No due date</p>}
          {blockedBy ? <p className="text-amber-300">Blocked by: {blockedBy.title}</p> : null}
        </div>
      </article>
    )
  }

  const renderUpcomingView = () => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const sevenDaysFromNow = new Date(startOfToday)
    sevenDaysFromNow.setDate(startOfToday.getDate() + 7)

    const buckets: { id: string; label: string; tasks: TaskRecord[] }[] = [
      { id: 'overdue', label: 'Overdue', tasks: [] },
      { id: 'today', label: 'Due today', tasks: [] },
      { id: 'week', label: 'Next 7 days', tasks: [] },
      { id: 'later', label: 'Later scheduled', tasks: [] },
      { id: 'unscheduled', label: 'No due date', tasks: [] },
    ]

    for (const task of visibleTasks) {
      if (!task.due_at) {
        buckets[4].tasks.push(task)
        continue
      }

      const dueDate = new Date(task.due_at)
      const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())

      if (dueDay < startOfToday) {
        buckets[0].tasks.push(task)
      } else if (dueDay.getTime() === startOfToday.getTime()) {
        buckets[1].tasks.push(task)
      } else if (dueDay <= sevenDaysFromNow) {
        buckets[2].tasks.push(task)
      } else {
        buckets[3].tasks.push(task)
      }
    }

    return (
      <div className="grid gap-3 md:grid-cols-2">
        {buckets.map((bucket) => (
          <section key={bucket.id} className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <h3 className="text-sm font-semibold text-white">{bucket.label}</h3>
            {orderTasks(bucket.tasks).length ? (
              <div className="space-y-2">{orderTasks(bucket.tasks).map((task) => renderTaskSummaryCard(task))}</div>
            ) : (
              <p className="text-xs text-slate-500">No tasks in this bucket.</p>
            )}
          </section>
        ))}
      </div>
    )
  }

  const renderCalendarView = () => {
    const datedKeys = Object.keys(tasksByDueDate).sort()
    const monthSeed = datedKeys[0] ? new Date(`${datedKeys[0]}T00:00:00`) : new Date()
    const year = monthSeed.getFullYear()
    const month = monthSeed.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const leadingBlanks = firstDay.getDay()
    const totalCells = Math.ceil((leadingBlanks + lastDay.getDate()) / 7) * 7
    const cells: Array<{ key: string; date: Date | null }> = []

    for (let index = 0; index < totalCells; index += 1) {
      const dateNumber = index - leadingBlanks + 1
      if (dateNumber < 1 || dateNumber > lastDay.getDate()) {
        cells.push({ key: `blank-${index}`, date: null })
      } else {
        cells.push({ key: `${year}-${month}-${dateNumber}`, date: new Date(year, month, dateNumber) })
      }
    }

    const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return (
      <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
        <h3 className="text-sm font-semibold text-white">
          {firstDay.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </h3>
        <div className="grid grid-cols-7 gap-2 text-center text-xs text-slate-400">
          {weekdayLabels.map((label) => (
            <p key={label}>{label}</p>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {cells.map((cell) => {
            if (!cell.date) {
              return <div key={cell.key} className="hidden rounded border border-transparent p-2 lg:block" />
            }

            const dayKey = formatDateInputValue(cell.date)
            const dayTasks = tasksByDueDate[dayKey] ?? []

            return (
              <div key={cell.key} className="min-h-24 rounded border border-slate-800 bg-slate-950/70 p-2">
                <p className="text-xs font-semibold text-slate-300">{cell.date.getDate()}</p>
                <div className="mt-1 space-y-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <p key={task.id} className="truncate rounded bg-cyan-500/10 px-1 py-0.5 text-xs text-cyan-200">
                      {task.title}
                    </p>
                  ))}
                  {dayTasks.length > 3 ? <p className="text-xs text-slate-500">+{dayTasks.length - 3} more</p> : null}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  const renderStatusBoardView = () => (
    <div className="grid gap-3 lg:grid-cols-5">
      {statusOptions.map((status) => {
        const laneTasks = orderTasks(visibleTasks.filter((task) => task.status === status))
        return (
          <section key={status} className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <h3 className="text-sm font-semibold capitalize text-white">{status.replace('_', ' ')}</h3>
            {laneTasks.length ? (
              <div className="space-y-2">{laneTasks.map((task) => renderTaskSummaryCard(task))}</div>
            ) : (
              <p className="text-xs text-slate-500">No tasks in this lane.</p>
            )}
          </section>
        )
      })}
    </div>
  )


  const renderSortedView = () => {
    const priority: Record<TaskRecord['status'], number> = {
      blocked: 0,
      in_progress: 1,
      todo: 2,
      delayed: 3,
      done: 4,
    }

    const sorted = [...visibleTasks].sort((a, b) => {
      if (priority[a.status] !== priority[b.status]) return priority[a.status] - priority[b.status]
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
      return a.created_at.localeCompare(b.created_at)
    })

    return (
      <section className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
        <h3 className="text-sm font-semibold text-white">Status priority order</h3>
        <p className="text-xs text-slate-400">Blocked → In progress → To do → Delayed → Done</p>
        <div className="space-y-2">{sorted.map((task) => renderTaskSummaryCard(task))}</div>
      </section>
    )
  }

  const renderWebLayoutView = () => {
    const rootTasks = (childrenByParent.root ?? []).filter((task) => !hideCompleted || task.status !== 'done')

    return (
      <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
        <h3 className="text-sm font-semibold text-white">Web layout</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rootTasks.map((task) => {
            const visibleChildren = (childrenByParent[task.id] ?? []).filter((child) => !hideCompleted || child.status !== 'done')
            const childCount = visibleChildren.length
            return (
              <article key={task.id} className="rounded-lg border border-cyan-500/30 bg-slate-950/80 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-cyan-100">{task.title}</p>
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">{task.status.replace('_', ' ')}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{childCount} linked subtasks</p>
                <div className="mt-2 space-y-2">
                  {visibleChildren.slice(0, 4).map((child) => (
                    <div key={child.id} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200">
                      {child.title}
                    </div>
                  ))}
                  {childCount > 4 ? <p className="text-xs text-slate-500">+{childCount - 4} more</p> : null}
                </div>
              </article>
            )
          })}
        </div>
      </section>
    )
  }

  const activeViewMeta = viewOptions.find((view) => view.id === activeView)

  const renderTasks = (parentId: string | null, depth = 0, filterIds?: Set<string>) => {
    const branchTasks = childrenByParent[parentId ?? 'root'] ?? []

    return branchTasks.filter((task) => !filterIds || filterIds.has(task.id)).map((task) => {
      const blockedBy = task.blocking_task_id ? taskById[task.blocking_task_id] : null
      const isDone = task.status === 'done'
      if (hideCompleted && isDone) return null

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
            className={`rounded-lg border ${isDone ? 'p-2' : 'p-3'} ${isDone ? 'border-slate-700 bg-slate-900/50' : 'border-slate-700 bg-slate-950/80'}`}
            style={{ marginLeft: `${depth * 20}px` }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                {editingTitleId === task.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={editingTitleValue}
                      onChange={(event) => setEditingTitleValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          void updateTaskTitle(task.id, editingTitleValue)
                          setEditingTitleId(null)
                        }
                        if (event.key === 'Escape') {
                          setEditingTitleId(null)
                        }
                      }}
                      onBlur={() => {
                        void updateTaskTitle(task.id, editingTitleValue)
                        setEditingTitleId(null)
                      }}
                      className="w-full rounded border border-cyan-500/40 bg-slate-900 px-2 py-1 text-sm font-medium text-slate-100 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
                    />
                  </div>
                ) : (
                  <p className={`font-medium ${isDone ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{task.title}</p>
                )}
                {showDeveloperMetadata ? <p className="text-xs text-slate-500">{task.id}</p> : null}
                {blockedBy ? <p className="text-xs text-amber-300">Blocked by: {blockedBy.title}</p> : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!isDone ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTitleId(task.id)
                      setEditingTitleValue(task.title)
                    }}
                    title="Edit title"
                    className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
                  >
                    Edit
                  </button>
                ) : null}
                <div className="relative flex items-center rounded border border-slate-700 bg-slate-950 text-slate-100" data-ui-dropdown="true">
                  <button type="button" className="px-2 py-1 text-xs">
                    Status: {formatStatusLabel(task.status)}
                  </button>
                  <details>
                    <summary className="list-none cursor-pointer border-l border-slate-700 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100">
                      ▾
                    </summary>
                  <div className="absolute left-0 z-20 mt-1 w-40 space-y-1 rounded border border-slate-700 bg-slate-950 p-2 shadow-lg">
                    {statusOptions.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={(event) => {
                          closeDropdown(event)
                          void updateTaskStatus(task, status)
                        }}
                        className={`block w-full rounded px-2 py-1 text-left text-xs transition-colors ${
                          task.status === status
                            ? 'bg-cyan-500/15 text-cyan-200'
                            : 'text-slate-200 hover:bg-slate-800 hover:text-slate-100'
                        }`}
                      >
                        {formatStatusLabel(status)}
                      </button>
                    ))}
                  </div>
                  </details>
                </div>
                <div className="relative flex items-center rounded border border-slate-700 bg-slate-950 text-slate-100" data-ui-dropdown="true">
                  <button type="button" className="max-w-40 truncate px-2 py-1 text-xs" title={blockedBy ? blockedBy.title : 'None'}>
                    Blocker: {blockedBy ? blockedBy.title : 'None'}
                  </button>
                  <details>
                    <summary className="list-none cursor-pointer border-l border-slate-700 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100">
                      ▾
                    </summary>
                  <div className="absolute left-0 z-20 mt-1 max-h-60 w-56 space-y-1 overflow-auto rounded border border-slate-700 bg-slate-950 p-2 shadow-lg">
                    <button
                      type="button"
                      onClick={(event) => {
                        closeDropdown(event)
                        void updateBlocker(task, '')
                      }}
                      className={`block w-full rounded px-2 py-1 text-left text-xs transition-colors ${
                        task.blocking_task_id
                          ? 'text-slate-200 hover:bg-slate-800 hover:text-slate-100'
                          : 'bg-cyan-500/15 text-cyan-200'
                      }`}
                    >
                      No blocker
                    </button>
                    {tasks
                      .filter((candidate) => candidate.id !== task.id)
                      .map((candidate) => (
                        <button
                          key={candidate.id}
                          type="button"
                          onClick={(event) => {
                          closeDropdown(event)
                          void updateBlocker(task, candidate.id)
                        }}
                          className={`block w-full rounded px-2 py-1 text-left text-xs transition-colors ${
                            task.blocking_task_id === candidate.id
                              ? 'bg-cyan-500/15 text-cyan-200'
                              : 'text-slate-200 hover:bg-slate-800 hover:text-slate-100'
                          }`}
                        >
                          {candidate.title}
                        </button>
                      ))}
                  </div>
                  </details>
                </div>
                <div className="relative flex items-center rounded border border-emerald-500/40 bg-emerald-500/5 text-emerald-300" data-ui-dropdown="true">
                  <button
                    type="button"
                    onClick={() => completeTask(task, false)}
                    className="px-2 py-1 text-xs transition-colors hover:bg-emerald-500/15 hover:text-emerald-200"
                  >
                    Done ✓
                  </button>
                  <details>
                    <summary className="list-none cursor-pointer px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
                      ▾
                    </summary>
                  <div className="absolute left-0 z-20 mt-1 w-40 space-y-1 rounded border border-slate-700 bg-slate-950 p-2 shadow-lg">
                    <button
                      type="button"
                      onClick={(event) => {
                        closeDropdown(event)
                        void completeTask(task, true)
                      }}
                      className="block w-full rounded px-2 py-1 text-left text-xs text-amber-300 transition-colors hover:bg-amber-500/10 hover:text-amber-200"
                    >
                      Force complete
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        closeDropdown(event)
                        void deleteTask(task)
                      }}
                      className="block w-full rounded px-2 py-1 text-left text-xs text-rose-300 transition-colors hover:bg-rose-500/10 hover:text-rose-200"
                    >
                      Delete
                    </button>
                  </div>
                  </details>
                </div>
              </div>
            </div>
            {!isDone ? (
              <>
                <div className="mt-3 space-y-2">
                  <label className="text-xs text-slate-400">
                    {showDeveloperMetadata
                      ? "Description (parses dates like 2026-03-01, 03/01/2026, or \"due: March 1, 2026\")"
                      : "Description"}
                  </label>
                  <textarea
                    value={descriptions[task.id] ?? ''}
                    onChange={(event) => {
                      const value = event.target.value
                      setDescriptions((prev) => ({ ...prev, [task.id]: value }))
                      if (dueDateLocked[task.id] === false) return
                      const currentTask = taskById[task.id]
                      if (!currentTask) return
                      const parsedDueDate = parseDueDateFromDescription(currentTask.title + ' ' + value)
                      if (currentTask.due_at === parsedDueDate) return
                      setTasks((prev) =>
                        orderTasks(
                          prev.map((item) =>
                            item.id === task.id ? { ...item, due_at: parsedDueDate, updated_at: new Date().toISOString() } : item
                          )
                        )
                      )
                    }}
                    onBlur={() => {
                      if (dueDateLocked[task.id] === false) return
                      const currentTask = taskById[task.id]
                      const combined = (currentTask?.title ?? '') + ' ' + (descriptions[task.id] ?? '')
                      const parsedDueDate = parseDueDateFromDescription(combined)
                      void updateTaskDueAt(task.id, parsedDueDate)
                    }}
                    rows={2}
                    placeholder="Add details and include a due date to auto-assign."
                    className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Due date</span>
                      <button
                        type="button"
                        onClick={() => setDueDateLocked((prev) => ({ ...prev, [task.id]: !prev[task.id] }))}
                        title={dueDateLocked[task.id] !== false ? 'Unlock to edit due date' : 'Lock due date'}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
                          dueDateLocked[task.id] !== false
                            ? 'border-slate-600 bg-slate-700'
                            : 'border-cyan-500/40 bg-cyan-500/20'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full transition-transform ${
                            dueDateLocked[task.id] !== false
                              ? 'translate-x-0.5 bg-slate-400'
                              : 'translate-x-[18px] bg-cyan-400'
                          }`}
                        />
                      </button>
                      <span className="text-xs text-slate-500">
                        {dueDateLocked[task.id] !== false ? 'Locked' : 'Unlocked'}
                      </span>
                    </div>
                    {dueDateLocked[task.id] !== false ? (
                      <span className="text-xs text-slate-400">
                        {formatDueDate(taskById[task.id]?.due_at) ?? 'No due date'}
                      </span>
                    ) : (
                      <input
                        type="date"
                        value={formatDateInputValue(taskById[task.id]?.due_at)}
                        onChange={(event) => {
                          const value = event.target.value
                          const dueAt = value ? new Date(value + 'T00:00:00').toISOString() : null
                          void updateTaskDueAt(task.id, dueAt)
                        }}
                        className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-slate-100"
                      />
                    )}
                  </div>
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
              </>
            ) : null}
            {task.force_completed ? <p className="mt-2 text-xs text-amber-300">Completed with override.</p> : null}
            {pending[task.id] ? <p className="mt-2 text-xs text-cyan-300">Syncing…</p> : null}
          </div>
          {renderTasks(task.id, depth + 1)}
        </div>
      )
    })
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-white">
          {mode === 'demo'
            ? 'Demo Tasks (local placeholders)'
            : showDevDetails
              ? 'Signed-in Tasks (Supabase)'
              : 'Signed-in Tasks'}
        </h2>
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

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex items-center rounded border border-slate-700 bg-slate-950/80 text-slate-200" data-ui-dropdown="true">
          <button type="button" className="px-2 py-1 text-xs transition-colors hover:bg-slate-800 hover:text-white">
            View: {activeViewMeta?.label ?? 'Manual'}
          </button>
          <details>
            <summary className="list-none cursor-pointer px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
              ▾
            </summary>
            <div className="absolute left-0 z-20 mt-1 w-48 space-y-1 rounded border border-slate-700 bg-slate-950 p-2 shadow-lg">
              {viewOptions.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setActiveView(view.id)}
                  title={view.description}
                  className={`block w-full rounded px-2 py-1 text-left text-xs transition-colors ${
                    view.id === activeView
                      ? 'bg-cyan-500/10 text-cyan-200'
                      : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </details>
          <button
            type="button"
            onClick={() => setIsWideScreen((prev) => !prev)}
            title={isWideScreen ? 'Exit wide screen' : 'Enter wide screen'}
            aria-label={isWideScreen ? 'Exit wide screen' : 'Enter wide screen'}
            className="border-l border-slate-700 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            {isWideScreen ? '[×]' : '[ ]'}
          </button>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2 text-xs text-slate-200">
          <label className="flex h-7 cursor-pointer items-center gap-1.5 rounded border border-slate-700 bg-slate-950/80 px-2 text-slate-200 transition-colors hover:bg-slate-800 hover:text-white">
            <span>Hide completed</span>
            <button
              type="button"
              role="switch"
              aria-checked={hideCompleted}
              onClick={() => setHideCompleted((prev) => !prev)}
              className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                hideCompleted ? 'bg-cyan-500/40' : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 rounded-full transition-transform ${
                  hideCompleted ? 'translate-x-3.5 bg-cyan-400' : 'translate-x-0.5 bg-slate-400'
                }`}
              />
            </button>
          </label>
          <label className="flex h-7 items-center gap-1.5 rounded border border-slate-700 bg-slate-950/80 px-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
            <span>Delete after</span>
            <select
              value={completedRetentionDays}
              onChange={(event) => setCompletedRetentionDays(Number(event.target.value) as 7 | 30 | 90)}
              className="h-5 rounded border border-slate-700 bg-slate-950 px-1.5 text-xs text-slate-100"
              aria-label="Auto-delete completed tasks after"
            >
              <option value={7}>7d</option>
              <option value={30}>30d</option>
              <option value={90}>90d</option>
            </select>
          </label>
          <label className="flex h-7 cursor-pointer items-center gap-1.5 rounded border border-slate-700 bg-slate-950/80 px-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
            <span>Group by keyword</span>
            <button
              type="button"
              role="switch"
              aria-checked={groupByKeyword}
              onClick={() => setGroupByKeyword((prev) => !prev)}
              className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                groupByKeyword ? 'bg-cyan-500/40' : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 rounded-full transition-transform ${
                  groupByKeyword ? 'translate-x-3.5 bg-cyan-400' : 'translate-x-0.5 bg-slate-400'
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Manual drag-and-drop positions stay saved to each task, and you can switch between views anytime without losing layout.
      </p>

      {activeView === 'manual' ? (
        <>
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
          {groupByKeyword && Object.keys(keywordGroups.groups).length > 0 ? (
            <div className="space-y-4">
              {(Object.entries(keywordGroups.groups) as [string, TaskRecord[]][]).map(([keyword, groupTasks]) => {
                const ids = new Set(groupTasks.map((t) => t.id))
                return (
                  <div key={keyword} className="space-y-2">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-slate-300">
                      <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-300">{keyword}</span>
                      <span className="text-xs text-slate-500">{groupTasks.length} task{groupTasks.length === 1 ? '' : 's'}</span>
                    </h3>
                    <div className="space-y-2 border-l-2 border-cyan-500/20 pl-3">
                      {renderTasks(null, 0, ids)}
                    </div>
                  </div>
                )
              })}
              {keywordGroups.ungrouped.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <span className="rounded bg-slate-700/50 px-2 py-0.5 text-xs text-slate-400">Other</span>
                    <span className="text-xs text-slate-500">{keywordGroups.ungrouped.length} task{keywordGroups.ungrouped.length === 1 ? '' : 's'}</span>
                  </h3>
                  <div className="space-y-2 border-l-2 border-slate-700/50 pl-3">
                    {renderTasks(null, 0, new Set(keywordGroups.ungrouped.map((t) => t.id)))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">{renderTasks(null)}</div>
          )}
        </>
      ) : null}

      {activeView === 'upcoming' ? renderUpcomingView() : null}
      {activeView === 'calendar' ? renderCalendarView() : null}
      {activeView === 'status_board' ? renderStatusBoardView() : null}
      {activeView === 'sorted' ? renderSortedView() : null}
      {activeView === 'web' ? renderWebLayoutView() : null}
    </section>
  )
}
