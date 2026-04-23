/**
 * Pure utility functions shared across the Chrome extension.
 *
 * These functions have no side-effects and no dependency on browser APIs,
 * making them testable under Node.js.
 *
 * In the extension runtime they attach to self.TaskTrasker.lib.
 * Under Node.js they export via module.exports.
 */

;(function (exports) {
  var TASK_STATUS_VALUES = Object.freeze([
    'todo',
    'in_progress',
    'blocked',
    'delayed',
    'done',
  ])

  /**
   * Build a tree structure from a flat task list.
   * Tasks whose parent_id doesn't match any sibling are placed at root level.
   */
  function buildTaskTree(tasks) {
    var map = new Map()
    var roots = []

    for (var i = 0; i < tasks.length; i++) {
      var task = tasks[i]
      map.set(task.id, Object.assign({}, task, { children: [] }))
    }

    for (var j = 0; j < tasks.length; j++) {
      var t = tasks[j]
      var node = map.get(t.id)
      if (t.parent_id && map.has(t.parent_id)) {
        map.get(t.parent_id).children.push(node)
      } else {
        roots.push(node)
      }
    }

    return roots
  }

  /**
   * Count incomplete tasks (status !== 'done').
   */
  function countIncompleteTasks(tasks) {
    return tasks.filter(function (t) { return t.status !== 'done' }).length
  }

  /**
   * Cycle through the quick-status list: todo -> in_progress -> done -> todo.
   * Statuses not in the cycle (blocked, delayed) default to 'todo'.
   */
  function nextStatus(current) {
    var cycle = ['todo', 'in_progress', 'done']
    var idx = cycle.indexOf(current)
    if (idx === -1) return 'todo'
    return cycle[(idx + 1) % cycle.length]
  }

  /**
   * Format a due date into a human-readable string.
   * Returns { text: string, overdue: boolean } or null if no date given.
   */
  function formatDueDate(dueAt) {
    if (!dueAt) return null
    var due = new Date(dueAt)
    var now = new Date()
    var diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { text: Math.abs(diffDays) + 'd overdue', overdue: true }
    if (diffDays === 0) return { text: 'Due today', overdue: false }
    if (diffDays === 1) return { text: 'Due tomorrow', overdue: false }
    return { text: 'Due in ' + diffDays + 'd', overdue: false }
  }

  // --- Public API ---

  exports.TASK_STATUS_VALUES = TASK_STATUS_VALUES
  exports.buildTaskTree = buildTaskTree
  exports.countIncompleteTasks = countIncompleteTasks
  exports.nextStatus = nextStatus
  exports.formatDueDate = formatDueDate
})(
  typeof module !== 'undefined' && module.exports
    ? module.exports
    : ((self.TaskTrasker = self.TaskTrasker || {}),
       (self.TaskTrasker.lib = {}),
       self.TaskTrasker.lib)
)
