import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkLimit, recordUsage, limitExceededResponse, currentPeriod, getPlanLimits } from '../entitlements';

function makeSupabase(overrides: Record<string, unknown> = {}) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      ...overrides,
    }),
    ...overrides,
  } as any;
}

const BASE_PROFILE = {
  plan: 'free',
  current_period_start: null as string | null,
  current_period_end: null as string | null,
  created_at: '2026-01-15T00:00:00.000Z',
};

describe('limitExceededResponse', () => {
  it('returns 402 with correct body shape', async () => {
    const periodEnd = new Date('2026-10-15T00:00:00.000Z');
    const res = limitExceededResponse('scan', 1, 1, periodEnd);
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.code).toBe('plan_limit_exceeded');
    expect(body.error).toBe('Plan limit reached');
    expect(body.limit.kind).toBe('scan');
    expect(body.limit.used).toBe(1);
    expect(body.limit.max).toBe(1);
    expect(body.limit.period_end).toBe(periodEnd.toISOString());
    expect(body.upgrade).toBe('/settings/billing');
  });
});

describe('currentPeriod', () => {
  it('uses period columns when both are set', () => {
    const profile = {
      current_period_start: '2026-09-01T00:00:00.000Z',
      current_period_end: '2026-10-01T00:00:00.000Z',
      created_at: '2026-01-15T00:00:00.000Z',
    };
    const period = currentPeriod(profile);
    expect(period.start.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(period.end.toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });

  it('falls back to calendar month from created_at when period columns are null', () => {
    const profile = {
      current_period_start: null,
      current_period_end: null,
      created_at: '2026-01-15T00:00:00.000Z',
    };
    const period = currentPeriod(profile);
    // start should be the 15th of some month, end the 15th of next month
    expect(period.start.getDate()).toBe(15);
    expect(period.end.getTime()).toBeGreaterThan(period.start.getTime());
  });
});

describe('checkLimit', () => {
  it('returns ok:true when limit is null (unlimited)', async () => {
    // pro plan — scans_per_period is null
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'plan_limits') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { scans_per_period: null, repos: null, monitored_repos: null, fix_attempts_per_period: null, certificates_per_period: null, exports_per_period: null, api_requests_per_day: null, team_seats: null },
            }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, count: 0 }) };
      }),
    } as any;

    const result = await checkLimit(supabase, 'user-1', 'scan', { ...BASE_PROFILE, plan: 'pro' });
    expect(result.ok).toBe(true);
  });

  it('returns ok:false with 402 when count is at max', async () => {
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'plan_limits') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { scans_per_period: 1, repos: 1, monitored_repos: 0, fix_attempts_per_period: 0, certificates_per_period: 0, exports_per_period: 0, api_requests_per_day: 0, team_seats: 1 },
            }),
          };
        }
        if (table === 'usage_events') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(), then: undefined, count: 1, data: [], error: null };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ count: 1 }) };
      }),
    } as any;

    // We'll mock the count directly
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'plan_limits') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { scans_per_period: 1, repos: 1, monitored_repos: 0, fix_attempts_per_period: 0, certificates_per_period: 0, exports_per_period: 0, api_requests_per_day: 0, team_seats: 1 },
          }),
        };
      }
      // usage_events count query — returns count: 1
      const chain: any = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.gte = vi.fn().mockReturnValue(chain);
      chain.lte = vi.fn().mockReturnValue(chain);
      chain.in = vi.fn().mockReturnValue(chain);
      // The chain eventually resolves
      Object.defineProperty(chain, 'then', {
        value: (resolve: (v: any) => void) => resolve({ data: [], count: 1, error: null }),
        configurable: true,
      });
      return chain;
    });

    const result = await checkLimit({ from: mockFrom } as any, 'user-1', 'scan', BASE_PROFILE);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(402);
    }
  });

  it('returns ok:true when count is below max', async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'plan_limits') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { scans_per_period: 5, repos: 1, monitored_repos: 0, fix_attempts_per_period: 0, certificates_per_period: 0, exports_per_period: 0, api_requests_per_day: 0, team_seats: 1 },
          }),
        };
      }
      const chain: any = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.gte = vi.fn().mockReturnValue(chain);
      chain.lte = vi.fn().mockReturnValue(chain);
      chain.in = vi.fn().mockReturnValue(chain);
      Object.defineProperty(chain, 'then', {
        value: (resolve: (v: any) => void) => resolve({ data: [], count: 2, error: null }),
        configurable: true,
      });
      return chain;
    });

    const result = await checkLimit({ from: mockFrom } as any, 'user-1', 'scan', BASE_PROFILE);
    expect(result.ok).toBe(true);
  });

  // Table-driven: all 8 kinds blocked at their respective max
  const periodKindCases: Array<{ kind: Parameters<typeof checkLimit>[2]; column: string; max: number }> = [
    { kind: 'fix_attempt',  column: 'fix_attempts_per_period',  max: 1 },
    { kind: 'certificate',  column: 'certificates_per_period',  max: 1 },
    { kind: 'export',       column: 'exports_per_period',       max: 1 },
    { kind: 'api_request',  column: 'api_requests_per_day',     max: 1 },
  ];

  for (const { kind, column, max } of periodKindCases) {
    it(`blocks ${kind} when at max (period kind)`, async () => {
      const limitsRow: Record<string, number | null> = {
        scans_per_period: null, repos: null, monitored_repos: null,
        fix_attempts_per_period: null, certificates_per_period: null,
        exports_per_period: null, api_requests_per_day: null, team_seats: null,
      };
      limitsRow[column] = max;

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'plan_limits') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: limitsRow }) };
        }
        const chain: any = {};
        chain.select = vi.fn().mockReturnValue(chain);
        chain.eq = vi.fn().mockReturnValue(chain);
        chain.gte = vi.fn().mockReturnValue(chain);
        chain.lte = vi.fn().mockReturnValue(chain);
        chain.in = vi.fn().mockReturnValue(chain);
        Object.defineProperty(chain, 'then', {
          value: (resolve: (v: any) => void) => resolve({ count: max, error: null }),
          configurable: true,
        });
        return chain;
      });

      const result = await checkLimit({ from: mockFrom } as any, 'user-1', kind, BASE_PROFILE);
      expect(result.ok).toBe(false);
    });
  }

  it('blocks repo (standing kind) when at max', async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'plan_limits') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { scans_per_period: null, repos: 1, monitored_repos: null, fix_attempts_per_period: null, certificates_per_period: null, exports_per_period: null, api_requests_per_day: null, team_seats: null } }) };
      }
      // repos table: count = 1 (at max)
      const chain: any = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      Object.defineProperty(chain, 'then', {
        value: (resolve: (v: any) => void) => resolve({ count: 1, error: null }),
        configurable: true,
      });
      return chain;
    });
    const result = await checkLimit({ from: mockFrom } as any, 'user-1', 'repo', BASE_PROFILE);
    expect(result.ok).toBe(false);
  });

  it('blocks monitored_repo (standing kind) when at max', async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'plan_limits') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { scans_per_period: null, repos: null, monitored_repos: 1, fix_attempts_per_period: null, certificates_per_period: null, exports_per_period: null, api_requests_per_day: null, team_seats: null } }) };
      }
      // repos + monitoring_config: both need to return count
      const chain: any = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.in = vi.fn().mockReturnValue(chain);
      Object.defineProperty(chain, 'then', {
        value: (resolve: (v: any) => void) => resolve({ data: [{ id: 'r1' }], count: 1, error: null }),
        configurable: true,
      });
      return chain;
    });
    const result = await checkLimit({ from: mockFrom } as any, 'user-1', 'monitored_repo', BASE_PROFILE);
    expect(result.ok).toBe(false);
  });

  it('team_seat always returns 1 (standing count)', async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'plan_limits') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { scans_per_period: null, repos: null, monitored_repos: null, fix_attempts_per_period: null, certificates_per_period: null, exports_per_period: null, api_requests_per_day: null, team_seats: 5 },
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ count: 0 }) };
    });

    const result = await checkLimit({ from: mockFrom } as any, 'user-1', 'team_seat', { ...BASE_PROFILE, plan: 'agency' });
    // count = 1, max = 5, so ok
    expect(result.ok).toBe(true);
  });
});
