import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn();
  const mockSessionsCreate = vi.fn();
  const mockSubscriptionsUpdate = vi.fn();
  const mockSubscriptionsRetrieve = vi.fn();
  const mockCustomersCreate = vi.fn();
  return { mockGetUser, mockFrom, mockSessionsCreate, mockSubscriptionsUpdate, mockSubscriptionsRetrieve, mockCustomersCreate };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: mocks.mockGetUser() } }) },
    from: mocks.mockFrom,
  })),
}));

vi.mock('@/lib/stripe/client', () => ({
  getStripe: vi.fn(() => ({
    checkout: { sessions: { create: mocks.mockSessionsCreate } },
    subscriptions: { update: mocks.mockSubscriptionsUpdate, retrieve: mocks.mockSubscriptionsRetrieve },
    customers: { create: mocks.mockCustomersCreate },
  })),
}));

import { POST } from '@/app/api/stripe/checkout/route';

function makeRequest(body: object) {
  return {
    json: async () => body,
    url: 'http://localhost/api/stripe/checkout',
  } as unknown as Request;
}

describe('POST /api/stripe/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID = 'price_pro_monthly';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost';
  });

  it('new subscriber gets a checkout session url', async () => {
    mocks.mockGetUser.mockReturnValue({ id: 'user-1', email: 'a@b.com' });
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'user-1', stripe_customer_id: 'cus_1', stripe_subscription_id: null, subscription_status: null } }),
          update: vi.fn().mockReturnThis(),
        };
      }
      return {};
    });
    mocks.mockSessionsCreate.mockResolvedValue({ url: 'https://stripe.com/checkout/session' });

    const res = await POST(makeRequest({ plan: 'pro', interval: 'month' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('https://stripe.com/checkout/session');
    expect(mocks.mockSessionsCreate).toHaveBeenCalledTimes(1);
    expect(mocks.mockSubscriptionsUpdate).not.toHaveBeenCalled();
  });

  it('active subscriber triggers subscriptions.update not sessions.create', async () => {
    mocks.mockGetUser.mockReturnValue({ id: 'user-2', email: 'b@c.com' });
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'user-2', stripe_customer_id: 'cus_2', stripe_subscription_id: 'sub_existing', subscription_status: 'active' } }),
          update: vi.fn().mockReturnThis(),
        };
      }
      return {};
    });
    mocks.mockSubscriptionsRetrieve.mockResolvedValue({
      items: { data: [{ id: 'si_1', price: { id: 'price_pro_monthly' } }] },
    });
    mocks.mockSubscriptionsUpdate.mockResolvedValue({});

    // Upgrade to agency
    process.env.STRIPE_AGENCY_MONTHLY_PRICE_ID = 'price_agency_monthly';
    const res = await POST(makeRequest({ plan: 'agency', interval: 'month' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated).toBe(true);
    expect(mocks.mockSubscriptionsUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.mockSessionsCreate).not.toHaveBeenCalled();
  });

  it('same plan+interval returns 400', async () => {
    mocks.mockGetUser.mockReturnValue({ id: 'user-3', email: 'c@d.com' });
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'user-3', stripe_customer_id: 'cus_3', stripe_subscription_id: 'sub_pro', subscription_status: 'active' } }),
          update: vi.fn().mockReturnThis(),
        };
      }
      return {};
    });
    mocks.mockSubscriptionsRetrieve.mockResolvedValue({
      items: { data: [{ id: 'si_pro', price: { id: 'price_pro_monthly' } }] },
    });

    const res = await POST(makeRequest({ plan: 'pro', interval: 'month' }));
    expect(res.status).toBe(400);
    expect(mocks.mockSubscriptionsUpdate).not.toHaveBeenCalled();
  });
});
