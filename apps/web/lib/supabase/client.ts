import { createBrowserClient } from '@supabase/ssr'

import { getSupabaseEnvOrThrow } from './env'

export async function createClient() {
  const { supabaseKey, supabaseUrl } = getSupabaseEnvOrThrow()
  return createBrowserClient(supabaseUrl, supabaseKey)
}
