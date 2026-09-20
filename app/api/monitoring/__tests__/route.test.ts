import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn();
  const mockCheckLimit = vi.fn();
  const mockRecordUsage = vi.fn();
  return { mockGetUser, mockFrom, mockCheckLimit, mockRecordUsage };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mocks.mockGetUser },
    from: mocks.mockFrom,
  })),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({ ok: true })),
  clientKey: vi.fn(() => 'key'),
  tooManyRequests: vi.fn(),
}));

vi.mock('@/lib/entitlements', () => ({
  checkLimit: mocks.mockCheckLimit,
  recordUsage: mocks.mockRecordUsage,
}));

import { POST } from '@/app/api/monitoring/route';

const MOCK_USER = { id: 'user-123' };
const MOCK_PROFILE = {
  plan: 'free',
  current_period_start: null,
  current_period_end: null,
  created_at: '2026-01-01T00:00:00.000Z',
};
const MOCK_REPO = { id: '00000000-0000-0000-0000-000000000001' };

function makeRequest(body: object) {
  return {
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Request;
}

describe('POST /api/monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mocks.mockCheckLimit.mockResolvedValue({ ok: true });
    mocks.mockRecordUsage.mockResolvedValue(undefined);
  });

  function setupFrom(repoData: object | null, profileData: object | null, upsertError: object | null = null) {
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === 'repos') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: repoData }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: profileData }),
        };
      }
      if (table === 'monitoring_config') {
        return {
          upsert: vi.fn().mockResolvedValue({ error: upsertError }),
        };
      }
      return {};
    });
  }

  it('returns 404 when repo is not owned by user', async () => {
    setupFrom(null, MOCK_PROFILE);
    const res = await POST(makeRequest({ repoId: '00000000-0000-0000-0000-000000000001', enabled: true }));
    expect(res.status).toBe(404);
  });

  it('returns 402 when monitored_repo limit reached on enable', async () => {
    setupFrom(MOCK_REPO, MOCK_PROFILE);
    const limitResponse = Response.json(
      { error: 'Plan limit reached', code: 'plan_limit_exceeded', limit: { kind: 'monitored_repo', used: 0, max: 0, period_end: new Date().toISOString() }, upgrade: '/settings/billing' },
      { status: 402 }
    );
    mocks.mockCheckLimit.mockResolvedValue({ ok: false, response: limitResponse });

    const res = await POST(makeRequest({ repoId: '00000000-0000-0000-0000-000000000001', enabled: true }));
    expect(res.status).toBe(402);
  });

  it('disabling monitoring always succeeds without checking limit', async () => {
    setupFrom(MOCK_REPO, MOCK_PROFILE);

    const res = await POST(makeRequest({ repoId: '00000000-0000-0000-0000-000000000001', enabled: false }));
    expect(res.status).toBe(200);
    expect(mocks.mockCheckLimit).not.toHaveBeenCalled();
  });

  it('returns 200 and records usage on successful enable', async () => {
    setupFrom(MOCK_REPO, MOCK_PROFILE);

    const res = await POST(makeRequest({ repoId: '00000000-0000-0000-0000-000000000001', enabled: true }));
    expect(res.status).toBe(200);
    expect(mocks.mockRecordUsage).toHaveBeenCalledWith(expect.anything(), MOCK_USER.id, 'monitored_repo', '00000000-0000-0000-0000-000000000001');
  });
});
