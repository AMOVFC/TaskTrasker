export const TASK_SELECT_FIELDS =
  'id,user_id,parent_id,title,status,due_at,sort_order,created_at,updated_at'

export const TASK_STATUS_VALUES = Object.freeze(['todo', 'in_progress', 'blocked', 'delayed', 'done'])

function buildError(code, message, details) {
  const payload = { code, message }
  if (details && Object.keys(details).length > 0) {
    payload.details = details
  }
  return payload
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isUuid(value) {
  if (typeof value !== 'string') {
    return false
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function normalizeIsoDate(value) {
  if (typeof value !== 'string') {
    return null
  }

  const isoCandidate = value.trim()
  if (!isoCandidate) {
    return null
  }

  const timestamp = Date.parse(isoCandidate)
  if (Number.isNaN(timestamp)) {
    return null
  }

  return new Date(timestamp).toISOString()
}

function mapDatabaseError(error, fallbackCode, fallbackMessage) {
  const code = typeof error?.code === 'string' ? error.code : null
  const knownConstraintCodes = new Set(['22P02', '23502', '23503', '23514'])

  if (code && knownConstraintCodes.has(code)) {
    return {
      status: 400,
      error: buildError('invalid_request', 'Request data violates database constraints.'),
      cause: error?.message ?? null,
    }
  }

  return {
    status: 500,
    error: buildError(fallbackCode, fallbackMessage),
    cause: error?.message ?? null,
  }
}

export function requireAuthenticatedUser(authResult) {
  const authErrorMessage = authResult?.error?.message ?? null
  const user = authResult?.data?.user ?? null

  if (!user) {
    return {
      ok: false,
      status: 401,
      error: buildError('unauthorized', 'Authentication is required.'),
      cause: authErrorMessage,
    }
  }

  return { ok: true, user }
}

export async function parseRequestJson(request) {
  try {
    const data = await request.json()
    return { ok: true, data }
  } catch {
    return {
      ok: false,
      status: 400,
      error: buildError('invalid_json', 'Request body must be valid JSON.'),
    }
  }
}

export function validateTaskId(taskId) {
  if (!isUuid(taskId)) {
    return {
      ok: false,
      status: 400,
      error: buildError('invalid_task_id', 'Task id must be a valid UUID.'),
    }
  }

  return { ok: true }
}

export function validateCreateTaskPayload(payload) {
  if (!isPlainObject(payload)) {
    return {
      ok: false,
      status: 400,
      error: buildError('invalid_payload', 'Payload must be a JSON object.'),
    }
  }

  const rawTitle = payload.title
  const title = typeof rawTitle === 'string' ? rawTitle.trim() : ''

  if (!title) {
    return {
      ok: false,
      status: 400,
      error: buildError('invalid_title', 'Task title is required.'),
    }
  }

  const parentId = payload.parent_id

  if (!(parentId === undefined || parentId === null || isUuid(parentId))) {
    return {
      ok: false,
      status: 400,
      error: buildError('invalid_parent_id', 'parent_id must be null or a valid UUID.'),
    }
  }

  return {
    ok: true,
    value: {
      title,
      parent_id: parentId ?? null,
    },
  }
}

export function validatePatchTaskPayload(payload) {
  if (!isPlainObject(payload)) {
    return {
      ok: false,
      status: 400,
      error: buildError('invalid_payload', 'Payload must be a JSON object.'),
    }
  }

  const allowedKeys = new Set(['title', 'status', 'due_at'])
  const payloadKeys = Object.keys(payload)
  const unknownKeys = payloadKeys.filter((key) => !allowedKeys.has(key))

  if (unknownKeys.length > 0) {
    return {
      ok: false,
      status: 400,
      error: buildError('unknown_fields', 'Payload includes unsupported fields.', {
        unknown_fields: unknownKeys,
      }),
    }
  }

  const value = {}

  if ('title' in payload) {
    if (typeof payload.title !== 'string') {
      return {
        ok: false,
        status: 400,
        error: buildError('invalid_title', 'title must be a non-empty string.'),
      }
    }

    const title = payload.title.trim()
    if (!title) {
      return {
        ok: false,
        status: 400,
        error: buildError('invalid_title', 'title must be a non-empty string.'),
      }
    }

    value.title = title
  }

  if ('status' in payload) {
    if (typeof payload.status !== 'string' || !TASK_STATUS_VALUES.includes(payload.status)) {
      return {
        ok: false,
        status: 400,
        error: buildError('invalid_status', 'status must be one of the supported task states.', {
          allowed_statuses: TASK_STATUS_VALUES,
        }),
      }
    }

    value.status = payload.status
  }

  if ('due_at' in payload) {
    if (payload.due_at === null) {
      value.due_at = null
    } else {
      const isoValue = normalizeIsoDate(payload.due_at)
      if (!isoValue) {
        return {
          ok: false,
          status: 400,
          error: buildError('invalid_due_at', 'due_at must be null or a valid date-time string.'),
        }
      }

      value.due_at = isoValue
    }
  }

  if (Object.keys(value).length === 0) {
    return {
      ok: false,
      status: 400,
      error: buildError('empty_patch', 'At least one updatable field is required.'),
    }
  }

  return { ok: true, value }
}

export async function fetchTasksForUser(supabase, userId) {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT_FIELDS)
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    return {
      ok: false,
      ...mapDatabaseError(error, 'tasks_fetch_failed', 'Unable to fetch tasks.'),
    }
  }

  return { ok: true, tasks: data ?? [] }
}

export async function createTaskForUser(supabase, userId, payload, nowIso) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: payload.title,
      user_id: userId,
      parent_id: payload.parent_id,
      status: 'todo',
      updated_at: nowIso,
    })
    .select(TASK_SELECT_FIELDS)
    .single()

  if (error) {
    return {
      ok: false,
      ...mapDatabaseError(error, 'task_create_failed', 'Unable to create task.'),
    }
  }

  return { ok: true, task: data }
}

export async function patchTaskForUser(supabase, userId, taskId, patchPayload, nowIso) {
  const update = {
    ...patchPayload,
    updated_at: nowIso,
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(update)
    .eq('id', taskId)
    .eq('user_id', userId)
    .select(TASK_SELECT_FIELDS)
    .single()

  if (error) {
    return {
      ok: false,
      ...mapDatabaseError(error, 'task_update_failed', 'Unable to update task.'),
    }
  }

  return { ok: true, task: data }
}

export async function deleteTaskForUser(supabase, userId, taskId) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', userId)

  if (error) {
    return {
      ok: false,
      ...mapDatabaseError(error, 'task_delete_failed', 'Unable to delete task.'),
    }
  }

  return { ok: true }
}
