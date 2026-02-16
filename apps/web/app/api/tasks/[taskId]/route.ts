import { NextResponse } from 'next/server'

import {
  deleteTaskForUser,
  parseRequestJson,
  patchTaskForUser,
  requireAuthenticatedUser,
  validatePatchTaskPayload,
  validateTaskId,
} from '../../../../lib/api/tasks-api.mjs'
import { createClient } from '../../../../lib/supabase/server'

export const runtime = 'edge'

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  const supabase = await createClient()
  const auth = await supabase.auth.getUser()
  const authResult = requireAuthenticatedUser(auth)

  if (!authResult.ok) {
    const cause = getCause(authResult)
    if (cause) {
      console.error('[api/tasks/:taskId][PATCH] auth check failed:', cause)
    }
    return errorResponse(extractStatus(authResult, 401), extractError(authResult, 'Authentication is required.'))
  }

  const { taskId } = await context.params
  const taskIdValidation = validateTaskId(taskId)
  if (!taskIdValidation.ok) {
    return errorResponse(extractStatus(taskIdValidation, 400), extractError(taskIdValidation, 'Task id must be a valid UUID.'))
  }

  const parsedBody = await parseRequestJson(request)
  if (!parsedBody.ok) {
    return errorResponse(extractStatus(parsedBody, 400), extractError(parsedBody, 'Request body must be valid JSON.'))
  }

  const payload = validatePatchTaskPayload(parsedBody.data)
  if (!payload.ok) {
    return errorResponse(extractStatus(payload, 400), extractError(payload, 'Invalid request payload.'))
  }

  const updateResult = await patchTaskForUser(
    supabase,
    authResult.user.id,
    taskId,
    payload.value,
    new Date().toISOString(),
  )

  if (!updateResult.ok) {
    const cause = getCause(updateResult)
    if (cause) {
      console.error('[api/tasks/:taskId][PATCH] update failed:', cause)
    }
    return errorResponse(extractStatus(updateResult, 500), extractError(updateResult, 'Unable to update task.'))
  }

  return NextResponse.json({ task: updateResult.task })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  const supabase = await createClient()
  const auth = await supabase.auth.getUser()
  const authResult = requireAuthenticatedUser(auth)

  if (!authResult.ok) {
    const cause = getCause(authResult)
    if (cause) {
      console.error('[api/tasks/:taskId][DELETE] auth check failed:', cause)
    }
    return errorResponse(extractStatus(authResult, 401), extractError(authResult, 'Authentication is required.'))
  }

  const { taskId } = await context.params
  const taskIdValidation = validateTaskId(taskId)
  if (!taskIdValidation.ok) {
    return errorResponse(extractStatus(taskIdValidation, 400), extractError(taskIdValidation, 'Task id must be a valid UUID.'))
  }

  const deleteResult = await deleteTaskForUser(supabase, authResult.user.id, taskId)

  if (!deleteResult.ok) {
    const cause = getCause(deleteResult)
    if (cause) {
      console.error('[api/tasks/:taskId][DELETE] delete failed:', cause)
    }
    return errorResponse(extractStatus(deleteResult, 500), extractError(deleteResult, 'Unable to delete task.'))
  }

  return NextResponse.json({ ok: true })
}
