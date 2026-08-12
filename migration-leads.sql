-- ============================================================================
-- Flowline — migration: add lead capture support (Services / consulting page)
-- Run this in Supabase SQL Editor if your project already exists. If you're
-- setting up a brand new project instead, just run the current schema.sql —
-- it already includes this table.
-- ============================================================================

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  company text,
  interest text not null default 'general',  -- 'consulting' | 'training' | 'custom-tools' | 'general'
  message text,
  page_url text,
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

drop policy if exists "Anyone can submit a lead" on public.leads;
create policy "Anyone can submit a lead"
  on public.leads for insert
  with check (true);

-- Note: intentionally no select/update/delete policy for the public API —
-- anonymous visitors can submit a lead but can't read anyone's submissions
-- back, including their own. View leads in Supabase's Table Editor, which
-- uses your own account access rather than the public API these policies
-- govern.
