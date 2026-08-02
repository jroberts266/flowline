-- ============================================================================
-- Flowline — migration: add 10-day free trial support
-- Run this in Supabase SQL Editor if you already ran the original schema.sql
-- (i.e. your subscriptions table already exists). If you're setting up a
-- brand new project instead, just run the updated schema.sql — it already
-- includes everything below.
-- ============================================================================

-- 1. Add the new column (safe to re-run — won't error if it already exists)
alter table public.subscriptions add column if not exists trial_ends_at timestamptz;

-- 2. Replace the new-user trigger so future sign-ups get a 10-day trial
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.subscriptions (user_id, status, trial_ends_at)
  values (new.id, 'none', now() + interval '10 days')
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Backfill: give any existing accounts (created before this migration,
-- e.g. your own test accounts) a fresh 10-day trial starting now, but only
-- if they don't already have paid/active status and don't already have a
-- trial_ends_at set. Safe to run more than once.
update public.subscriptions
set trial_ends_at = now() + interval '10 days'
where trial_ends_at is null
  and status not in ('active', 'trialing');
