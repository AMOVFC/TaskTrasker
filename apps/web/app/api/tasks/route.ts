import { NextResponse } from 'next/server'

import { createClient } from '../../../lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('id,user_id,parent_id,title,status,due_at,sort_order,created_at,updated_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tasks: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as { title?: string; parent_id?: string | null }
  const title = body.title?.trim()

  if (!title) {
    return NextResponse.json({ error: 'Task title is required.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title,
      user_id: user.id,
      parent_id: body.parent_id ?? null,
      status: 'todo',
      updated_at: new Date().toISOString(),
    })
    .select('id,user_id,parent_id,title,status,due_at,sort_order,created_at,updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ task: data }, { status: 201 })
}
