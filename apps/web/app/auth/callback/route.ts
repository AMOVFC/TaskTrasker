import { NextResponse } from 'next/server'

import { buildLoginErrorRedirectUrl, normalizeNextPath } from '../../../lib/auth/login-flow.mjs'
import { createClient } from '../../../lib/supabase/server'

export const runtime = 'edge'

function redirectWithAuthError(origin: string, next: string, reason: string) {
  return NextResponse.redirect(buildLoginErrorRedirectUrl(origin, next, reason))
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = normalizeNextPath(searchParams.get('next'))

  if (!code) {
    console.error('[auth/callback] Missing OAuth code in callback request.')
    return redirectWithAuthError(origin, next, 'missing_code')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] Failed to exchange OAuth code for session:', error.message)
    return redirectWithAuthError(origin, next, 'oauth_exchange_failed')
  }

  return NextResponse.redirect(new URL(next, origin))
}
