# Supabase + Google Auth + Sync/Save Plan

This document explains how TaskTrasker should use Supabase for authentication and data syncing.

## 1) Setup checklist

1. Create a Supabase project.
2. In **Authentication > Providers > Google**, enable Google and enter Client ID + Secret.
3. In Google Cloud Console, configure OAuth Web Client with:
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Authorized JavaScript origins:
     - `https://<project-ref>.supabase.co`
     - `http://localhost:3000`
4. In **Authentication > URL Configuration**, add:
   - Site URL: `http://localhost:3000` (dev)
   - Redirect URL: `http://localhost:3000/auth/callback`
5. Add env vars from `apps/web/.env.example` (prefer `APP_URL` for server-side redirect construction).
6. Apply migrations from `supabase/migrations` using `supabase db push --db-url "$SUPABASE_DB_URL" --include-all`.
7. Ensure database tables include a `user_id` column tied to `auth.users.id`.
8. Add RLS policies so users only read/write rows where `user_id = auth.uid()`.

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
- Validate request payloads at runtime before DB writes.
- Write to normalized tables (`tasks`, `task_dependencies`, etc).
- Return canonical server state to client.

This guarantees task ownership cannot be spoofed client-side.

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

Canonical migration lives in:

- `supabase/migrations/202602150001_create_tasks_table_and_rls.sql`

Core policy model:

```sql
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
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`) is safe for public use with RLS enabled.
- Prefer `APP_URL` for server-side redirect construction; keep `NEXT_PUBLIC_APP_URL` only as compatibility fallback.
- Protect all data access with RLS, even if using server actions.

## 7) What is already prepared in this repo

- Environment template for Supabase variables.
- End-to-end implementation checklist for Google OAuth setup.
- Migration source-of-truth in `supabase/migrations`.
- Suggested auth, save, and sync architecture for user-scoped task data.
