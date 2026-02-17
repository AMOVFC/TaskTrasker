import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildLoginErrorRedirectUrl,
  getAuthErrorMessage,
  normalizeNextPath,
} from '../lib/auth/login-flow.mjs'

test('normalizeNextPath keeps safe in-app paths', () => {
  assert.equal(normalizeNextPath('/plan'), '/plan')
  assert.equal(normalizeNextPath('/plan?view=today'), '/plan?view=today')
})

test('normalizeNextPath falls back for empty or unsafe redirect targets', () => {
  assert.equal(normalizeNextPath(null), '/plan')
  assert.equal(normalizeNextPath(undefined), '/plan')
  assert.equal(normalizeNextPath('https://evil.example/phish'), '/plan')
  assert.equal(normalizeNextPath('//evil.example/phish'), '/plan')
})

test('getAuthErrorMessage maps known login error codes to user-facing copy', () => {
  assert.equal(
    getAuthErrorMessage('missing_code'),
    'Google sign-in did not return an authorization code. Please try again.',
  )
  assert.equal(
    getAuthErrorMessage('oauth_exchange_failed'),
    'Could not complete Google sign-in. Please retry the login flow.',
  )
  assert.equal(getAuthErrorMessage('something_else'), null)
})

test('buildLoginErrorRedirectUrl includes next path and error code for login screen', () => {
  const url = buildLoginErrorRedirectUrl('https://tasktasker.com', '/plan', 'oauth_exchange_failed')

  assert.equal(url.pathname, '/login')
  assert.equal(url.searchParams.get('next'), '/plan')
  assert.equal(url.searchParams.get('error'), 'oauth_exchange_failed')
})
