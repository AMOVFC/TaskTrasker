type SupabaseEnv = {
  supabaseKey: string
  supabaseUrl: string
}

function getSupabaseKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

export function getSupabaseEnvOrNull(): SupabaseEnv | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = getSupabaseKey()

  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  return { supabaseUrl, supabaseKey }
}

export function getSupabaseEnvOrThrow(): SupabaseEnv {
  const env = getSupabaseEnvOrNull()

  if (!env) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY',
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
  const isDevelopment = process.env.NODE_ENV === 'development'
  const explicit = parseBooleanEnv(process.env.TASKTASKER_ENABLE_LOCAL_MODE)

  if (isDevelopment) {
    return true
  }

  return explicit === true
}

export function assertSupabaseConfiguredOutsideLocalMode() {
  if (process.env.NODE_ENV === 'development') {
    return
  }

  const hasSupabase = Boolean(getSupabaseEnvOrNull())
  if (hasSupabase || isLocalNoSupabaseModeEnabled()) {
    return
  }

  throw new Error(
    'Supabase environment variables are required outside local mode. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).',
  )
}
