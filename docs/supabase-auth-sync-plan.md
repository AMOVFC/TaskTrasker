# Supabase + Google Auth + Sync/Save Plan

This document explains how TaskTasker should use Supabase for authentication and data syncing.

## 1) Setup checklist

1. Create a Supabase project.
2. In **Authentication → Providers → Google**, enable Google and enter Client ID + Secret.
3. In **Authentication → URL Configuration**, add:
   - Site URL: `http://localhost:3000` (dev)
   - Redirect URL: `http://localhost:3000/auth/callback`
4. Add env vars from `apps/web/.env.example`.
5. Ensure database tables include a `user_id` column tied to `auth.users.id`.
6. Add RLS policies so users only read/write rows where `user_id = auth.uid()`.

## 2) Auth flow (Google OAuth)

1. User clicks **Continue with Google**.
2. Server action `signInWithGoogle` asks Supabase to generate an OAuth URL.
3. Browser redirects to Google.
4. Google redirects back to `/auth/callback` with an auth `code`.
5. Route handler exchanges `code` for a Supabase session.
6. Middleware keeps auth cookies fresh and available for SSR pages.

## 3) Save flow (single user data writes)

For creating/updating tasks:

- Use server actions or route handlers.
- Resolve session user via Supabase (`auth.getUser()`).
- Set `user_id` from authenticated user, never from client input.
- Write to normalized tables (`tasks`, `task_dependencies`, etc).
- Return canonical server state to client.

This guarantees that task ownership cannot be spoofed client-side.

## 4) Sync flow (multi-device)

Recommended approach:

- **Source of truth:** Postgres rows in Supabase.
- **Client model:** local state + `updated_at` timestamps.
- **Write pattern:** optimistic UI + server upsert.
- **Read pattern:** fetch user-scoped rows on load.
- **Realtime:** subscribe to row changes for current user to hydrate other tabs/devices.
- **Conflict strategy (v1):** last-write-wins by `updated_at`.

Later enhancement:

- Add local offline queue in IndexedDB.
- Replay queue on reconnect.
- Keep deterministic merge function for tree order/sort fields.

## 5) RLS baseline examples

```sql
-- tasks table should include: id, user_id, title, status, parent_id, due_at, sort_order, updated_at

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

## 6) Security notes

- Keep service role keys server-only (never in browser).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe for public use with RLS enabled.
- Protect all data access with RLS, even if using server actions.

## 7) What is already prepared in this repo

- Environment template for Supabase variables.
- End-to-end implementation checklist for Google OAuth setup.
- Suggested auth, save, and sync architecture for user-scoped task data.
- Starter RLS policy SQL examples for secure multi-tenant writes.

Next step is implementing the Supabase client wiring (browser/server/middleware), then connecting a UI sign-in button and task CRUD APIs to this plan.
