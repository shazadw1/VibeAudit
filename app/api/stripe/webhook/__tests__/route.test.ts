import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockConstructEvent = vi.fn();
  const mockSubscriptionsRetrieve = vi.fn();
  const mockFrom = vi.fn();
  return { mockConstructEvent, mockSubscriptionsRetrieve, mockFrom };
});

vi.mock('@/lib/stripe/client', () => ({
  getStripe: vi.fn(() => ({
    webhooks: { constructEvent: mocks.mockConstructEvent },
    subscriptions: { retrieve: mocks.mockSubscriptionsRetrieve },
  })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mocks.mockFrom,
  })),
}));

import { POST } from '@/app/api/stripe/webhook/route';

function makeRequest(body: string, signature = 'sig') {
  return {
    text: async () => body,
    headers: { get: (h: string) => (h === 'stripe-signature' ? signature : null) },
  } as unknown as Request;
}

function makeUpdateChain() {
  const updateFn = vi.fn().mockReturnThis();
  const eqFn = vi.fn().mockResolvedValue({ error: null });
  return { update: updateFn, eq: eqFn, _updateFn: updateFn };
}

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  it('customer.subscription.updated writes period columns', async () => {
    const sub = {
      id: 'sub_123',
      status: 'active',
      customer: 'cus_123',
      current_period_start: 1700000000,
      current_period_end: 1702592000,
      items: { data: [{ price: { id: 'price_pro' } }] },
      cancel_at_period_end: false,
    };
    mocks.mockConstructEvent.mockReturnValue({
      id: 'evt_sub_updated',
      type: 'customer.subscription.updated',
      data: { object: sub },
    });

    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') return { insert: vi.fn().mockResolvedValue({ error: null }) };
      return { update: updateFn };
    });

    process.env.STRIPE_PRO_MONTHLY_PRICE_ID = 'price_pro';
    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(200);

    const updateArg = updateFn.mock.calls[0]?.[0];
    expect(updateArg).toHaveProperty('current_period_start');
    expect(updateArg).toHaveProperty('current_period_end');
    expect(updateArg.current_period_start).toBe(new Date(1700000000 * 1000).toISOString());
    expect(updateArg.current_period_end).toBe(new Date(1702592000 * 1000).toISOString());
  });

  it('checkout.session.completed writes period columns from subscription', async () => {
    const sub = {
      id: 'sub_123',
      status: 'active',
      current_period_start: 1700000000,
      current_period_end: 1702592000,
      items: { data: [{ price: { id: 'price_pro' } }] },
    };
    mocks.mockSubscriptionsRetrieve.mockResolvedValue(sub);
    mocks.mockConstructEvent.mockReturnValue({
      id: 'evt_checkout_completed',
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'user-99',
          metadata: {},
          customer: 'cus_checkout',
          subscription: 'sub_123',
        },
      },
    });

    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') return { insert: vi.fn().mockResolvedValue({ error: null }) };
      return { update: updateFn };
    });

    process.env.STRIPE_PRO_MONTHLY_PRICE_ID = 'price_pro';
    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(200);

    const updateArg = updateFn.mock.calls[0]?.[0];
    expect(updateArg).toHaveProperty('current_period_start');
    expect(updateArg).toHaveProperty('current_period_end');
    expect(updateArg.current_period_start).toBe(new Date(1700000000 * 1000).toISOString());
    expect(updateArg.current_period_end).toBe(new Date(1702592000 * 1000).toISOString());
  });

  it('customer.subscription.deleted clears period columns to null', async () => {
    const sub = {
      id: 'sub_123',
      status: 'canceled',
      customer: 'cus_123',
      current_period_start: 1700000000,
      current_period_end: 1702592000,
      items: { data: [] },
    };
    mocks.mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: sub },
    });

    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') return { insert: vi.fn().mockResolvedValue({ error: null }) };
      return { update: updateFn };
    });

    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(200);

    const updateArg = updateFn.mock.calls[0]?.[0];
    expect(updateArg.current_period_start).toBeNull();
    expect(updateArg.current_period_end).toBeNull();
    expect(updateArg.plan).toBe('free');
    expect(updateArg.stripe_subscription_id).toBeNull();
  });

  it('duplicate event.id is acknowledged without re-processing', async () => {
    mocks.mockConstructEvent.mockReturnValue({
      id: 'evt_dedup_test',
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_x', status: 'canceled', customer: 'cus_x', items: { data: [] } } },
    });

    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    let insertCallCount = 0;
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') {
        return {
          insert: vi.fn().mockResolvedValue(
            insertCallCount++ === 0
              ? { error: null }
              : { error: { code: '23505', message: 'duplicate' } }
          ),
        };
      }
      return { update: updateFn };
    });

    const res1 = await POST(makeRequest('{}'));
    expect(res1.status).toBe(200);

    // Second delivery with same event.id: insert returns conflict
    mocks.mockConstructEvent.mockReturnValue({
      id: 'evt_dedup_test',
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_x', status: 'canceled', customer: 'cus_x', items: { data: [] } } },
    });
    const res2 = await POST(makeRequest('{}'));
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.duplicate).toBe(true);
  });

  it('unknown price id leaves plan unchanged', async () => {
    const sub = {
      id: 'sub_unknown', status: 'active', customer: 'cus_unknown',
      current_period_start: 1700000000, current_period_end: 1702592000,
      items: { data: [{ price: { id: 'price_unknown_xyz' } }] },
      cancel_at_period_end: false,
    };
    mocks.mockConstructEvent.mockReturnValue({
      id: 'evt_unknown_price',
      type: 'customer.subscription.updated',
      data: { object: sub },
    });

    const updateFn = vi.fn();
    mocks.mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: updateFn,
    });

    // Clear known price ids
    delete process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
    delete process.env.STRIPE_AGENCY_MONTHLY_PRICE_ID;
    delete process.env.STRIPE_PRO_ANNUAL_PRICE_ID;
    delete process.env.STRIPE_AGENCY_ANNUAL_PRICE_ID;

    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(200);
    // update should NOT have been called (plan not updated)
    expect(updateFn).not.toHaveBeenCalled();
  });

  it('invoice.payment_failed sets subscription_status to past_due', async () => {
    mocks.mockConstructEvent.mockReturnValue({
      id: 'evt_pf',
      type: 'invoice.payment_failed',
      data: { object: { customer: 'cus_pf' } },
    });

    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') return { insert: vi.fn().mockResolvedValue({ error: null }) };
      return { update: updateFn };
    });

    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(200);
    expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ subscription_status: 'past_due' }));
  });
});
