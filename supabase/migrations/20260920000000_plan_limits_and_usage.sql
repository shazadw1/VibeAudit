-- P6: Plan limits and usage tracking

-- plan_limits: one row per plan, seeded with values (null = unlimited)
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

-- Seed plan limits
insert into public.plan_limits (plan, scans_per_period, repos, monitored_repos, fix_attempts_per_period, certificates_per_period, exports_per_period, api_requests_per_day, team_seats)
values
  ('free',   1,    1,    0,    0,   0,    0,    0,    1),
  ('pro',    null, null, null, 50,  null, null, 1000, 1),
  ('agency', null, 15,   15,   200, null, null, 5000, 5)
on conflict (plan) do nothing;

-- RLS: authenticated users can SELECT plan_limits (no client writes)
alter table public.plan_limits enable row level security;

create policy "Authenticated users can read plan_limits" on public.plan_limits
  for select using (auth.role() = 'authenticated');

-- usage_events: append-only ledger
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('scan','repo','monitored_repo','fix_attempt','certificate','export','api_request','team_seat')),
  occurred_at timestamptz not null default now(),
  ref_id text
);

create index if not exists idx_usage_events_user_kind_time on public.usage_events(user_id, kind, occurred_at);

alter table public.usage_events enable row level security;

create policy "Users can select own usage_events" on public.usage_events
  for select using (auth.uid() = user_id);

create policy "Users can insert own usage_events" on public.usage_events
  for insert with check (auth.uid() = user_id);

-- profiles: add period columns
alter table public.profiles
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz;
