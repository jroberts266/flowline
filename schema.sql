-- ============================================================================
-- Flowline — Supabase schema
-- Run this once in your Supabase project: SQL Editor → New query → paste → Run
-- ============================================================================

-- ---------------------------------------------------------------------------
-- subscriptions: one row per user, tracks their Stripe subscription status.
-- Only written by the Stripe webhook function (using the service role key),
-- never directly by the browser — that's why there's no insert/update policy
-- for regular users below, only a select policy.
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  user_id uuid references auth.users(id) on delete cascade primary key,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'none',   -- 'active' | 'trialing' | 'past_due' | 'canceled' | 'none'
  price_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can view their own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- saved_items: the actual tool data (a VSM, an A3, etc.) a user has saved.
-- `tool` matches the page it came from (e.g. 'vsm', 'a3', 'kpi').
-- `data` is the same JSON shape each tool already exports today.
-- ---------------------------------------------------------------------------
create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tool text not null,
  title text not null default 'Untitled',
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.saved_items enable row level security;

create policy "Users can view their own saved items"
  on public.saved_items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own saved items"
  on public.saved_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own saved items"
  on public.saved_items for update
  using (auth.uid() = user_id);

create policy "Users can delete their own saved items"
  on public.saved_items for delete
  using (auth.uid() = user_id);

-- keep updated_at current on every edit
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists saved_items_updated_at on public.saved_items;
create trigger saved_items_updated_at
  before update on public.saved_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a 'none' subscription row whenever a new user signs up, so the
-- frontend can always assume the row exists (simplifies the client code).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.subscriptions (user_id, status)
  values (new.id, 'none')
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
