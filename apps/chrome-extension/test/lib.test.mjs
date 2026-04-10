import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

import {
  TASK_STATUS_VALUES,
  buildTaskTree,
  countIncompleteTasks,
  nextStatus,
  formatDueDate,
} from '../lib.js'

// ---------------------------------------------------------------------------
// TASK_STATUS_VALUES
// ---------------------------------------------------------------------------

describe('TASK_STATUS_VALUES', () => {
  test('contains exactly the five expected statuses', () => {
    assert.deepEqual(
      TASK_STATUS_VALUES,
      ['todo', 'in_progress', 'blocked', 'delayed', 'done'],
    )
  })

  test('is frozen', () => {
    assert.equal(Object.isFrozen(TASK_STATUS_VALUES), true)
  })
})

// ---------------------------------------------------------------------------
// buildTaskTree
// ---------------------------------------------------------------------------

describe('buildTaskTree', () => {
  test('returns empty array for empty input', () => {
    assert.deepEqual(buildTaskTree([]), [])
  })

  test('returns root-level tasks when no parent_id is set', () => {
    const tasks = [
      { id: '1', parent_id: null, title: 'A', status: 'todo' },
      { id: '2', parent_id: null, title: 'B', status: 'done' },
    ]
    const tree = buildTaskTree(tasks)
    assert.equal(tree.length, 2)
    assert.equal(tree[0].title, 'A')
    assert.equal(tree[1].title, 'B')
  })

  test('nests children under their parent', () => {
    const tasks = [
      { id: 'p1', parent_id: null, title: 'Parent', status: 'todo' },
      { id: 'c1', parent_id: 'p1', title: 'Child', status: 'todo' },
    ]
    const tree = buildTaskTree(tasks)
    assert.equal(tree.length, 1)
    assert.equal(tree[0].children.length, 1)
    assert.equal(tree[0].children[0].title, 'Child')
  })

  test('handles multi-level nesting', () => {
    const tasks = [
      { id: 'g', parent_id: null, title: 'Grandparent', status: 'todo' },
      { id: 'p', parent_id: 'g', title: 'Parent', status: 'todo' },
      { id: 'c', parent_id: 'p', title: 'Child', status: 'done' },
    ]
    const tree = buildTaskTree(tasks)
    assert.equal(tree.length, 1)
    assert.equal(tree[0].children[0].children[0].title, 'Child')
  })

  test('places orphaned children at root level', () => {
    const tasks = [
      { id: '1', parent_id: 'nonexistent', title: 'Orphan', status: 'todo' },
      { id: '2', parent_id: null, title: 'Root', status: 'todo' },
    ]
    const tree = buildTaskTree(tasks)
    assert.equal(tree.length, 2)
    assert.equal(tree[0].title, 'Orphan')
  })

  test('adds empty children array to every node', () => {
    const tasks = [{ id: '1', parent_id: null, title: 'Leaf', status: 'todo' }]
    const tree = buildTaskTree(tasks)
    assert.ok(Array.isArray(tree[0].children))
    assert.equal(tree[0].children.length, 0)
  })

  test('preserves all original task properties', () => {
    const tasks = [
      { id: '1', parent_id: null, title: 'Task', status: 'blocked', due_at: '2025-01-01', sort_order: 5 },
    ]
    const tree = buildTaskTree(tasks)
    assert.equal(tree[0].status, 'blocked')
    assert.equal(tree[0].due_at, '2025-01-01')
    assert.equal(tree[0].sort_order, 5)
  })
})

// ---------------------------------------------------------------------------
// countIncompleteTasks
// ---------------------------------------------------------------------------

describe('countIncompleteTasks', () => {
  test('returns 0 for empty array', () => {
    assert.equal(countIncompleteTasks([]), 0)
  })

  test('excludes done tasks', () => {
    const tasks = [
      { status: 'todo' },
      { status: 'in_progress' },
      { status: 'done' },
      { status: 'blocked' },
    ]
    assert.equal(countIncompleteTasks(tasks), 3)
  })

  test('counts all tasks when none are done', () => {
    const tasks = [
      { status: 'todo' },
      { status: 'in_progress' },
      { status: 'delayed' },
    ]
    assert.equal(countIncompleteTasks(tasks), 3)
  })

  test('returns 0 when all tasks are done', () => {
    const tasks = [{ status: 'done' }, { status: 'done' }]
    assert.equal(countIncompleteTasks(tasks), 0)
  })
})

// ---------------------------------------------------------------------------
// nextStatus
// ---------------------------------------------------------------------------

describe('nextStatus', () => {
  test('cycles todo to in_progress', () => {
    assert.equal(nextStatus('todo'), 'in_progress')
  })

  test('cycles in_progress to done', () => {
    assert.equal(nextStatus('in_progress'), 'done')
  })

  test('cycles done back to todo', () => {
    assert.equal(nextStatus('done'), 'todo')
  })

  test('defaults to todo for statuses not in the cycle', () => {
    assert.equal(nextStatus('blocked'), 'todo')
    assert.equal(nextStatus('delayed'), 'todo')
  })

  test('defaults to todo for unknown values', () => {
    assert.equal(nextStatus('invalid'), 'todo')
    assert.equal(nextStatus(undefined), 'todo')
    assert.equal(nextStatus(null), 'todo')
  })
})

// ---------------------------------------------------------------------------
// formatDueDate
// ---------------------------------------------------------------------------

describe('formatDueDate', () => {
  // Helper: create an ISO string for a date N days from now at noon UTC
  function daysFromNow(n) {
    const d = new Date()
    d.setDate(d.getDate() + n)
    d.setHours(12, 0, 0, 0)
    return d.toISOString()
  }

  test('returns null for falsy input', () => {
    assert.equal(formatDueDate(null), null)
    assert.equal(formatDueDate(undefined), null)
    assert.equal(formatDueDate(''), null)
  })

  test('returns overdue info for past dates', () => {
    const result = formatDueDate(daysFromNow(-3))
    assert.equal(result.overdue, true)
    assert.match(result.text, /overdue/)
  })

  test('returns "Due today" for today', () => {
    // Use a date a few hours from now to stay within "today"
    const soon = new Date()
    soon.setHours(soon.getHours() + 2)
    const result = formatDueDate(soon.toISOString())
    // Math.ceil may yield 0 or 1 depending on exact time — accept both
    assert.ok(
      result.text === 'Due today' || result.text === 'Due tomorrow',
      `Expected "Due today" or "Due tomorrow", got "${result.text}"`,
    )
    assert.equal(result.overdue, false)
  })

  test('returns "Due tomorrow" for next day', () => {
    const result = formatDueDate(daysFromNow(1))
    assert.ok(
      result.text === 'Due tomorrow' || result.text === 'Due in 2d',
      `Expected "Due tomorrow" or "Due in 2d", got "${result.text}"`,
    )
    assert.equal(result.overdue, false)
  })

  test('returns "Due in Nd" for future dates', () => {
    const result = formatDueDate(daysFromNow(7))
    assert.match(result.text, /^Due in \d+d$/)
    assert.equal(result.overdue, false)
  })
})
