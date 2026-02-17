# Production Readiness Checklist

Use this checklist before merging to `main` and before promoting production.

## Pre-main checklist

- CI is green on the PR (`npm ci`, lint, tests, build).
- `apps/web/.npmrc` points to `https://registry.npmjs.org/` and lockfile install is reproducible.
- Supabase migration files are committed under `supabase/migrations`.
- API request validation covers malformed JSON and invalid field values.
- Auth callback errors are handled and surfaced to the login flow.
- Integration tests cover:
  - unauthenticated `401` for `/api/tasks`
  - `POST`/`PATCH`/`DELETE` happy paths
  - invalid payload `400` paths
  - user-scoping (`user_id`) query filters
- Local `.env.local` and CI env values are aligned for required variables.

## Pre-production checklist

- Google OAuth settings are correct in Google Cloud Console:
  - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
  - Authorized JavaScript origin: `https://<project-ref>.supabase.co`
- Supabase Auth URL Configuration matches deployed app URL.
- `APP_URL` points to the production app origin.
- `SUPABASE_DB_URL` secret is configured in GitHub Actions for migration job.
- Migration job succeeds on `main` push before deploy hook runs.
- Cloudflare build environment has required app and Supabase env vars.
- Manual smoke test passes:
  - Google sign-in and callback
  - task create/update/delete
  - cross-account data isolation
