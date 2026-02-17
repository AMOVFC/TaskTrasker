'use server'

import { redirect } from 'next/navigation'

import { normalizeNextPath } from '../../lib/auth/next-path'
import { getAppUrlOrThrow } from '../../lib/supabase/env'
import { createClient } from '../../lib/supabase/server'

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient()
  const rawNext = formData.get('next')
  const next = normalizeNextPath(typeof rawNext === 'string' ? rawNext : null)
  const appUrl = getAppUrlOrThrow()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error || !data.url) {
    throw new Error(error?.message ?? 'Unable to start Google auth flow.')
  }

  redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/plan')
}
