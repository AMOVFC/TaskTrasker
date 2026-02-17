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
} from '../lib/api/tasks-api.mjs'

function makeFetchSupabase({ data, error }) {
  const calls = []
  const query = {
    data,
    error,
    select(fields) {
      calls.push(['select', fields])
      return this
    },
    eq(column, value) {
      calls.push(['eq', column, value])
      return this
    },
    order(column, options) {
      calls.push(['order', column, options])
      return this
    },
  }

  return {
    calls,
    client: {
      from(table) {
        calls.push(['from', table])
        return query
      },
    },
  }
}

function makeCreateSupabase({ data, error }) {
  const calls = []

  return {
    calls,
    client: {
      from(table) {
        calls.push(['from', table])
        return {
          insert(payload) {
            calls.push(['insert', payload])
            return {
              select(fields) {
                calls.push(['select', fields])
                return {
                  async single() {
                    calls.push(['single'])
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
  const calls = []
  const updateQuery = {
    eq(column, value) {
      calls.push(['eq', column, value])
      return this
    },
    select(fields) {
      calls.push(['select', fields])
      return {
        async single() {
          calls.push(['single'])
          return { data, error }
        },
      }
    },
  }

  return {
    calls,
    client: {
      from(table) {
        calls.push(['from', table])
        return {
          update(payload) {
            calls.push(['update', payload])
            return updateQuery
          },
        }
      },
    },
  }
}

function makeDeleteSupabase({ error }) {
  const calls = []
  const deleteQuery = {
    error,
    eq(column, value) {
      calls.push(['eq', column, value])
      return this
    },
  }

  return {
    calls,
    client: {
      from(table) {
        calls.push(['from', table])
        return {
          delete() {
            calls.push(['delete'])
            return deleteQuery
          },
        }
      },
    },
  }
}

test('requireAuthenticatedUser returns 401 payload when session user is missing', () => {
  const result = requireAuthenticatedUser({ data: { user: null }, error: null })
  assert.equal(result.ok, false)
  assert.equal(result.status, 401)
  assert.equal(result.error.code, 'unauthorized')
})

test('parseRequestJson returns 400 payload for malformed JSON bodies', async () => {
  const request = new Request('http://localhost/api/tasks', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: '{"status":',
  })

  const parsed = await parseRequestJson(request)
  assert.equal(parsed.ok, false)
  assert.equal(parsed.status, 400)
  assert.equal(parsed.error.code, 'invalid_json')
})

test('POST-style validation and insert flow succeeds for valid payloads', async () => {
  const validation = validateCreateTaskPayload({
    title: '  Ship MVP  ',
    parent_id: null,
  })
  assert.equal(validation.ok, true)

  const createdTask = {
    id: '4e6a9625-6527-4af3-bf39-4987f1da9f8b',
    user_id: '2de8d35e-4bb0-4d5c-bb03-52ec5475d7e8',
    parent_id: null,
    title: 'Ship MVP',
    status: 'todo',
    due_at: null,
    sort_order: 0,
    created_at: '2026-02-15T12:00:00.000Z',
    updated_at: '2026-02-15T12:00:00.000Z',
  }
  const { calls, client } = makeCreateSupabase({ data: createdTask, error: null })

  const result = await createTaskForUser(
    client,
    '2de8d35e-4bb0-4d5c-bb03-52ec5475d7e8',
    validation.value,
    '2026-02-15T12:00:00.000Z',
  )

  assert.equal(result.ok, true)
  assert.deepEqual(result.task, createdTask)

  const insertPayload = calls.find((call) => call[0] === 'insert')?.[1]
  assert.equal(insertPayload.title, 'Ship MVP')
  assert.equal(insertPayload.user_id, '2de8d35e-4bb0-4d5c-bb03-52ec5475d7e8')
})

test('PATCH-style validation and update flow succeeds for valid status changes', async () => {
  const validation = validatePatchTaskPayload({ status: 'done' })
  assert.equal(validation.ok, true)

  const updatedTask = {
    id: '7a95bf04-e8c0-49f8-a4e7-c00d8133154a',
    user_id: '94e3e838-121f-407b-bcf1-e7f43e4d5f4f',
    parent_id: null,
    title: 'Ship MVP',
    status: 'done',
    due_at: null,
    sort_order: 0,
    created_at: '2026-02-15T12:00:00.000Z',
    updated_at: '2026-02-15T12:30:00.000Z',
  }
  const { calls, client } = makePatchSupabase({ data: updatedTask, error: null })

  const result = await patchTaskForUser(
    client,
    '94e3e838-121f-407b-bcf1-e7f43e4d5f4f',
    '7a95bf04-e8c0-49f8-a4e7-c00d8133154a',
    validation.value,
    '2026-02-15T12:30:00.000Z',
  )

  assert.equal(result.ok, true)
  assert.deepEqual(result.task, updatedTask)
  assert.equal(
    calls.some((call) => call[0] === 'eq' && call[1] === 'user_id' && call[2] === '94e3e838-121f-407b-bcf1-e7f43e4d5f4f'),
    true,
  )
})

test('DELETE flow scopes deletion to the authenticated user', async () => {
  const { calls, client } = makeDeleteSupabase({ error: null })
  const result = await deleteTaskForUser(
    client,
    '6c0f95f2-eb22-4e4d-8edf-f0f3ba6d017a',
    'df4de9de-2f9a-4f58-b13d-f20aca84a085',
  )

  assert.equal(result.ok, true)
  assert.equal(
    calls.some((call) => call[0] === 'eq' && call[1] === 'user_id' && call[2] === '6c0f95f2-eb22-4e4d-8edf-f0f3ba6d017a'),
    true,
  )
})

test('validation rejects invalid payloads with 400-style errors', () => {
  const missingTitle = validateCreateTaskPayload({ title: '   ' })
  assert.equal(missingTitle.ok, false)
  assert.equal(missingTitle.status, 400)
  assert.equal(missingTitle.error.code, 'invalid_title')

  const badStatus = validatePatchTaskPayload({ status: 'not-a-state' })
  assert.equal(badStatus.ok, false)
  assert.equal(badStatus.status, 400)
  assert.equal(badStatus.error.code, 'invalid_status')

  const badDueDate = validatePatchTaskPayload({ due_at: 'not-a-date' })
  assert.equal(badDueDate.ok, false)
  assert.equal(badDueDate.status, 400)
  assert.equal(badDueDate.error.code, 'invalid_due_at')
})

test('GET task fetch is explicitly scoped to user_id', async () => {
  const userId = '6f9e22bc-184a-4b8e-98c2-f6542f8f4d05'
  const tasks = [{ id: 'f2f8fdaf-63aa-4af8-80c9-d5699f247fd3', user_id: userId, title: 'Scoped task' }]
  const { calls, client } = makeFetchSupabase({ data: tasks, error: null })

  const result = await fetchTasksForUser(client, userId)
  assert.equal(result.ok, true)
  assert.deepEqual(result.tasks, tasks)
  assert.equal(calls.some((call) => call[0] === 'eq' && call[1] === 'user_id' && call[2] === userId), true)
})
