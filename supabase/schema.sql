-- VibeAudit Supabase Database Schema
-- Run this script in your Supabase SQL Editor to initialize all tables, triggers, and RLS policies.

-- 1. Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 2. Create Base Table: profiles
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'agency')),
  stripe_customer_id text,
  stripe_subscription_id text,
  onboarding_completed boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  subscription_status text,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Create VibeAudit Table: repos
create table if not exists public.repos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  github_repo_id bigint not null,
  full_name text not null,
  default_branch text not null default 'main',
  installation_id bigint not null,
  connected_at timestamptz not null default now(),
  unique(user_id, github_repo_id)
);

-- 4. Create VibeAudit Table: scans
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid not null references public.repos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  score integer check (score >= 0 and score <= 100),
  commit_sha text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- 5. Create VibeAudit Table: findings
create table if not exists public.findings (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans(id) on delete cascade,
  check_type text not null,
  severity text not null check (severity in ('critical', 'high', 'medium', 'low')),
  file_path text not null,
  line integer not null default 1,
  title text not null,
  plain_english text,
  fix_suggestion text,
  cwe text
);

-- 6. Create VibeAudit Table: fix_prs
create table if not exists public.fix_prs (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid not null references public.findings(id) on delete cascade,
  scan_id uuid not null references public.scans(id) on delete cascade,
  pr_url text not null,
  status text not null default 'open' check (status in ('open', 'merged', 'closed')),
  created_at timestamptz not null default now()
);

-- 7. Create VibeAudit Table: monitoring_config
create table if not exists public.monitoring_config (
  repo_id uuid primary key references public.repos(id) on delete cascade,
  enabled boolean not null default false,
  alert_email text,
  alert_discord_webhook text
);

-- plan_limits table
create table if not exists public.plan_limits (
  plan text primary key,
  scans_per_period integer,
  repos integer,
  monitored_repos integer,
  fix_attempts_per_period integer,
  certificates_per_period integer,
  exports_per_period integer,
  api_requests_per_day integer,
  team_seats integer,
  updated_at timestamptz not null default now()
);

insert into public.plan_limits (plan, scans_per_period, repos, monitored_repos, fix_attempts_per_period, certificates_per_period, exports_per_period, api_requests_per_day, team_seats)
values
  ('free',   1,    1,    0,    0,   0,    0,    0,    1),
  ('pro',    null, null, null, 50,  null, null, 1000, 1),
  ('agency', null, 15,   15,   200, null, null, 5000, 5)
on conflict (plan) do nothing;

-- usage_events table
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('scan','repo','monitored_repo','fix_attempt','certificate','export','api_request','team_seat')),
  occurred_at timestamptz not null default now(),
  ref_id text
);

create index if not exists idx_usage_events_user_kind_time on public.usage_events(user_id, kind, occurred_at);

-- 8. Create Performance Indexes
create index if not exists idx_repos_user_id on public.repos(user_id);
create index if not exists idx_scans_repo_id on public.scans(repo_id);
create index if not exists idx_scans_user_id on public.scans(user_id);
create index if not exists idx_findings_scan_id on public.findings(scan_id);
create index if not exists idx_fix_prs_finding_id on public.fix_prs(finding_id);
create index if not exists idx_fix_prs_scan_id on public.fix_prs(scan_id);

-- 9. Create Triggers
-- Trigger: Auto-create profile on new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, plan, onboarding_completed)
  values (
    new.id,
    new.email,
    'free',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger: Update updated_at timestamp on profiles update
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

-- 10. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.repos enable row level security;
alter table public.scans enable row level security;
alter table public.findings enable row level security;
alter table public.fix_prs enable row level security;
alter table public.monitoring_config enable row level security;
alter table public.plan_limits enable row level security;
alter table public.usage_events enable row level security;

-- 11. RLS Policies
-- Profiles: Users can view and update their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Repos: Users can view, insert, update, and delete their own connected repositories
create policy "Users can view own repos" on public.repos
  for select using (auth.uid() = user_id);

create policy "Users can insert own repos" on public.repos
  for insert with check (auth.uid() = user_id);

create policy "Users can update own repos" on public.repos
  for update using (auth.uid() = user_id);

create policy "Users can delete own repos" on public.repos
  for delete using (auth.uid() = user_id);

-- Scans: Users can view, insert, and update scans for their own repositories
create policy "Users can view own scans" on public.scans
  for select using (auth.uid() = user_id);

create policy "Users can insert own scans" on public.scans
  for insert with check (auth.uid() = user_id);

create policy "Users can update own scans" on public.scans
  for update using (auth.uid() = user_id);

-- Findings: Users can view findings belonging to their own scans
create policy "Users can view findings of own scans" on public.findings
  for select using (
    exists (
      select 1 from public.scans
      where scans.id = findings.scan_id
        and scans.user_id = auth.uid()
    )
  );

create policy "Users can insert findings for own scans" on public.findings
  for insert with check (
    exists (
      select 1 from public.scans
      where scans.id = findings.scan_id
        and scans.user_id = auth.uid()
    )
  );

-- Fix PRs: Users can view, insert, and update PRs belonging to their own scans
create policy "Users can view fix_prs of own scans" on public.fix_prs
  for select using (
    exists (
      select 1 from public.scans
      where scans.id = fix_prs.scan_id
        and scans.user_id = auth.uid()
    )
  );

create policy "Users can insert fix_prs for own scans" on public.fix_prs
  for insert with check (
    exists (
      select 1 from public.scans
      where scans.id = fix_prs.scan_id
        and scans.user_id = auth.uid()
    )
  );

create policy "Users can update fix_prs for own scans" on public.fix_prs
  for update using (
    exists (
      select 1 from public.scans
      where scans.id = fix_prs.scan_id
        and scans.user_id = auth.uid()
    )
  );

-- Monitoring Config: Users can view, insert, and update monitoring config for their own repositories
create policy "Users can view monitoring_config of own repos" on public.monitoring_config
  for select using (
    exists (
      select 1 from public.repos
      where repos.id = monitoring_config.repo_id
        and repos.user_id = auth.uid()
    )
  );

create policy "Users can insert monitoring_config for own repos" on public.monitoring_config
  for insert with check (
    exists (
      select 1 from public.repos
      where repos.id = monitoring_config.repo_id
        and repos.user_id = auth.uid()
    )
  );

create policy "Users can update monitoring_config for own repos" on public.monitoring_config
  for update using (
    exists (
      select 1 from public.repos
      where repos.id = monitoring_config.repo_id
        and repos.user_id = auth.uid()
    )
  );

-- Plan Limits: Authenticated users can read; no client writes
create policy "Authenticated users can read plan_limits" on public.plan_limits
  for select using (auth.role() = 'authenticated');

-- Usage Events: Users can select and insert own rows only
create policy "Users can select own usage_events" on public.usage_events
  for select using (auth.uid() = user_id);

create policy "Users can insert own usage_events" on public.usage_events
  for insert with check (auth.uid() = user_id);

-- Plans table
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

alter table public.plans enable row level security;
create policy "Authenticated users can read plans" on public.plans
  for select using (auth.role() = 'authenticated');

-- Stripe events dedup table
create table if not exists public.stripe_events (
  event_id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
