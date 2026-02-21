-- Avoid per-row re-evaluation of auth.uid() in RLS predicates by wrapping in a scalar subquery.
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

drop policy if exists "Users can select own tasks" on public.tasks;
drop policy if exists "Users can insert own tasks" on public.tasks;
drop policy if exists "Users can update own tasks" on public.tasks;
drop policy if exists "Users can delete own tasks" on public.tasks;

create policy "Users can select own tasks"
on public.tasks
for select
using ((select auth.uid()) = user_id);

create policy "Users can insert own tasks"
on public.tasks
for insert
with check ((select auth.uid()) = user_id);

create policy "Users can update own tasks"
on public.tasks
for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own tasks"
on public.tasks
for delete
using ((select auth.uid()) = user_id);
