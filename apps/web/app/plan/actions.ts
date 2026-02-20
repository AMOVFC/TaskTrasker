'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { normalizeNextPath } from '../../lib/auth/next-path'
import { getAppUrlOrNull } from '../../lib/supabase/env'
import { createClient } from '../../lib/supabase/server'

function buildOriginFromHeaders(requestHeaders: Headers) {
  const forwardedHost = requestHeaders.get('x-forwarded-host')
  const host = forwardedHost ?? requestHeaders.get('host')

  if (!host) {
    return null
  }

  const forwardedProto = requestHeaders.get('x-forwarded-proto')
  const protocol = forwardedProto ?? (host.includes('localhost') ? 'http' : 'https')

  return `${protocol}://${host}`
}

async function resolveAppUrl() {
  const configured = getAppUrlOrNull()
  if (configured) {
    return configured
  }

  const requestHeaders = await headers()
  const headerOrigin = buildOriginFromHeaders(requestHeaders)
  if (headerOrigin) {
    return headerOrigin
  }

  return null
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient()
  const rawNext = formData.get('next')
  const next = normalizeNextPath(typeof rawNext === 'string' ? rawNext : null)
  const appUrl = await resolveAppUrl()

  if (!appUrl) {
    throw new Error('Unable to determine app URL for OAuth redirect. Set APP_URL or NEXT_PUBLIC_APP_URL.')
  }

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
