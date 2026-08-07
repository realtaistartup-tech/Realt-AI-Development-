-- Realt AI — real Supabase Auth migration.
--
-- How to run this: Supabase Dashboard → SQL Editor → New query → paste this
-- file → Run. Safe to re-run: every statement is idempotent.
--
-- What this does:
--   1. Bridges the existing `accounts` table (its own gen_random_uuid()
--      primary key, unrelated to Supabase Auth) to real Supabase Auth users
--      via a new `auth_user_id` column, WITHOUT touching `accounts.id` or
--      rewriting `saved_searches.account_id` — every existing saved search
--      stays exactly where it is.
--   2. Adds durable, per-account storage for housing preferences, replacing
--      the sessionStorage-only mechanism previously used
--      (hooks/use-priorities-store.ts).
--
-- Existing accounts (created under the old mock-auth system) are NOT
-- deleted or modified by this migration. They get linked to a real
-- Supabase Auth user automatically, the first time someone signs up or
-- signs in with the same email address — see
-- services/persistence/supabase/account-repository.ts#findOrCreateByAuthUser
-- for that resolution logic (matches on `accounts.email`, which was already
-- unique before this migration).

alter table accounts
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;

-- Partial unique index rather than a plain unique constraint: multiple
-- pre-migration rows will have auth_user_id = null until someone actually
-- signs in with that email under real auth, and Postgres unique
-- constraints already treat NULL as distinct from every other NULL — but
-- being explicit here (WHERE auth_user_id is not null) documents that this
-- is intentional, not an oversight.
create unique index if not exists accounts_auth_user_id_idx
  on accounts (auth_user_id)
  where auth_user_id is not null;

-- Durable per-account housing preferences (the "current" UserPriorities),
-- distinct from saved_searches.priorities (a point-in-time snapshot per
-- saved search). Nullable: an account may not have set/confirmed
-- preferences yet.
alter table accounts
  add column if not exists preferences jsonb;
