const DEFAULT_NEXT_PATH = '/plan'

export function normalizeNextPath(next) {
  if (!next) return DEFAULT_NEXT_PATH
  if (!next.startsWith('/') || next.startsWith('//')) return DEFAULT_NEXT_PATH
  return next
}

export function getAuthErrorMessage(errorCode) {
  switch (errorCode) {
    case 'missing_code':
      return 'Google sign-in did not return an authorization code. Please try again.'
    case 'oauth_exchange_failed':
      return 'Could not complete Google sign-in. Please retry the login flow.'
    default:
      return null
  }
}

export function buildLoginErrorRedirectUrl(origin, next, reason) {
  const url = new URL('/login', origin)
  url.searchParams.set('next', next)
  url.searchParams.set('error', reason)
  return url
}
