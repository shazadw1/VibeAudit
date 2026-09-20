import { SupabaseClient } from '@supabase/supabase-js';
import { PlanLimits, LimitKind } from './stripe/plans';

// Free plan defaults (fallback when plan_limits row is missing)
const FREE_DEFAULTS: PlanLimits = {
  scans_per_period: 1,
  repos: 1,
  monitored_repos: 0,
  fix_attempts_per_period: 0,
  certificates_per_period: 0,
  exports_per_period: 0,
  api_requests_per_day: 0,
  team_seats: 1,
};

export async function getPlanLimits(supabase: SupabaseClient, plan: string): Promise<PlanLimits> {
  const { data } = await supabase.from('plan_limits').select('*').eq('plan', plan).single();
  if (!data) return FREE_DEFAULTS;
  return {
    scans_per_period: data.scans_per_period ?? null,
    repos: data.repos ?? null,
    monitored_repos: data.monitored_repos ?? null,
    fix_attempts_per_period: data.fix_attempts_per_period ?? null,
    certificates_per_period: data.certificates_per_period ?? null,
    exports_per_period: data.exports_per_period ?? null,
    api_requests_per_day: data.api_requests_per_day ?? null,
    team_seats: data.team_seats ?? null,
  };
}

type PeriodProfile = {
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
};

export function currentPeriod(profile: PeriodProfile): { start: Date; end: Date } {
  if (profile.current_period_start && profile.current_period_end) {
    return {
      start: new Date(profile.current_period_start),
      end: new Date(profile.current_period_end),
    };
  }
  // Calendar month anchored on created_at day-of-month
  const anchor = new Date(profile.created_at);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), anchor.getDate());
  if (start > now) {
    start.setMonth(start.getMonth() - 1);
  }
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

// Map LimitKind to the column name in plan_limits
function limitColumn(kind: LimitKind): keyof PlanLimits {
  switch (kind) {
    case 'scan':         return 'scans_per_period';
    case 'repo':         return 'repos';
    case 'monitored_repo': return 'monitored_repos';
    case 'fix_attempt':  return 'fix_attempts_per_period';
    case 'certificate':  return 'certificates_per_period';
    case 'export':       return 'exports_per_period';
    case 'api_request':  return 'api_requests_per_day';
    case 'team_seat':    return 'team_seats';
  }
}

// Standing kinds: count current rows, not usage_events
const STANDING_KINDS = new Set<LimitKind>(['repo', 'monitored_repo', 'team_seat']);

async function countUsage(
  supabase: SupabaseClient,
  userId: string,
  kind: LimitKind,
  period: { start: Date; end: Date }
): Promise<number> {
  if (kind === 'repo') {
    const { count } = await supabase
      .from('repos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    return count ?? 0;
  }

  if (kind === 'monitored_repo') {
    // Count monitoring_config rows with enabled=true for repos owned by user
    const { count } = await supabase
      .from('monitoring_config')
      .select('repo_id', { count: 'exact', head: true })
      .eq('enabled', true)
      .in(
        'repo_id',
        (await supabase.from('repos').select('id').eq('user_id', userId)).data?.map((r: { id: string }) => r.id) ?? []
      );
    return count ?? 0;
  }

  if (kind === 'team_seat') {
    // No seats table yet — the current user is always 1 seat
    return 1;
  }

  // Period-based: count from usage_events
  let start: string;
  let end: string;
  if (kind === 'api_request') {
    // api_request uses last 24 hours, not billing period
    const now = new Date();
    start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    end = now.toISOString();
  } else {
    start = period.start.toISOString();
    end = period.end.toISOString();
  }

  const { count } = await supabase
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', kind)
    .gte('occurred_at', start)
    .lte('occurred_at', end);
  return count ?? 0;
}

type CheckProfile = {
  plan: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
};

export async function checkLimit(
  supabase: SupabaseClient,
  userId: string,
  kind: LimitKind,
  profile: CheckProfile
): Promise<{ ok: true } | { ok: false; response: Response }> {
  const limits = await getPlanLimits(supabase, profile.plan);
  const col = limitColumn(kind);
  const max = limits[col];

  // null = unlimited
  if (max === null) return { ok: true };

  const period = currentPeriod(profile);
  const used = await countUsage(supabase, userId, kind, period);

  if (used >= max) {
    return {
      ok: false,
      response: limitExceededResponse(kind, used, max, period.end),
    };
  }

  return { ok: true };
}

export async function recordUsage(
  supabase: SupabaseClient,
  userId: string,
  kind: LimitKind,
  refId?: string
): Promise<void> {
  await supabase.from('usage_events').insert({ user_id: userId, kind, ref_id: refId ?? null });
}

export function limitExceededResponse(kind: LimitKind, used: number, max: number, periodEnd: Date): Response {
  return Response.json(
    {
      error: 'Plan limit reached',
      code: 'plan_limit_exceeded',
      limit: { kind, used, max, period_end: periodEnd.toISOString() },
      upgrade: '/settings/billing',
    },
    { status: 402 }
  );
}
