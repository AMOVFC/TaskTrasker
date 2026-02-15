export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  const pkg = '@supabase/' + 'ssr'

  try {
    const { createBrowserClient } = await import(pkg)
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  } catch {
    throw new Error('Supabase package "@supabase/ssr" is not installed. Run npm install in apps/web.')
  }
}
