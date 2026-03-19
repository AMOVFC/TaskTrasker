'use server'

import { redirect } from 'next/navigation'

import { createClient } from '../../lib/supabase/server'

export async function deleteAllAccountData() {
  const supabase = await createClient()
  const { data: userResult } = await supabase.auth.getUser()
  const user = userResult.user

  if (!user) {
    redirect('/login?next=/settings')
  }

  const { error } = await supabase.from('tasks').delete().eq('user_id', user.id)

  if (error) {
    throw new Error(error.message || 'Unable to delete account data.')
  }

  await supabase.auth.signOut()
  redirect('/?accountDeleted=1')
}
