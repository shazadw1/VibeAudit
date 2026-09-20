export type PlanId = "free" | "pro" | "agency";

export const PLANS = {
  FREE: {
    id: "free" as PlanId,
    name: "Free",
    price: 0,
    priceId: undefined as string | undefined,
    features: ["1 scan/month", "Score only + top issue teaser"],
  },
  PRO: {
    id: "pro" as PlanId,
    name: "Pro",
    price: 29,
    priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    features: ["Unlimited scans", "Full plain-English report", "AI Fix PRs", "Continuous monitoring"],
  },
  AGENCY: {
    id: "agency" as PlanId,
    name: "Agency",
    price: 99,
    priceId: process.env.STRIPE_AGENCY_MONTHLY_PRICE_ID,
    features: ["15 repos", "White-label reports", "VibeAudit Verified badge"],
  },
} as const;

export const LIMIT_KINDS = ['scan','repo','monitored_repo','fix_attempt','certificate','export','api_request','team_seat'] as const;
export type LimitKind = typeof LIMIT_KINDS[number];
export type PlanLimits = {
  scans_per_period: number | null;
  repos: number | null;
  monitored_repos: number | null;
  fix_attempts_per_period: number | null;
  certificates_per_period: number | null;
  exports_per_period: number | null;
  api_requests_per_day: number | null;
  team_seats: number | null;
};

/** Resolve a plan id from a Stripe price id (used by the webhook). */
export function planIdFromPriceId(priceId: string | null | undefined): PlanId {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID) return "pro";
  if (priceId === process.env.STRIPE_AGENCY_MONTHLY_PRICE_ID) return "agency";
  return "free";
}

/** Resolve the Stripe price id for a checkout plan selection. */
export function priceIdForPlan(plan: PlanId): string | undefined {
  if (plan === "pro") return PLANS.PRO.priceId;
  if (plan === "agency") return PLANS.AGENCY.priceId;
  return undefined;
}
