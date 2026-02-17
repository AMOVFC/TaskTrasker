import { normalizeNextPath as normalizeNextPathImpl } from './login-flow.mjs'

export function normalizeNextPath(next: string | null | undefined) {
  return normalizeNextPathImpl(next)
}
