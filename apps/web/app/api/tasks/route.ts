import { NextResponse } from 'next/server'

import {
  createTaskForUser,
  fetchTasksForUser,
  parseRequestJson,
  requireAuthenticatedUser,
  validateCreateTaskPayload,
} from '../../../lib/api/tasks-api.mjs'
import { createClient } from '../../../lib/supabase/server'

export const runtime = 'nodejs'

function errorResponse(status: number, error: { code: string; message: string; details?: Record<string, unknown> }) {
  return NextResponse.json({ error }, { status })
}

function extractStatus(result: unknown, fallback: number) {
  if (typeof result !== 'object' || result === null || !('status' in result)) {
    return fallback
  }

  const status = (result as { status?: unknown }).status
  return typeof status === 'number' ? status : fallback
}

function extractError(result: unknown, fallbackMessage: string) {
  if (typeof result === 'object' && result !== null && 'error' in result) {
    const error = (result as { error?: unknown }).error

    if (typeof error === 'object' && error !== null) {
      const code = 'code' in error ? (error as { code?: unknown }).code : null
      const message = 'message' in error ? (error as { message?: unknown }).message : null
      const details = 'details' in error ? (error as { details?: unknown }).details : undefined

      if (typeof code === 'string' && typeof message === 'string') {
        const normalized = { code, message } as { code: string; message: string; details?: Record<string, unknown> }
        if (details && typeof details === 'object' && !Array.isArray(details)) {
          normalized.details = details as Record<string, unknown>
        }
        return normalized
      }
    }
  }

  return { code: 'internal_error', message: fallbackMessage }
}

function getCause(result: unknown) {
  if (typeof result !== 'object' || result === null || !('cause' in result)) {
    return null
  }

  const cause = (result as { cause?: unknown }).cause
  return typeof cause === 'string' ? cause : null
}

export async function GET() {
  const supabase = await createClient()
  const auth = await supabase.auth.getUser()
  const authResult = requireAuthenticatedUser(auth)

  if (!authResult.ok) {
    const cause = getCause(authResult)
    if (cause) {
      console.error('[api/tasks][GET] auth check failed:', cause)
    }
    return errorResponse(extractStatus(authResult, 401), extractError(authResult, 'Authentication is required.'))
  }

  const result = await fetchTasksForUser(supabase, authResult.user.id)

  if (!result.ok) {
    const cause = getCause(result)
    if (cause) {
      console.error('[api/tasks][GET] fetch failed:', cause)
    }
    return errorResponse(extractStatus(result, 500), extractError(result, 'Unable to fetch tasks.'))
  }

  return NextResponse.json({ tasks: result.tasks })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await supabase.auth.getUser()
  const authResult = requireAuthenticatedUser(auth)

  if (!authResult.ok) {
    const cause = getCause(authResult)
    if (cause) {
      console.error('[api/tasks][POST] auth check failed:', cause)
    }
    return errorResponse(extractStatus(authResult, 401), extractError(authResult, 'Authentication is required.'))
  }

  const parsedBody = await parseRequestJson(request)
  if (!parsedBody.ok) {
    return errorResponse(extractStatus(parsedBody, 400), extractError(parsedBody, 'Request body must be valid JSON.'))
  }

  const payload = validateCreateTaskPayload(parsedBody.data)
  if (!payload.ok) {
    return errorResponse(extractStatus(payload, 400), extractError(payload, 'Invalid request payload.'))
  }

  const createResult = await createTaskForUser(
    supabase,
    authResult.user.id,
    payload.value,
    new Date().toISOString(),
  )

  if (!createResult.ok) {
    const cause = getCause(createResult)
    if (cause) {
      console.error('[api/tasks][POST] create failed:', cause)
    }
    return errorResponse(extractStatus(createResult, 500), extractError(createResult, 'Unable to create task.'))
  }

  return NextResponse.json({ task: createResult.task }, { status: 201 })
}
