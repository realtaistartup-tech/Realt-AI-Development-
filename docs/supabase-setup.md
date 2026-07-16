# Supabase setup

Accounts and saved searches switch from the in-memory mock repositories to
real Supabase-backed ones automatically once two environment variables are
set — no code changes. Property data stays mock regardless (see
`docs/roadmap-v1.md` item #8); there's no properties table in this
migration on purpose.

## 1. Run the migration

Supabase Dashboard → **SQL Editor** → **New query** → paste the contents of
[`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql)
→ **Run**.

This creates two tables (`accounts`, `saved_searches`), an index, and
enables Row Level Security on both with no policies for the anon/
authenticated roles — meaning only the secret key (which bypasses RLS) can
read or write them. The app never uses the publishable key for direct
database access, so this is the correct, minimal setup, not a placeholder
to fill in later.

Safe to re-run: every statement is idempotent.

## 2. Set environment variables

Add to `.env.local` (already git-ignored — never commit real values):

```bash
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SECRET_KEY=<your secret key, starts with sb_secret_>
```

Both are on your Supabase project's **Settings → API** page. Use the
**secret** key here, not the publishable one — this app talks to Supabase
only from the server (Next.js route handlers), never from the browser, so
the code is written against the key that bypasses RLS by design.

`SESSION_SECRET` (see `.env.example`) is unrelated to Supabase but also
required for the mock-auth session cookie to be trustworthy — set it too
if you haven't already.

## 3. Verify it's working

With both variables set, `npm run dev` (or `build`/`start`) will route
`getAccountRepository()` and `getSavedSearchRepository()` to the Supabase
implementations instead of the mocks — this happens automatically in
`services/persistence/index.ts`, nothing else to configure.

To confirm end-to-end:

1. Sign in from the header with any email.
2. Run through onboarding to recommendations, click "Save this search."
3. Check the Supabase dashboard's **Table Editor** — you should see one row
   in `accounts` and one in `saved_searches`.
4. Visit `/my-searches` — the saved search should list, with a working
   "View matches" and delete.

If nothing appears, check your server logs — the repositories throw
descriptive errors (e.g. `Failed to save search: <message from Supabase>`)
rather than failing silently.

## Why this couldn't be verified from the building session

The sandboxed environment this integration was built in blocks outbound
network access to `*.supabase.co` at the proxy level (an organization
network policy, not a bug) — every Supabase call from that environment
fails with a `403` before it reaches Supabase at all. The code was written
against Supabase's documented client behavior and covered by unit tests
against a mocked client (`tests/unit/supabase-persistence.test.ts`), but
the live connection has not been exercised by the agent that wrote it.
Steps 1–3 above are how to close that gap.

## What's still mocked on purpose

- **Property data** (`lib/mock-properties.ts`) — no table for this exists
  yet; see `docs/roadmap-v1.md` item #8.
- **Authentication itself** — signing in still doesn't verify the email
  belongs to the person entering it (no password, no magic link actually
  sent). Real verification is Supabase Auth (or similar), a separate piece
  of work from the persistence layer this document covers.
