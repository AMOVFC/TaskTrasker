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
