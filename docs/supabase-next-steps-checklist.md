# Supabase Google Auth + Sync: What To Do Next

Use this as the execution checklist after the initial preparation docs.

## Phase 1 — Supabase project setup (required)

1. Create a Supabase project.
2. Open **Authentication → Providers → Google** and enable Google.
3. In Google Cloud Console, create OAuth credentials and paste:
   - Google Client ID
   - Google Client Secret
4. In Supabase **Authentication → URL Configuration** set:
   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/auth/callback`

## Phase 2 — Local environment

Create `apps/web/.env.local` from `apps/web/.env.example` and fill real values:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Required values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (recommended)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy fallback)
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`

## Phase 3 — Database tables + security

Create the minimum `tasks` table and enable RLS.

```sql
create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.tasks(id) on delete cascade,
  title text not null,
  status text not null default 'todo',
  due_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "Users can select own tasks"
on public.tasks
for select
using (auth.uid() = user_id);

create policy "Users can insert own tasks"
on public.tasks
for insert
with check (auth.uid() = user_id);

create policy "Users can update own tasks"
on public.tasks
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own tasks"
on public.tasks
for delete
using (auth.uid() = user_id);
```

## Phase 4 — App integration (first implementation)

1. Install Supabase packages in `apps/web`:
   - `@supabase/supabase-js`
   - `@supabase/ssr`
2. Add these app files:
   - Supabase browser client
   - Supabase server client
   - `middleware.ts` to refresh auth session cookies
   - `/auth/callback` route to exchange auth code for session
3. Add a **Continue with Google** button that calls server action/route to start OAuth.
4. On authenticated app load, fetch `tasks` scoped to current user.
5. On create/update/delete task, write from server context and set `user_id` from auth session.

## Phase 5 — Sync behavior (v1)

1. Use optimistic updates in UI.
2. Persist each mutation to Supabase immediately.
3. Subscribe to realtime row changes for `public.tasks` scoped to current user.
4. Reconcile remote events by `updated_at` (last write wins for v1).

## Phase 6 — Validation checklist

- Google sign-in succeeds and redirects back to app.
- New users can only see their own rows.
- User A cannot read User B task rows (verify with two accounts).
- Task create/update/delete works after refresh and on second device/browser.
- Session persists across page reloads.

## If package install is blocked in your environment

If you hit npm registry restrictions (403), use a network-permitted environment/CI runner for package install, then continue with the same checklist.
