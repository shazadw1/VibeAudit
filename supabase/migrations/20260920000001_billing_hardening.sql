-- Create public.plans table
create table if not exists public.plans (
  id text primary key,
  name text not null,
  description text not null default '',
  price_monthly integer not null default 0,
  price_annual integer not null default 0,
  stripe_price_id_monthly text,
  stripe_price_id_annual text,
  features jsonb not null default '[]',
  display_order integer not null default 0,
  active boolean not null default true
);

-- Seed rows (prices in dollars; env vars filled at runtime but seeds use null — the application reads env vars directly for Stripe calls)
insert into public.plans (id, name, description, price_monthly, price_annual, stripe_price_id_monthly, stripe_price_id_annual, features, display_order)
values
  ('free',   'Free',   'Perfect for solo developers testing AI security scans on personal projects.',  0,  0,   null, null, '["1 scan/month","Score only + top issue teaser"]', 0),
  ('pro',    'Pro',    'For startups and fast-shipping teams requiring continuous protection.',          29, 23,  null, null, '["Unlimited scans","Full plain-English report","AI Fix PRs","Continuous monitoring"]', 1),
  ('agency', 'Agency', 'For software agencies managing client codebases and compliance standards.',     99, 79,  null, null, '["15 repos","White-label reports","VibeAudit Verified badge"]', 2)
on conflict (id) do nothing;

-- RLS: authenticated can read; no client writes
alter table public.plans enable row level security;
create policy "Authenticated users can read plans" on public.plans
  for select using (auth.role() = 'authenticated');

-- Create stripe_events table (dedup table)
create table if not exists public.stripe_events (
  event_id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
-- No RLS policy for client — service-role only
alter table public.stripe_events enable row level security;

-- Add subscription_status and cancel_at_period_end to profiles
alter table public.profiles
  add column if not exists subscription_status text,
  add column if not exists cancel_at_period_end boolean not null default false;

-- Replace blanket update policy on profiles with column-restricted one
drop policy if exists "Users can update own profile" on public.profiles;

-- Allow users to update only safe columns (email, onboarding_completed)
create policy "Users can update own profile safe columns" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- Revoke update on billing columns from authenticated role
-- (Supabase's authenticated role maps to the JWT-authenticated user)
revoke update (plan, stripe_customer_id, stripe_subscription_id, subscription_status, cancel_at_period_end, current_period_start, current_period_end) on public.profiles from authenticated;
