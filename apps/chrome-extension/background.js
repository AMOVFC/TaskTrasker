/**
 * Background service worker for TaskTrasker Chrome extension.
 *
 * Handles:
 * - Context menu registration ("Add to TaskTrasker")
 * - Badge count updates (incomplete task count)
 * - Periodic refresh via chrome.alarms
 * - Message relay between popup and background
 */

importScripts('vendor/supabase.min.js', 'supabase-client.js', 'tasks-api.js')

const ALARM_NAME = 'tasktrasker-badge-refresh'
const BADGE_REFRESH_MINUTES = 5

// --- Context Menu ---

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'add-to-tasktrasker',
    title: 'Add to TaskTrasker',
    contexts: ['selection', 'page'],
  })

  chrome.alarms.create(ALARM_NAME, { periodInMinutes: BADGE_REFRESH_MINUTES })

  updateBadge()
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'add-to-tasktrasker') return

  const title = info.selectionText || (tab && tab.title) || 'Untitled task'

  const user = await self.TaskTrasker.auth.getUser()
  if (!user) {
    setBadgeError()
    return
  }

  const result = await self.TaskTrasker.tasks.createTask(title.substring(0, 500))

  if (result.ok) {
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' })
    chrome.action.setBadgeText({ text: '\u2713' })
    setTimeout(() => updateBadge(), 1500)
  } else {
    setBadgeError()
  }
})

// --- Badge ---

async function updateBadge() {
  const user = await self.TaskTrasker.auth.getUser()

  if (!user) {
    chrome.action.setBadgeText({ text: '' })
    return
  }

  const result = await self.TaskTrasker.tasks.fetchTasks()

  if (!result.ok) {
    chrome.action.setBadgeText({ text: '' })
    return
  }

  const count = self.TaskTrasker.tasks.countIncompleteTasks(result.tasks)
  chrome.action.setBadgeBackgroundColor({ color: '#0891b2' }) // cyan-600
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' })
}

function setBadgeError() {
  chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
  chrome.action.setBadgeText({ text: '!' })
  setTimeout(() => updateBadge(), 3000)
}

// --- Alarms ---

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    updateBadge()
  }
})

// --- Messages from popup ---

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'refresh-badge') {
    updateBadge().then(() => sendResponse({ ok: true }))
    return true // keep channel open for async response
  }
})

// Refresh badge on startup
updateBadge()
