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

import { POST } from '@/app/api/fix/generate/route';

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

describe('POST /api/fix/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mocks.mockCheckLimit.mockResolvedValue({ ok: true });
    mocks.mockRecordUsage.mockResolvedValue(undefined);
    mocks.mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_PROFILE }),
    });
  });

  it('returns 402 when fix_attempt limit reached', async () => {
    const limitResponse = Response.json(
      { error: 'Plan limit reached', code: 'plan_limit_exceeded', limit: { kind: 'fix_attempt', used: 0, max: 0, period_end: new Date().toISOString() }, upgrade: '/settings/billing' },
      { status: 402 }
    );
    mocks.mockCheckLimit.mockResolvedValue({ ok: false, response: limitResponse });

    const res = await POST(makeRequest({ findingId: 'finding-1', repoId: 'repo-1' }));
    expect(res.status).toBe(402);
    expect(mocks.mockRecordUsage).not.toHaveBeenCalled();
  });

  it('returns simulated response and calls recordUsage when under limit', async () => {
    const res = await POST(makeRequest({ findingId: 'finding-1', repoId: 'repo-1' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.simulated).toBe(true);
    expect(mocks.mockRecordUsage).toHaveBeenCalledWith(expect.anything(), MOCK_USER.id, 'fix_attempt', 'finding-1');
  });
});
