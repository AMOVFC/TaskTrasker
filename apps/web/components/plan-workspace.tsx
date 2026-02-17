'use client'

import { useEffect, useState } from 'react'

import { createClient } from '../lib/supabase/client'

export type TaskRecord = {
  id: string
  user_id: string
  parent_id: string | null
  title: string
  status: 'todo' | 'in_progress' | 'blocked' | 'delayed' | 'done'
  due_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

const statusOptions: TaskRecord['status'][] = ['todo', 'in_progress', 'blocked', 'delayed', 'done']

export default function PlanWorkspace({
  userId,
  initialTasks,
}: {
  userId: string
  initialTasks: TaskRecord[]
}) {
  const [supabase, setSupabase] = useState<Awaited<ReturnType<typeof createClient>> | null>(null)
  const [tasks, setTasks] = useState<TaskRecord[]>(initialTasks)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    createClient()
      .then((client) => setSupabase(client))
      .catch((clientError: Error) => setError(clientError.message))
  }, [])

  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  useEffect(() => {
    if (!supabase) return

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
              return [...prev, incoming]
            })
          }

          if (payload.eventType === 'UPDATE') {
            const incoming = payload.new as TaskRecord
            setTasks((prev) =>
              prev.map((task) => {
                if (task.id !== incoming.id) return task
                return new Date(incoming.updated_at) >= new Date(task.updated_at) ? incoming : task
              })
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
  }, [supabase, userId])

  const createTask = async () => {
    setError('')
    const title = newTaskTitle.trim()

    if (!title) {
      setError('Enter a task title to create a row.')
      return
    }

    const tempId = `temp-${crypto.randomUUID()}`
    const optimistic: TaskRecord = {
      id: tempId,
      user_id: userId,
      parent_id: null,
      title,
      status: 'todo',
      due_at: null,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setTasks((prev) => [...prev, optimistic])
    setPending((prev) => ({ ...prev, [tempId]: true }))
    setNewTaskTitle('')

    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })

    if (!response.ok) {
      setTasks((prev) => prev.filter((task) => task.id !== tempId))
      setPending((prev) => ({ ...prev, [tempId]: false }))
      setError('Could not create task in Supabase.')
      return
    }

    const payload = (await response.json()) as { task: TaskRecord }
    setTasks((prev) => prev.map((task) => (task.id === tempId ? payload.task : task)))
    setPending((prev) => ({ ...prev, [tempId]: false }))
  }

  const updateTaskStatus = async (task: TaskRecord, status: TaskRecord['status']) => {
    setError('')
    const optimistic = { ...task, status, updated_at: new Date().toISOString() }

    setTasks((prev) => prev.map((item) => (item.id === task.id ? optimistic : item)))
    setPending((prev) => ({ ...prev, [task.id]: true }))

    const response = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })

    if (!response.ok) {
      setTasks((prev) => prev.map((item) => (item.id === task.id ? task : item)))
      setPending((prev) => ({ ...prev, [task.id]: false }))
      setError('Could not update task status.')
      return
    }

    const payload = (await response.json()) as { task: TaskRecord }
    setTasks((prev) => prev.map((item) => (item.id === task.id ? payload.task : item)))
    setPending((prev) => ({ ...prev, [task.id]: false }))
  }

  const deleteTask = async (task: TaskRecord) => {
    setError('')
    const previous = tasks

    setTasks((prev) => prev.filter((item) => item.id !== task.id))
    setPending((prev) => ({ ...prev, [task.id]: true }))

    const response = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })

    if (!response.ok) {
      setTasks(previous)
      setPending((prev) => ({ ...prev, [task.id]: false }))
      setError('Could not delete task.')
      return
    }

    setPending((prev) => ({ ...prev, [task.id]: false }))
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Signed-in Tasks (Supabase)</h2>
        <p className="text-sm text-slate-400">
          Optimistic updates are enabled. Realtime row changes stream from Supabase and reconcile by <code>updated_at</code>.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={newTaskTitle}
          onChange={(event) => setNewTaskTitle(event.target.value)}
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

      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id} className="rounded-lg border border-slate-700 bg-slate-950/80 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-slate-100">{task.title}</p>
                <p className="text-xs text-slate-500">{task.id}</p>
              </div>

              <div className="flex items-center gap-2">
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
                <button
                  type="button"
                  onClick={() => deleteTask(task)}
                  className="rounded border border-rose-500/40 px-2 py-1 text-sm text-rose-300 hover:bg-rose-500/10"
                >
                  Delete
                </button>
              </div>
            </div>
            {pending[task.id] ? <p className="mt-2 text-xs text-cyan-300">Syncing…</p> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
