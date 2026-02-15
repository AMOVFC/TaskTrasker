import { cookies } from 'next/headers'

type CookieToSet = {
  name: string
  value: string
  options?: Record<string, unknown>
}

export async function createClient() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  const pkg = '@supabase/' + 'ssr'

  try {
    const { createServerClient } = await import(pkg)

    return createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as never)
            })
          } catch {
            // Server components may not be able to set cookies. Middleware refreshes sessions.
          }
        },
      },
    })
  } catch {
    throw new Error('Supabase package "@supabase/ssr" is not installed. Run npm install in apps/web.')
  }
}
