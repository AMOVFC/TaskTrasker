/**
 * Supabase client for Chrome extension.
 *
 * Uses chrome.storage.local as the persistence layer instead of localStorage
 * (service workers don't have access to localStorage).
 *
 * Exports via self.TaskTrasker.auth namespace.
 */

;(function () {
  const SUPABASE_URL = 'https://olngcuxyzzfwspgjsoyd.supabase.co'
  const SUPABASE_ANON_KEY = 'sb_publishable_5xA-hPikSf7WyY216269Vg_E-zfhfi3'
  const STORAGE_KEY = 'tasktrasker-auth'

  self.TaskTrasker = self.TaskTrasker || {}

  /**
   * Custom storage adapter backed by chrome.storage.local.
   */
  class ChromeStorageAdapter {
    constructor() {
      this._cache = {}
      this._ready = this._load()
    }

    async _load() {
      const result = await chrome.storage.local.get(STORAGE_KEY)
      if (result[STORAGE_KEY]) {
        try {
          this._cache = JSON.parse(result[STORAGE_KEY])
        } catch {
          this._cache = {}
        }
      }
    }

    async _persist() {
      await chrome.storage.local.set({
        [STORAGE_KEY]: JSON.stringify(this._cache),
      })
    }

    async getItem(key) {
      await this._ready
      return this._cache[key] ?? null
    }

    async setItem(key, value) {
      await this._ready
      this._cache[key] = value
      await this._persist()
    }

    async removeItem(key) {
      await this._ready
      delete this._cache[key]
      await this._persist()
    }
  }

  let _supabase = null

  function getSupabase() {
    if (_supabase) return _supabase

    if (typeof self.supabase === 'undefined' || !self.supabase.createClient) {
      throw new Error(
        'Supabase JS library not loaded. Make sure vendor/supabase.min.js is imported first.'
      )
    }

    _supabase = self.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: new ChromeStorageAdapter(),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'implicit',
      },
    })

    return _supabase
  }

  async function signIn() {
    const sb = getSupabase()
    const redirectUrl = chrome.identity.getRedirectURL()

    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    })

    if (error) throw error

    const authUrl = new URL(data.url)
    authUrl.searchParams.delete('skip_http_redirect')

    const responseUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        { url: authUrl.toString(), interactive: true },
        (callbackUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve(callbackUrl)
          }
        }
      )
    })

    const hashParams = new URLSearchParams(responseUrl.split('#')[1] || '')
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')

    if (accessToken && refreshToken) {
      const { error: sessionError } = await sb.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (sessionError) throw sessionError
      return await sb.auth.getUser()
    }

    const code = new URL(responseUrl).searchParams.get('code')
    if (code) {
      const { error: exchangeError } = await sb.auth.exchangeCodeForSession(code)
      if (exchangeError) throw exchangeError
      return await sb.auth.getUser()
    }

    throw new Error('Authentication failed: no tokens or authorization code received.')
  }

  async function signOut() {
    const sb = getSupabase()
    await sb.auth.signOut()
    await chrome.storage.local.remove(STORAGE_KEY)
  }

  async function getUser() {
    const sb = getSupabase()
    const {
      data: { user },
    } = await sb.auth.getUser()
    return user
  }

  async function getSession() {
    const sb = getSupabase()
    const {
      data: { session },
    } = await sb.auth.getSession()
    return session
  }

  // Public API
  self.TaskTrasker.auth = {
    getSupabase,
    signIn,
    signOut,
    getUser,
    getSession,
  }
})()
