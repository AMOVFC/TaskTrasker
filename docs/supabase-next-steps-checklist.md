# Supabase Google Auth + Sync: What To Do Next

Use this as the execution checklist after the initial preparation docs.

## Phase 1 - Supabase and Google setup (required)

1. Create a Supabase project.
2. Open **Authentication > Providers > Google** and enable Google.
3. In Google Cloud Console, create an OAuth 2.0 Web Client and set:
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Authorized JavaScript origins:
     - `https://<project-ref>.supabase.co`
     - `http://localhost:3000` (for local app testing)
4. Copy Google credentials into Supabase:
   - Google Client ID
   - Google Client Secret
5. In Supabase **Authentication > URL Configuration** set:
   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/auth/callback`

## Phase 2 - Local environment

Create `apps/web/.env.local` from `apps/web/.env.example` and fill real values:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Required values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (recommended)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy fallback)
- `APP_URL=http://localhost:3000` (preferred for server-side OAuth redirects)
- `NEXT_PUBLIC_APP_URL=http://localhost:3000` (legacy fallback)

## Phase 3 - Database tables + security

Use migration files in `supabase/migrations` as the source of truth.  
Current baseline migration:

- `supabase/migrations/202602150001_create_tasks_table_and_rls.sql`

Apply migrations through the deployment pipeline (CI) or locally:

```bash
supabase db push --db-url "$SUPABASE_DB_URL" --include-all
```

The migration includes:

- `public.tasks` table
- status check constraint
- task indexes for user/status/due-date/tree traversal
- `updated_at` trigger
- row level security policies for select/insert/update/delete

## Phase 4 - App integration (first implementation)

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

## Phase 5 - Sync behavior (v1)

1. Use optimistic updates in UI.
2. Persist each mutation to Supabase immediately.
3. Subscribe to realtime row changes for `public.tasks` scoped to current user.
4. Reconcile remote events by `updated_at` (last write wins for v1).

## Phase 6 - Validation checklist

- Google sign-in succeeds and redirects back to app.
- New users can only see their own rows.
- User A cannot read User B task rows (verify with two accounts).
- Task create/update/delete works after refresh and on second device/browser.
- Session persists across page reloads.

## If package install is blocked in your environment

If you hit npm registry restrictions (403), pin the registry in `apps/web/.npmrc` and use a network-permitted CI runner for `npm ci`.
