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

  /**
   * Discover the Google OAuth client ID used by our Supabase project.
   * We fetch the Supabase authorize endpoint with redirect:'manual' and
   * extract client_id from the Location header pointing to Google.
   */
  async function getGoogleClientId() {
    const authEndpoint =
      SUPABASE_URL +
      '/auth/v1/authorize?provider=google&redirect_to=' +
      encodeURIComponent('https://localhost/callback')

    const res = await fetch(authEndpoint, { redirect: 'manual' })

    const location = res.headers.get('location')
    if (!location) throw new Error('Could not resolve Google client ID from Supabase.')

    const clientId = new URL(location).searchParams.get('client_id')
    if (!clientId) throw new Error('Google client_id not found in Supabase redirect.')

    return clientId
  }

  /**
   * Sign in with Google via chrome.identity + signInWithIdToken.
   *
   * This bypasses Supabase's redirect chain entirely, which avoids the
   * problem where Supabase doesn't know the published extension's
   * redirect URL and therefore can't complete the OAuth callback.
   *
   * Flow:
   * 1. Discover Google client ID from Supabase auth config
   * 2. Build a direct Google OAuth URL with the extension's redirect URL
   * 3. launchWebAuthFlow → Google sign-in → redirect back to extension
   * 4. Extract id_token from callback hash
   * 5. supabase.auth.signInWithIdToken() to create the Supabase session
   */
  async function signIn() {
    const sb = getSupabase()
    const redirectUrl = chrome.identity.getRedirectURL()

    console.log('[TaskTrasker] Extension redirect URL:', redirectUrl)

    const clientId = await getGoogleClientId()

    const nonce = crypto.randomUUID()

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    googleAuthUrl.searchParams.set('client_id', clientId)
    googleAuthUrl.searchParams.set('redirect_uri', redirectUrl)
    googleAuthUrl.searchParams.set('response_type', 'id_token')
    googleAuthUrl.searchParams.set('scope', 'openid email profile')
    googleAuthUrl.searchParams.set('nonce', nonce)
    googleAuthUrl.searchParams.set('prompt', 'select_account')

    const responseUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        { url: googleAuthUrl.toString(), interactive: true },
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
    const idToken = hashParams.get('id_token')

    if (!idToken) {
      throw new Error('Authentication failed: no id_token received from Google.')
    }

    const { error: signInError } = await sb.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
      nonce,
    })

    if (signInError) throw signInError

    return await sb.auth.getUser()
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
