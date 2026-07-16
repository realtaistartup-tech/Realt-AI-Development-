-- Realt AI — initial schema: accounts and saved searches.
--
-- How to run this:
--   Supabase Dashboard → SQL Editor → New query → paste this file → Run.
-- Safe to re-run: every statement is idempotent (IF NOT EXISTS / guarded).
--
-- What this backs: services/persistence/supabase/ (AccountRepository,
-- SavedSearchRepository). Property data is NOT included here — it stays
-- mock data (lib/mock-properties.ts) until a real Swedish listings source
-- is chosen; see docs/roadmap-v1.md.

create extension if not exists pgcrypto;

-- One row per person who has signed in (mock auth today — see
-- docs/architecture.md — but the shape doesn't change when that becomes
-- real Supabase Auth: email stays the natural identity to key on).
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- One row per "Save this search" click. priorities is the full
-- UserPriorities object as JSON — same shape the app already validates
-- with Zod (lib/validation.ts#userPrioritiesSchema) before it ever reaches
-- here, so this table doesn't re-encode that structure in SQL columns.
create table if not exists saved_searches (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  priorities jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists saved_searches_account_id_idx
  on saved_searches (account_id);

-- Row Level Security: the app only ever talks to these tables from the
-- server, using the secret key (which bypasses RLS by design — that's
-- what makes it the secret key). RLS is still enabled here as
-- defense-in-depth: with RLS on and zero policies defined for the
-- anon/authenticated roles, any request made with the publishable key
-- (e.g. if it were ever used directly from the browser, now or in the
-- future) is denied by default rather than silently allowed.
alter table accounts enable row level security;
alter table saved_searches enable row level security;
