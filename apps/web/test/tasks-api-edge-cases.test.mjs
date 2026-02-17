import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createTaskForUser,
  deleteTaskForUser,
  fetchTasksForUser,
  parseRequestJson,
  patchTaskForUser,
  requireAuthenticatedUser,
  validateCreateTaskPayload,
  validatePatchTaskPayload,
  validateTaskId,
} from '../lib/api/tasks-api.mjs'

function makeFetchSupabase({ data, error }) {
  const query = {
    data,
    error,
    select() {
      return this
    },
    eq() {
      return this
    },
    order() {
      return this
    },
  }

  return {
    client: {
      from() {
        return query
      },
    },
  }
}

function makeCreateSupabase({ data, error }) {
  return {
    client: {
      from() {
        return {
          insert() {
            return {
              select() {
                return {
                  async single() {
                    return { data, error }
                  },
                }
              },
            }
          },
        }
      },
    },
  }
}

function makePatchSupabase({ data, error }) {
  return {
    client: {
      from() {
        return {
          update() {
            return {
              eq() {
                return this
              },
              select() {
                return {
                  async single() {
                    return { data, error }
                  },
                }
              },
            }
          },
        }
      },
    },
  }
}

function makeDeleteSupabase({ error }) {
  return {
    client: {
      from() {
        return {
          delete() {
            return {
              eq() {
                return this
              },
              error,
            }
          },
        }
      },
    },
  }
}

test('requireAuthenticatedUser returns user when present even with auth warnings', () => {
  const user = { id: '17b7fca8-4021-4f44-8fd2-3f2f6386035c' }
  const result = requireAuthenticatedUser({ data: { user }, error: { message: 'token refresh warning' } })
  assert.equal(result.ok, true)
  assert.deepEqual(result.user, user)
})

test('parseRequestJson returns parsed payload for valid json bodies', async () => {
  const request = new Request('http://localhost/api/tasks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Task from client' }),
  })

  const parsed = await parseRequestJson(request)
  assert.equal(parsed.ok, true)
  assert.deepEqual(parsed.data, { title: 'Task from client' })
})

test('validateTaskId accepts RFC4122 UUIDs and rejects invalid ids', () => {
  assert.equal(validateTaskId('6f9e22bc-184a-4b8e-98c2-f6542f8f4d05').ok, true)

  const invalid = validateTaskId('not-a-uuid')
  assert.equal(invalid.ok, false)
  assert.equal(invalid.status, 400)
  assert.equal(invalid.error.code, 'invalid_task_id')
})

test('validateCreateTaskPayload enforces object/parent id constraints', () => {
  const invalidShape = validateCreateTaskPayload(['bad'])
  assert.equal(invalidShape.ok, false)
  assert.equal(invalidShape.error.code, 'invalid_payload')

  const invalidParent = validateCreateTaskPayload({
    title: 'Task',
    parent_id: 'non-uuid-parent-id',
  })
  assert.equal(invalidParent.ok, false)
  assert.equal(invalidParent.error.code, 'invalid_parent_id')
})

test('validatePatchTaskPayload handles unknown fields and empty patches', () => {
  const unknownFields = validatePatchTaskPayload({ title: 'x', priority: 'high' })
  assert.equal(unknownFields.ok, false)
  assert.equal(unknownFields.error.code, 'unknown_fields')
  assert.deepEqual(unknownFields.error.details, { unknown_fields: ['priority'] })

  const emptyPatch = validatePatchTaskPayload({})
  assert.equal(emptyPatch.ok, false)
  assert.equal(emptyPatch.error.code, 'empty_patch')
})

test('validatePatchTaskPayload normalizes due dates to ISO strings', () => {
  const patched = validatePatchTaskPayload({ due_at: '2026-03-20 09:30:00Z' })
  assert.equal(patched.ok, true)
  assert.equal(patched.value.due_at, '2026-03-20T09:30:00.000Z')
})

test('fetch/create/patch/delete operations map database constraint errors to 400 responses', async () => {
  const dbError = { code: '23514', message: 'check constraint violation' }

  const fetchResult = await fetchTasksForUser(makeFetchSupabase({ data: null, error: dbError }).client, 'user-id')
  assert.equal(fetchResult.ok, false)
  assert.equal(fetchResult.status, 400)
  assert.equal(fetchResult.error.code, 'invalid_request')

  const createResult = await createTaskForUser(
    makeCreateSupabase({ data: null, error: dbError }).client,
    'user-id',
    { title: 'Task', parent_id: null },
    '2026-02-16T00:00:00.000Z',
  )
  assert.equal(createResult.ok, false)
  assert.equal(createResult.status, 400)
  assert.equal(createResult.error.code, 'invalid_request')

  const patchResult = await patchTaskForUser(
    makePatchSupabase({ data: null, error: dbError }).client,
    'user-id',
    '6f9e22bc-184a-4b8e-98c2-f6542f8f4d05',
    { title: 'Task 2' },
    '2026-02-16T00:00:00.000Z',
  )
  assert.equal(patchResult.ok, false)
  assert.equal(patchResult.status, 400)
  assert.equal(patchResult.error.code, 'invalid_request')

  const deleteResult = await deleteTaskForUser(
    makeDeleteSupabase({ error: dbError }).client,
    'user-id',
    '6f9e22bc-184a-4b8e-98c2-f6542f8f4d05',
  )
  assert.equal(deleteResult.ok, false)
  assert.equal(deleteResult.status, 400)
  assert.equal(deleteResult.error.code, 'invalid_request')
})

test('database unknown errors map to operation-specific 500 codes', async () => {
  const dbError = { code: 'XX000', message: 'unexpected failure' }

  const fetchResult = await fetchTasksForUser(makeFetchSupabase({ data: null, error: dbError }).client, 'user-id')
  assert.equal(fetchResult.ok, false)
  assert.equal(fetchResult.status, 500)
  assert.equal(fetchResult.error.code, 'tasks_fetch_failed')

  const createResult = await createTaskForUser(
    makeCreateSupabase({ data: null, error: dbError }).client,
    'user-id',
    { title: 'Task', parent_id: null },
    '2026-02-16T00:00:00.000Z',
  )
  assert.equal(createResult.ok, false)
  assert.equal(createResult.status, 500)
  assert.equal(createResult.error.code, 'task_create_failed')

  const patchResult = await patchTaskForUser(
    makePatchSupabase({ data: null, error: dbError }).client,
    'user-id',
    '6f9e22bc-184a-4b8e-98c2-f6542f8f4d05',
    { title: 'Task 2' },
    '2026-02-16T00:00:00.000Z',
  )
  assert.equal(patchResult.ok, false)
  assert.equal(patchResult.status, 500)
  assert.equal(patchResult.error.code, 'task_update_failed')

  const deleteResult = await deleteTaskForUser(
    makeDeleteSupabase({ error: dbError }).client,
    'user-id',
    '6f9e22bc-184a-4b8e-98c2-f6542f8f4d05',
  )
  assert.equal(deleteResult.ok, false)
  assert.equal(deleteResult.status, 500)
  assert.equal(deleteResult.error.code, 'task_delete_failed')
})
