;(function () {
  var auth = self.TaskTrasker.auth
  var tasks = self.TaskTrasker.tasks
  var lib = self.TaskTrasker.lib

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
  var groupFilterBar = document.getElementById('group-filter-bar')

  var editModal = document.getElementById('edit-modal')
  var modalClose = document.getElementById('modal-close')
  var modalTitleInput = document.getElementById('modal-title-input')
  var modalGroupInput = document.getElementById('modal-group-input')
  var modalDueInput = document.getElementById('modal-due-input')
  var modalCancel = document.getElementById('modal-cancel')
  var modalSave = document.getElementById('modal-save')
  var modalError = document.getElementById('modal-error')
  var modalGroupSuggestions = document.getElementById('modal-group-suggestions')

  // --- State ---

  var expandedTasks = new Set()
  var activeGroup = null       // null = All
  var editingTaskId = null
  var allTasksFlat = []        // latest flat task list from server

  // --- Group Color Palette ---

  var GROUP_COLORS = [
    { bg: 'rgba(34, 211, 238, 0.18)', text: '#22d3ee' },   // cyan
    { bg: 'rgba(52, 211, 153, 0.18)', text: '#34d399' },    // emerald
    { bg: 'rgba(96, 165, 250, 0.18)', text: '#60a5fa' },    // blue
    { bg: 'rgba(251, 191, 36, 0.18)', text: '#fbbf24' },    // yellow
    { bg: 'rgba(167, 139, 250, 0.18)', text: '#a78bfa' },   // purple
    { bg: 'rgba(251, 146, 60, 0.18)', text: '#fb923c' },    // orange
  ]

  function groupColor(name) {
    var hash = 0
    for (var i = 0; i < name.length; i++) {
      hash = ((hash * 31) + name.charCodeAt(i)) & 0xffff
    }
    return GROUP_COLORS[hash % GROUP_COLORS.length]
  }

  // --- Status Helpers ---

  var STATUS_LABELS = {
    todo: 'To Do',
    in_progress: 'In Progress',
    blocked: 'Blocked',
    delayed: 'Delayed',
    done: 'Done',
  }

  var nextStatus = lib.nextStatus
  var formatDueDate = lib.formatDueDate

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
    setTimeout(function () { el.classList.add('hidden') }, 5000)
  }

  // --- Group Filter Bar ---

  function extractGroups(flatTasks) {
    var seen = new Set()
    var groups = []
    for (var i = 0; i < flatTasks.length; i++) {
      var g = flatTasks[i].group_name
      if (g && !seen.has(g)) {
        seen.add(g)
        groups.push(g)
      }
    }
    return groups.sort(function (a, b) { return a.localeCompare(b) })
  }

  function renderGroupFilter(groups) {
    // Always clear
    while (groupFilterBar.firstChild) groupFilterBar.removeChild(groupFilterBar.firstChild)

    if (groups.length === 0) {
      groupFilterBar.classList.add('hidden')
      return
    }
    groupFilterBar.classList.remove('hidden')

    // "All" pill
    groupFilterBar.appendChild(makeGroupPill(null, 'All', activeGroup === null))

    // One pill per group
    for (var i = 0; i < groups.length; i++) {
      groupFilterBar.appendChild(makeGroupPill(groups[i], groups[i], activeGroup === groups[i]))
    }
  }

  function makeGroupPill(group, label, isActive) {
    var pill = document.createElement('button')
    pill.className = 'group-pill' + (isActive ? ' active' : '')
    pill.textContent = label

    if (group !== null) {
      var color = groupColor(group)
      pill.style.color = color.text
      if (isActive) {
        pill.style.background = color.bg
        pill.style.borderColor = color.text
      }
    } else {
      // "All" pill active state
      if (isActive) {
        pill.style.color = 'var(--text-primary)'
        pill.style.borderColor = 'var(--text-muted)'
        pill.style.background = 'var(--bg-tertiary)'
      }
    }

    pill.addEventListener('click', function () {
      activeGroup = group
      renderGroupFilter(extractGroups(allTasksFlat))
      var tree = tasks.buildTaskTree(allTasksFlat)
      renderTasks(filterTree(tree, activeGroup))
      updateQuickAddPlaceholder()
    })
    return pill
  }

  function filterTree(tree, group) {
    if (group === null) return tree

    var filtered = []
    for (var i = 0; i < tree.length; i++) {
      var node = filterNode(tree[i], group)
      if (node) filtered.push(node)
    }
    return filtered
  }

  function filterNode(node, group) {
    // Filter children recursively
    var filteredChildren = []
    if (node.children) {
      for (var i = 0; i < node.children.length; i++) {
        var child = filterNode(node.children[i], group)
        if (child) filteredChildren.push(child)
      }
    }

    var selfMatches = node.group_name === group
    var hasMatchingChildren = filteredChildren.length > 0

    if (!selfMatches && !hasMatchingChildren) return null

    // Return a copy with filtered children
    var result = Object.assign({}, node, { children: filteredChildren })
    return result
  }

  function updateQuickAddPlaceholder() {
    if (activeGroup) {
      inputNewTask.placeholder = 'Add to ' + activeGroup + '…'
    } else {
      inputNewTask.placeholder = 'Add a task…'
    }
  }

  // --- Group Suggestions for Modal ---

  function updateGroupSuggestions(groups) {
    while (modalGroupSuggestions.firstChild) modalGroupSuggestions.removeChild(modalGroupSuggestions.firstChild)
    for (var i = 0; i < groups.length; i++) {
      var opt = document.createElement('option')
      opt.value = groups[i]
      modalGroupSuggestions.appendChild(opt)
    }
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

    var titleEl = document.createElement('div')
    titleEl.className = 'task-title' + (isDone ? ' done' : '')
    titleEl.textContent = task.title
    content.appendChild(titleEl)

    // Meta row: due date, children count, group tag
    var hasMeta = dueInfo || hasChildren || task.group_name
    if (hasMeta) {
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
        var doneCount = task.children.filter(function (c) { return c.status === 'done' }).length
        count.textContent = doneCount + '/' + task.children.length + ' done'
        meta.appendChild(count)
      }

      if (task.group_name) {
        var groupTag = document.createElement('span')
        groupTag.className = 'task-group-tag'
        groupTag.textContent = task.group_name
        var color = groupColor(task.group_name)
        groupTag.style.background = color.bg
        groupTag.style.color = color.text
        meta.appendChild(groupTag)
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

    // Edit button
    var editBtn = document.createElement('button')
    editBtn.className = 'task-edit'
    editBtn.title = 'Edit task'
    editBtn.appendChild(createPencilIcon())
    editBtn.addEventListener('click', function () {
      openEditModal(task)
    })
    row.appendChild(editBtn)

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

  // --- Edit Modal ---

  function openEditModal(task) {
    editingTaskId = task.id

    modalTitleInput.value = task.title
    modalGroupInput.value = task.group_name || ''
    modalDueInput.value = task.due_at ? task.due_at.slice(0, 10) : ''

    updateGroupSuggestions(extractGroups(allTasksFlat))

    modalError.classList.add('hidden')
    editModal.classList.remove('hidden')
    modalTitleInput.focus()
    modalTitleInput.select()
  }

  function closeEditModal() {
    editModal.classList.add('hidden')
    editingTaskId = null
  }

  async function saveEdit() {
    if (!editingTaskId) return

    var title = modalTitleInput.value.trim()
    if (!title) {
      showError(modalError, 'Title cannot be empty.')
      return
    }

    modalSave.disabled = true
    modalCancel.disabled = true

    var result = await tasks.patchTask(editingTaskId, {
      title: title,
      group_name: modalGroupInput.value.trim() || null,
      due_at: modalDueInput.value ? new Date(modalDueInput.value).toISOString() : null,
    })

    modalSave.disabled = false
    modalCancel.disabled = false

    if (result.ok) {
      closeEditModal()
      notifyBadgeRefresh()
      loadTasks()
    } else {
      showError(modalError, result.error)
    }
  }

  modalClose.addEventListener('click', closeEditModal)
  modalCancel.addEventListener('click', closeEditModal)
  modalSave.addEventListener('click', saveEdit)

  // Close modal on overlay click
  editModal.addEventListener('click', function (e) {
    if (e.target === editModal) closeEditModal()
  })

  // Save on Enter in title/group fields
  modalTitleInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') closeEditModal()
  })
  modalGroupInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeEditModal()
  })
  modalDueInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeEditModal()
  })

  // --- Data Loading ---

  async function loadTasks() {
    var result = await tasks.fetchTasks()

    if (!result.ok) {
      showError(mainError, result.error)
      return
    }

    allTasksFlat = result.tasks

    var groups = extractGroups(allTasksFlat)

    // If the active group no longer exists in data, reset to All
    if (activeGroup !== null && !groups.includes(activeGroup)) {
      activeGroup = null
    }

    renderGroupFilter(groups)

    var tree = tasks.buildTaskTree(allTasksFlat)
    renderTasks(filterTree(tree, activeGroup))
    updateQuickAddPlaceholder()
  }

  // --- Event Handlers ---

  async function handleAddTask() {
    var title = inputNewTask.value.trim()
    if (!title) return

    inputNewTask.disabled = true
    btnAddTask.disabled = true

    // Automatically assign the active group to new tasks
    var result = await tasks.createTask(title, null, 0, activeGroup)

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
    chrome.runtime.sendMessage({ type: 'refresh-badge' }).catch(function () {})
  }

  // --- SVG Icon Helpers ---

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

  function createPencilIcon() {
    return svgEl('svg', { width: '13', height: '13', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
      svgEl('path', { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }),
      svgEl('path', { d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' })
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
