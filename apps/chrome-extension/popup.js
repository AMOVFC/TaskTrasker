/**
 * Popup UI logic for TaskTrasker Chrome extension.
 *
 * Handles:
 * - Auth state (login/main view switching)
 * - Task list rendering (tree with expand/collapse)
 * - Quick add
 * - Status cycling
 * - Task deletion
 *
 * Depends on self.TaskTrasker.auth and self.TaskTrasker.tasks
 * (loaded via <script> tags in popup.html before this file).
 */

;(function () {
  var auth = self.TaskTrasker.auth
  var tasks = self.TaskTrasker.tasks

  // --- DOM References ---

  var loginView = document.getElementById('login-view')
  var mainView = document.getElementById('main-view')
  var btnSignIn = document.getElementById('btn-sign-in')
  var btnSignOut = document.getElementById('btn-sign-out')
  var loginError = document.getElementById('login-error')
  var inputNewTask = document.getElementById('input-new-task')
  var btnAddTask = document.getElementById('btn-add-task')
  var taskListEl = document.getElementById('task-list')
  var loadingEl = document.getElementById('loading')
  var emptyStateEl = document.getElementById('empty-state')
  var mainError = document.getElementById('main-error')

  // --- State ---

  var expandedTasks = new Set()

  // --- Status Helpers ---

  var STATUS_LABELS = {
    todo: 'To Do',
    in_progress: 'In Progress',
    blocked: 'Blocked',
    delayed: 'Delayed',
    done: 'Done',
  }

  function nextStatus(current) {
    var cycle = ['todo', 'in_progress', 'done']
    var idx = cycle.indexOf(current)
    if (idx === -1) return 'todo'
    return cycle[(idx + 1) % cycle.length]
  }

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

  // --- View Management ---

  function showLogin() {
    loginView.classList.remove('hidden')
    mainView.classList.add('hidden')
  }

  function showMain() {
    loginView.classList.add('hidden')
    mainView.classList.remove('hidden')
  }

  function showLoading(show) {
    loadingEl.classList.toggle('hidden', !show)
  }

  function showEmpty(show) {
    emptyStateEl.classList.toggle('hidden', !show)
  }

  function showError(el, message) {
    el.textContent = message
    el.classList.remove('hidden')
    setTimeout(function () {
      el.classList.add('hidden')
    }, 5000)
  }

  // --- Task Rendering ---

  function renderTaskItem(task) {
    var hasChildren = task.children && task.children.length > 0
    var isExpanded = expandedTasks.has(task.id)
    var dueInfo = formatDueDate(task.due_at)
    var isDone = task.status === 'done'

    var item = document.createElement('div')

    // Task row
    var row = document.createElement('div')
    row.className = 'task-item'

    // Expand button
    var expandBtn = document.createElement('button')
    expandBtn.className =
      'task-expand' +
      (isExpanded ? ' expanded' : '') +
      (!hasChildren ? ' no-children' : '')
    expandBtn.appendChild(createChevronIcon())
    expandBtn.addEventListener('click', function () {
      if (!hasChildren) return
      if (expandedTasks.has(task.id)) {
        expandedTasks.delete(task.id)
      } else {
        expandedTasks.add(task.id)
      }
      loadTasks()
    })
    row.appendChild(expandBtn)

    // Content
    var content = document.createElement('div')
    content.className = 'task-content'

    var title = document.createElement('div')
    title.className = 'task-title' + (isDone ? ' done' : '')
    title.textContent = task.title
    content.appendChild(title)

    // Meta row
    if (dueInfo || hasChildren) {
      var meta = document.createElement('div')
      meta.className = 'task-meta'

      if (dueInfo) {
        var due = document.createElement('span')
        due.className = 'task-due' + (dueInfo.overdue ? ' overdue' : '')
        due.textContent = dueInfo.text
        meta.appendChild(due)
      }

      if (hasChildren) {
        var count = document.createElement('span')
        count.className = 'task-children-count'
        var doneCount = task.children.filter(function (c) {
          return c.status === 'done'
        }).length
        count.textContent = doneCount + '/' + task.children.length + ' done'
        meta.appendChild(count)
      }

      content.appendChild(meta)
    }

    row.appendChild(content)

    // Status badge
    var badge = document.createElement('button')
    badge.className = 'status-badge ' + task.status
    badge.textContent = STATUS_LABELS[task.status]
    badge.title = 'Click to change status'
    badge.addEventListener('click', async function () {
      var newStatus = nextStatus(task.status)
      badge.textContent = '...'
      badge.disabled = true
      var result = await tasks.updateTaskStatus(task.id, newStatus)
      if (result.ok) {
        notifyBadgeRefresh()
        loadTasks()
      } else {
        showError(mainError, result.error)
        loadTasks()
      }
    })
    row.appendChild(badge)

    // Delete button
    var delBtn = document.createElement('button')
    delBtn.className = 'task-delete'
    delBtn.title = 'Delete task'
    delBtn.appendChild(createCloseIcon())
    delBtn.addEventListener('click', async function () {
      var result = await tasks.deleteTask(task.id)
      if (result.ok) {
        notifyBadgeRefresh()
        loadTasks()
      } else {
        showError(mainError, result.error)
      }
    })
    row.appendChild(delBtn)

    item.appendChild(row)

    // Children (if expanded)
    if (hasChildren && isExpanded) {
      var childrenEl = document.createElement('div')
      childrenEl.className = 'task-children'
      for (var i = 0; i < task.children.length; i++) {
        childrenEl.appendChild(renderTaskItem(task.children[i]))
      }
      item.appendChild(childrenEl)
    }

    return item
  }

  function renderTasks(tree) {
    while (taskListEl.firstChild) taskListEl.removeChild(taskListEl.firstChild)

    if (tree.length === 0) {
      showEmpty(true)
      return
    }

    showEmpty(false)

    for (var i = 0; i < tree.length; i++) {
      taskListEl.appendChild(renderTaskItem(tree[i]))
    }
  }

  // --- Data Loading ---

  async function loadTasks() {
    var result = await tasks.fetchTasks()

    if (!result.ok) {
      showError(mainError, result.error)
      return
    }

    var tree = tasks.buildTaskTree(result.tasks)
    renderTasks(tree)
  }

  // --- Event Handlers ---

  async function handleAddTask() {
    var title = inputNewTask.value.trim()
    if (!title) return

    inputNewTask.disabled = true
    btnAddTask.disabled = true

    var result = await tasks.createTask(title)

    inputNewTask.disabled = false
    btnAddTask.disabled = false

    if (result.ok) {
      inputNewTask.value = ''
      inputNewTask.focus()
      notifyBadgeRefresh()
      loadTasks()
    } else {
      showError(mainError, result.error)
    }
  }

  function notifyBadgeRefresh() {
    chrome.runtime.sendMessage({ type: 'refresh-badge' }).catch(function () {
      // Background may not be active; ignore
    })
  }

  // --- SVG Icon Helpers (avoid innerHTML for security) ---

  var SVG_NS = 'http://www.w3.org/2000/svg'

  function svgEl(tag, attrs, children) {
    var el = document.createElementNS(SVG_NS, tag)
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]) })
    }
    if (children) {
      children.forEach(function (c) { el.appendChild(c) })
    }
    return el
  }

  function createChevronIcon() {
    return svgEl('svg', { width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
      svgEl('polyline', { points: '9 18 15 12 9 6' })
    ])
  }

  function createCloseIcon() {
    return svgEl('svg', { width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
      svgEl('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
      svgEl('line', { x1: '6', y1: '6', x2: '18', y2: '18' })
    ])
  }

  function createGoogleIcon() {
    return svgEl('svg', { viewBox: '0 0 24 24', width: '18', height: '18', class: 'google-icon' }, [
      svgEl('path', { d: 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z', fill: '#4285F4' }),
      svgEl('path', { d: 'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z', fill: '#34A853' }),
      svgEl('path', { d: 'M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z', fill: '#FBBC05' }),
      svgEl('path', { d: 'M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z', fill: '#EA4335' })
    ])
  }

  function resetSignInButton() {
    while (btnSignIn.firstChild) btnSignIn.removeChild(btnSignIn.firstChild)
    btnSignIn.appendChild(createGoogleIcon())
    btnSignIn.appendChild(document.createTextNode('Sign in with Google'))
  }

  // --- Init ---

  async function init() {
    var user = await auth.getUser()

    if (user) {
      showMain()
      showLoading(true)
      await loadTasks()
      showLoading(false)
      inputNewTask.focus()
    } else {
      showLogin()
    }
  }

  // Sign in
  btnSignIn.addEventListener('click', async function () {
    btnSignIn.disabled = true
    btnSignIn.textContent = 'Signing in...'
    loginError.classList.add('hidden')

    try {
      await auth.signIn()
      showMain()
      showLoading(true)
      await loadTasks()
      showLoading(false)
      notifyBadgeRefresh()
      inputNewTask.focus()
    } catch (err) {
      showError(loginError, err.message || 'Sign-in failed. Please try again.')
    } finally {
      btnSignIn.disabled = false
      resetSignInButton()
    }
  })

  // Sign out
  btnSignOut.addEventListener('click', async function () {
    await auth.signOut()
    notifyBadgeRefresh()
    showLogin()
  })

  // Quick add
  btnAddTask.addEventListener('click', handleAddTask)
  inputNewTask.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') handleAddTask()
  })

  // Start
  init()
})()
