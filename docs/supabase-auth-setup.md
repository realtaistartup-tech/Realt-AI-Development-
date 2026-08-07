# Supabase Auth setup

Real sign-in — email/password, Google, and Microsoft — replaced the earlier
mock (email-only, no verification, a hand-rolled cookie). This is a
separate setup step from [`docs/supabase-setup.md`](./supabase-setup.md)
(which covers data storage for accounts/saved searches): same Supabase
project, different keys, different concern.

## 1. Run the migration

Supabase Dashboard → **SQL Editor** → **New query** → paste the contents of
[`supabase/migrations/0002_auth.sql`](../supabase/migrations/0002_auth.sql)
→ **Run**. Safe to re-run. This bridges the existing `accounts` table to
real Supabase Auth users (without touching `accounts.id` or rewriting
`saved_searches`, so nothing existing is lost) and adds a `preferences`
column for durable housing preferences.

## 2. Set environment variables

Add to `.env.local` (already git-ignored):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon/publishable key>
```

Both are on your Supabase project's **Settings → API** page — this time
use the **anon/publishable** key (unlike `docs/supabase-setup.md`'s secret
key), because Supabase Auth is designed for the browser to call directly;
the anon key is safe to expose by design. `NEXT_PUBLIC_SUPABASE_URL` is
typically the same URL as the plain `SUPABASE_URL` you may already have
set for data access.

Without both of these set, the sign-in form shows "Sign-in isn't
configured yet" instead of a broken form — that's intentional, not a bug.

## 3. Configure Google sign-in (optional)

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs &
   Services → Credentials → **Create Credentials → OAuth client ID** (type:
   Web application).
2. Add the redirect URI Supabase gives you (Supabase Dashboard →
   Authentication → Providers → Google → shows the exact callback URL to
   paste into Google, of the form
   `https://<project-ref>.supabase.co/auth/v1/callback`).
3. Copy the generated **Client ID** and **Client secret** into the Supabase
   Dashboard's Google provider settings, and toggle it **on** there.
4. Set `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true` in this app's environment.
   The "Continue with Google" button only appears once this flag is set —
   flipping it before finishing steps 1–3 would show a button that fails
   for everyone who clicks it, so don't set it until the provider is
   actually live in the Supabase Dashboard.

## 4. Configure Microsoft sign-in (optional)

1. [Microsoft Entra admin center](https://entra.microsoft.com/) → App
   registrations → **New registration**.
2. Add the redirect URI from Supabase Dashboard → Authentication →
   Providers → **Azure** (Supabase's provider id for Microsoft/Entra ID).
3. Under **Certificates & secrets**, create a client secret. Copy the
   **Application (client) ID** and the secret's value into the Supabase
   Dashboard's Azure provider settings, and toggle it **on** there.
4. Set `NEXT_PUBLIC_AUTH_MICROSOFT_ENABLED=true` in this app's environment.
   Same rule as Google: only after the provider is live in the Dashboard.

## 5. Apple — not implemented yet

Deliberately skipped for this pass (requires a paid Apple Developer
account). The provider list (`lib/auth-providers.ts`) already has a
commented-out slot for it — adding Apple later is one new array entry plus
one new `NEXT_PUBLIC_AUTH_APPLE_ENABLED` flag, no restructuring of the
sign-in form, callback route, or session handling.

## 6. Verify it's working

1. Visit the app, click **Sign in**, create an account with email +
   password. Check **Table Editor → accounts** — a new row should appear,
   linked via `auth_user_id` (visible in **Authentication → Users** too).
2. Sign out, sign back in with the same password.
3. If you enabled Google/Microsoft: the corresponding button should now
   appear in the sign-in form; clicking it should redirect to the
   provider, then back into the app, signed in.
4. Try **Forgot password** — you should receive a real reset email; the
   link should land on `/auth/reset-password` and let you set a new one.
5. If you had existing accounts/saved searches from before this migration
   (under the old mock-auth system): sign in with that same email address
   under real auth (setting a password for the first time acts as the
   account's real "claim") — `AccountRepository.findOrCreateByAuthUser`
   links the existing row by email rather than creating a duplicate, so
   the old saved searches should still be there.

## Why this couldn't be verified from the building session

Same constraint as the data-persistence setup: this sandboxed environment
blocks outbound network access to `*.supabase.co` at the proxy level, so
no live Supabase Auth call — sign-up, sign-in, OAuth, password reset —
could be exercised end to end while writing this. The code follows
Supabase's documented `@supabase/ssr` integration pattern, and the parts
that don't require a live network call (session resolution logic, account
linking/backfill logic, the "not configured" UI state, provider buttons
only rendering when their flag is set) are covered by
`tests/unit/auth.test.ts` and `tests/unit/supabase-persistence.test.ts`
against a mocked client, plus E2E coverage of the honest unconfigured
state (`tests/e2e/saved-searches.spec.ts`). The full authenticated
round-trip (sign up → sign in → save a search → sign out) is written but
skipped in that E2E file with an explanation — un-skip it once you've
completed steps 1–2 above against a real project.
