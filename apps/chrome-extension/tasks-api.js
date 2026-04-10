/**
 * Task CRUD operations via Supabase client.
 *
 * Mirrors the query patterns from apps/web/lib/api/tasks-api.mjs
 * but talks to Supabase directly (no Next.js API routes needed).
 *
 * Exports via self.TaskTrasker.tasks namespace.
 */

;(function () {
  self.TaskTrasker = self.TaskTrasker || {}

  var lib = self.TaskTrasker.lib

  const TASK_SELECT_FIELDS =
    'id,user_id,parent_id,blocking_task_id,title,status,force_completed,due_at,sort_order,created_at,updated_at'

  const TASK_STATUS_VALUES = lib.TASK_STATUS_VALUES

  function sb() {
    return self.TaskTrasker.auth.getSupabase()
  }

  function user() {
    return self.TaskTrasker.auth.getUser()
  }

  /**
   * Fetch all tasks for the authenticated user.
   */
  async function fetchTasks() {
    const u = await user()
    if (!u) return { ok: false, error: 'Not authenticated.' }

    const { data, error } = await sb()
      .from('tasks')
      .select(TASK_SELECT_FIELDS)
      .eq('user_id', u.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) return { ok: false, error: error.message }
    return { ok: true, tasks: data ?? [] }
  }

  /**
   * Create a new task.
   */
  async function createTask(title, parentId, sortOrder) {
    const u = await user()
    if (!u) return { ok: false, error: 'Not authenticated.' }

    const { data, error } = await sb()
      .from('tasks')
      .insert({
        title: title.trim(),
        user_id: u.id,
        parent_id: parentId ?? null,
        sort_order: sortOrder ?? 0,
        status: 'todo',
        updated_at: new Date().toISOString(),
      })
      .select(TASK_SELECT_FIELDS)
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, task: data }
  }

  /**
   * Update a task's status.
   */
  async function updateTaskStatus(taskId, status) {
    if (!TASK_STATUS_VALUES.includes(status)) {
      return { ok: false, error: 'Invalid status: ' + status }
    }

    const u = await user()
    if (!u) return { ok: false, error: 'Not authenticated.' }

    const { data, error } = await sb()
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('user_id', u.id)
      .select(TASK_SELECT_FIELDS)
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, task: data }
  }

  /**
   * Delete a task.
   */
  async function deleteTask(taskId) {
    const u = await user()
    if (!u) return { ok: false, error: 'Not authenticated.' }

    const { error } = await sb()
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', u.id)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }

  var buildTaskTree = lib.buildTaskTree
  var countIncompleteTasks = lib.countIncompleteTasks

  // Public API
  self.TaskTrasker.tasks = {
    TASK_STATUS_VALUES,
    fetchTasks,
    createTask,
    updateTaskStatus,
    deleteTask,
    buildTaskTree,
    countIncompleteTasks,
  }
})()
