/**
 * @typedef {'todo'|'in_progress'|'blocked'|'done'} TaskStatus
 * @typedef {{ id: string, title: string, status: TaskStatus, children?: TaskNode[] }} TaskNode
 */

/** @param {TaskNode[]} tasks */
export function countTotalTasks(tasks) {
  return tasks.reduce((total, task) => total + 1 + countTotalTasks(task.children ?? []), 0)
}

/** @param {TaskNode[]} tasks */
export function countTasksByStatus(tasks) {
  const counts = {
    todo: 0,
    in_progress: 0,
    blocked: 0,
    done: 0,
  }

  const walk = (items) => {
    for (const task of items) {
      counts[task.status] += 1
      walk(task.children ?? [])
    }
  }

  walk(tasks)
  return counts
}

/** @param {TaskNode[]} tasks */
export function hasBlockedTasks(tasks) {
  return countTasksByStatus(tasks).blocked > 0
}
