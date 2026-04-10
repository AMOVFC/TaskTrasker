import { describe, test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

// The env module reads process.env at call time, so we can manipulate env vars
// between calls. We import with --experimental-strip-types support (Node 22+).
import {
  getSupabaseEnvOrNull,
  getSupabaseEnvOrThrow,
  getAppUrlOrNull,
  getAppUrlOrThrow,
  isLocalNoSupabaseModeEnabled,
} from '../lib/supabase/env.ts'

// ---------------------------------------------------------------------------
// Helpers: save and restore env vars between tests
// ---------------------------------------------------------------------------

const ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'APP_URL',
  'NEXT_PUBLIC_APP_URL',
  'NODE_ENV',
  'TASKTASKER_ENABLE_LOCAL_MODE',
]

let savedEnv

beforeEach(() => {
  savedEnv = {}
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key]
  }
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = savedEnv[key]
    }
  }
})

function clearSupabaseEnv() {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

function clearAppUrlEnv() {
  delete process.env.APP_URL
  delete process.env.NEXT_PUBLIC_APP_URL
}

// ---------------------------------------------------------------------------
// getSupabaseEnvOrNull
// ---------------------------------------------------------------------------

describe('getSupabaseEnvOrNull', () => {
  test('returns env when URL and publishable key are both present', () => {
    clearSupabaseEnv()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key'

    const result = getSupabaseEnvOrNull()
    assert.deepEqual(result, {
      supabaseUrl: 'https://example.supabase.co',
      supabaseKey: 'test-key',
    })
  })

  test('falls back to ANON_KEY when PUBLISHABLE_KEY is absent', () => {
    clearSupabaseEnv()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'

    const result = getSupabaseEnvOrNull()
    assert.equal(result.supabaseKey, 'anon-key')
  })

  test('returns null when URL is missing', () => {
    clearSupabaseEnv()
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key'

    assert.equal(getSupabaseEnvOrNull(), null)
  })

  test('returns null when both key vars are missing', () => {
    clearSupabaseEnv()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'

    assert.equal(getSupabaseEnvOrNull(), null)
  })

  test('returns null for non-HTTP URLs', () => {
    clearSupabaseEnv()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'ftp://bad.example'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key'

    assert.equal(getSupabaseEnvOrNull(), null)
  })

  test('trims whitespace from URL', () => {
    clearSupabaseEnv()
    process.env.NEXT_PUBLIC_SUPABASE_URL = '  https://example.supabase.co  '
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key'

    const result = getSupabaseEnvOrNull()
    assert.equal(result.supabaseUrl, 'https://example.supabase.co')
  })
})

// ---------------------------------------------------------------------------
// getSupabaseEnvOrThrow
// ---------------------------------------------------------------------------

describe('getSupabaseEnvOrThrow', () => {
  test('returns env for valid config', () => {
    clearSupabaseEnv()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key'

    const result = getSupabaseEnvOrThrow()
    assert.equal(result.supabaseUrl, 'https://example.supabase.co')
    assert.equal(result.supabaseKey, 'test-key')
  })

  test('throws descriptive error when config is missing', () => {
    clearSupabaseEnv()
    process.env.NODE_ENV = 'development'

    assert.throws(() => getSupabaseEnvOrThrow(), {
      message: /Missing or invalid/,
    })
  })

  test('throws generic error in production', () => {
    clearSupabaseEnv()
    process.env.NODE_ENV = 'production'

    assert.throws(() => getSupabaseEnvOrThrow(), {
      message: 'Supabase is not configured.',
    })
  })
})

// ---------------------------------------------------------------------------
// getAppUrlOrNull
// ---------------------------------------------------------------------------

describe('getAppUrlOrNull', () => {
  test('returns URL from APP_URL', () => {
    clearAppUrlEnv()
    process.env.APP_URL = 'https://tasktrasker.com'

    assert.equal(getAppUrlOrNull(), 'https://tasktrasker.com')
  })

  test('falls back to NEXT_PUBLIC_APP_URL', () => {
    clearAppUrlEnv()
    process.env.NEXT_PUBLIC_APP_URL = 'https://dev.tasktrasker.com'

    assert.equal(getAppUrlOrNull(), 'https://dev.tasktrasker.com')
  })

  test('strips trailing slashes', () => {
    clearAppUrlEnv()
    process.env.APP_URL = 'https://tasktrasker.com///'

    assert.equal(getAppUrlOrNull(), 'https://tasktrasker.com')
  })

  test('returns null when neither var is set', () => {
    clearAppUrlEnv()

    assert.equal(getAppUrlOrNull(), null)
  })
})

// ---------------------------------------------------------------------------
// getAppUrlOrThrow
// ---------------------------------------------------------------------------

describe('getAppUrlOrThrow', () => {
  test('returns URL when present', () => {
    clearAppUrlEnv()
    process.env.APP_URL = 'https://tasktrasker.com'

    assert.equal(getAppUrlOrThrow(), 'https://tasktrasker.com')
  })

  test('throws when URL is missing in development', () => {
    clearAppUrlEnv()
    process.env.NODE_ENV = 'development'

    assert.throws(() => getAppUrlOrThrow(), {
      message: /Missing APP_URL/,
    })
  })

  test('throws generic error in production', () => {
    clearAppUrlEnv()
    process.env.NODE_ENV = 'production'

    assert.throws(() => getAppUrlOrThrow(), {
      message: 'App URL is not configured.',
    })
  })
})

// ---------------------------------------------------------------------------
// isLocalNoSupabaseModeEnabled
// ---------------------------------------------------------------------------

describe('isLocalNoSupabaseModeEnabled', () => {
  test('returns false when NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production'
    process.env.TASKTASKER_ENABLE_LOCAL_MODE = 'true'

    assert.equal(isLocalNoSupabaseModeEnabled(), false)
  })

  test('returns true in development with truthy values', () => {
    process.env.NODE_ENV = 'development'

    for (const val of ['true', '1', 'yes', 'on']) {
      process.env.TASKTASKER_ENABLE_LOCAL_MODE = val
      assert.equal(isLocalNoSupabaseModeEnabled(), true, `Expected true for "${val}"`)
    }
  })

  test('returns false in development with falsy values', () => {
    process.env.NODE_ENV = 'development'

    for (const val of ['false', '0', 'no', 'off']) {
      process.env.TASKTASKER_ENABLE_LOCAL_MODE = val
      assert.equal(isLocalNoSupabaseModeEnabled(), false, `Expected false for "${val}"`)
    }
  })

  test('returns false when TASKTASKER_ENABLE_LOCAL_MODE is absent', () => {
    process.env.NODE_ENV = 'development'
    delete process.env.TASKTASKER_ENABLE_LOCAL_MODE

    assert.equal(isLocalNoSupabaseModeEnabled(), false)
  })
})
