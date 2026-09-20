import { describe, it, expect } from 'vitest';
import { effectivePlan } from '@/lib/entitlements';

const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

describe('effectivePlan', () => {
  it('active pro subscription returns pro', () => {
    expect(effectivePlan({ plan: 'pro', subscription_status: 'active', current_period_end: futureDate })).toBe('pro');
  });

  it('past_due before period end keeps plan', () => {
    expect(effectivePlan({ plan: 'pro', subscription_status: 'past_due', current_period_end: futureDate })).toBe('pro');
  });

  it('past_due after period end resolves to free', () => {
    expect(effectivePlan({ plan: 'pro', subscription_status: 'past_due', current_period_end: pastDate })).toBe('free');
  });

  it('unpaid after period end resolves to free', () => {
    expect(effectivePlan({ plan: 'agency', subscription_status: 'unpaid', current_period_end: pastDate })).toBe('free');
  });

  it('null subscription_status returns plan as-is', () => {
    expect(effectivePlan({ plan: 'pro', subscription_status: null, current_period_end: futureDate })).toBe('pro');
  });
});
