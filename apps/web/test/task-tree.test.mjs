import test from 'node:test'
import assert from 'node:assert/strict'

import { countTasksByStatus, countTotalTasks, hasBlockedTasks } from '../lib/task-tree.mjs'

const sampleTasks = [
  {
    id: '1',
    title: 'Project',
    status: 'in_progress',
    children: [
      { id: '1-1', title: 'Design', status: 'done' },
      {
        id: '1-2',
        title: 'Build',
        status: 'blocked',
        children: [{ id: '1-2-1', title: 'API', status: 'todo' }],
      },
    ],
  },
]

test('countTotalTasks counts nested tasks recursively', () => {
  assert.equal(countTotalTasks(sampleTasks), 4)
})

test('countTotalTasks returns zero for empty arrays', () => {
  assert.equal(countTotalTasks([]), 0)
})

test('countTasksByStatus returns accurate status totals', () => {
  assert.deepEqual(countTasksByStatus(sampleTasks), {
    todo: 1,
    in_progress: 1,
    blocked: 1,
    done: 1,
  })
})

test('countTasksByStatus returns zeros for empty trees', () => {
  assert.deepEqual(countTasksByStatus([]), {
    todo: 0,
    in_progress: 0,
    blocked: 0,
    done: 0,
  })
})

test('hasBlockedTasks returns true only when blocked tasks are present', () => {
  assert.equal(hasBlockedTasks(sampleTasks), true)
  assert.equal(hasBlockedTasks([{ id: 'x', title: 'Done', status: 'done' }]), false)
})

test('hasBlockedTasks detects deeply nested blocked tasks', () => {
  const tasks = [
    {
      id: 'root',
      title: 'Root',
      status: 'todo',
      children: [
        {
          id: 'child',
          title: 'Child',
          status: 'in_progress',
          children: [{ id: 'leaf', title: 'Leaf', status: 'blocked', children: [] }],
        },
      ],
    },
  ]

  assert.equal(hasBlockedTasks(tasks), true)
})
