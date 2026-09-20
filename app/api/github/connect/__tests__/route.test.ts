import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn();
  const mockSyncInstallationRepos = vi.fn();
  const mockCheckLimit = vi.fn();
  const mockRecordUsage = vi.fn();
  const mockGetPlanLimits = vi.fn();
  return { mockGetUser, mockFrom, mockSyncInstallationRepos, mockCheckLimit, mockRecordUsage, mockGetPlanLimits };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mocks.mockGetUser },
    from: mocks.mockFrom,
  })),
}));

vi.mock('@/lib/github/app', () => ({
  syncInstallationRepos: mocks.mockSyncInstallationRepos,
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({ ok: true })),
  clientKey: vi.fn(() => 'key'),
  tooManyRequests: vi.fn(),
}));

vi.mock('@/lib/entitlements', () => ({
  getPlanLimits: mocks.mockGetPlanLimits,
  checkLimit: mocks.mockCheckLimit,
  recordUsage: mocks.mockRecordUsage,
}));

import { POST } from '@/app/api/github/connect/route';

const MOCK_USER = { id: 'user-123' };
const MOCK_PROFILE = {
  plan: 'free',
  current_period_start: null,
  current_period_end: null,
  created_at: '2026-01-01T00:00:00.000Z',
};

function makeRequest(body: object) {
  return {
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Request;
}

describe('POST /api/github/connect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mocks.mockCheckLimit.mockResolvedValue({ ok: true });
    mocks.mockRecordUsage.mockResolvedValue(undefined);
    mocks.mockGetPlanLimits.mockResolvedValue({ repos: null, scans_per_period: null, monitored_repos: null, fix_attempts_per_period: null, certificates_per_period: null, exports_per_period: null, api_requests_per_day: null, team_seats: null });
    mocks.mockSyncInstallationRepos.mockResolvedValue([{ id: 'repo-1' }]);
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: MOCK_PROFILE }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      // repos: for cap-enforcement queries (count, select, delete)
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], count: 0 }),
        in: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        then: undefined,
      };
    });
  });

  it('returns 402 and does not call syncInstallationRepos when repo limit reached', async () => {
    const limitResponse = Response.json(
      { error: 'Plan limit reached', code: 'plan_limit_exceeded', limit: { kind: 'repo', used: 1, max: 1, period_end: new Date().toISOString() }, upgrade: '/settings/billing' },
      { status: 402 }
    );
    mocks.mockCheckLimit.mockResolvedValue({ ok: false, response: limitResponse });

    const res = await POST(makeRequest({ installation_id: 123 }));
    expect(res.status).toBe(402);
    expect(mocks.mockSyncInstallationRepos).not.toHaveBeenCalled();
  });

  it('calls syncInstallationRepos and recordUsage when under limit', async () => {
    const res = await POST(makeRequest({ installation_id: 123 }));
    expect(res.status).toBe(200);
    expect(mocks.mockSyncInstallationRepos).toHaveBeenCalledWith(MOCK_USER.id, 123);
    expect(mocks.mockRecordUsage).toHaveBeenCalledWith(expect.anything(), MOCK_USER.id, 'repo');
  });
});
