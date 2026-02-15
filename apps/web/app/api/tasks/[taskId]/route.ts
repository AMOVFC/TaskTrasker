import { NextResponse } from 'next/server'

import { createClient } from '../../../../lib/supabase/server'

type TaskPatchPayload = {
  title?: string
  status?: 'todo' | 'in_progress' | 'blocked' | 'delayed' | 'done'
  due_at?: string | null
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { taskId } = await context.params
  const body = (await request.json()) as TaskPatchPayload

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body.title === 'string') {
    const title = body.title.trim()
    if (!title) {
      return NextResponse.json({ error: 'Title cannot be empty.' }, { status: 400 })
    }
    update.title = title
  }

  if (typeof body.status === 'string') {
    update.status = body.status
  }

  if ('due_at' in body) {
    update.due_at = body.due_at
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(update)
    .eq('id', taskId)
    .eq('user_id', user.id)
    .select('id,user_id,parent_id,title,status,due_at,sort_order,created_at,updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ task: data })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { taskId } = await context.params

  const { error } = await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
