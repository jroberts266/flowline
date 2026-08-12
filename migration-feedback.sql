-- ============================================================================
-- Flowline — migration: add contact/feedback form support
-- Run this in Supabase SQL Editor if your project already exists (i.e. you
-- already ran schema.sql and/or migration-trial.sql before). If you're
-- setting up a brand new project instead, just run the current schema.sql —
-- it already includes this table.
-- ============================================================================

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  category text not null default 'general',  -- 'bug' | 'feature' | 'billing' | 'general'
  message text not null,
  page_url text,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "Anyone can submit feedback" on public.feedback;
create policy "Anyone can submit feedback"
  on public.feedback for insert
  with check (true);

-- Note: intentionally no select/update/delete policy for the public API —
-- that means anonymous visitors can submit feedback but can't read anyone
-- else's (or their own, after submitting). You'll view submissions in
-- Supabase's Table Editor, which uses your own account access rather than
-- the public API these policies govern.
