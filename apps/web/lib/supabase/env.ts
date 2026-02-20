type SupabaseEnv = {
  supabaseKey: string
  supabaseUrl: string
}

function getSupabaseKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}


function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function getSupabaseEnvOrNull(): SupabaseEnv | null {
  const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = getSupabaseKey()

  if (!rawSupabaseUrl || !supabaseKey) {
    return null
  }

  const supabaseUrl = rawSupabaseUrl.trim()
  if (!isValidHttpUrl(supabaseUrl)) {
    return null
  }

  return { supabaseUrl, supabaseKey }
}

export function getSupabaseEnvOrThrow(): SupabaseEnv {
  const env = getSupabaseEnvOrNull()

  if (!env) {
    throw new Error(
      'Missing or invalid NEXT_PUBLIC_SUPABASE_URL, or missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY',
    )
  }

  return env
}

function normalizeAppUrl(value: string) {
  return value.replace(/\/+$/, '')
}

export function getAppUrlOrNull() {
  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL

  if (!appUrl) {
    return null
  }

  return normalizeAppUrl(appUrl)
}

export function getAppUrlOrThrow() {
  const appUrl = getAppUrlOrNull()

  if (!appUrl) {
    throw new Error('Missing APP_URL (preferred) or NEXT_PUBLIC_APP_URL')
  }

  return appUrl
}


function parseBooleanEnv(value: string | undefined) {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return null
}

export function isLocalNoSupabaseModeEnabled() {
  if (process.env.NODE_ENV !== 'development') {
    return false
  }

  const explicit = parseBooleanEnv(process.env.TASKTASKER_ENABLE_LOCAL_MODE)
  return explicit === true
}
