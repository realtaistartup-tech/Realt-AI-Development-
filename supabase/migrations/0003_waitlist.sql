-- Realt AI — launch waitlist (email addresses collected on the home page).
-- Already applied to the project; safe to re-run (idempotent).
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  locale text,
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_email_lower_idx on public.waitlist (lower(email));

-- RLS on with no policies: only the server's secret key can read or write.
alter table public.waitlist enable row level security;
