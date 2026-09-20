import { createClient } from "@/lib/supabase/server";
import BillingClient from "./billing-client";
import { effectivePlan } from "@/lib/entitlements";

export default async function BillingSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: plans }, { data: profile }] = await Promise.all([
    supabase.from("plans").select("*").eq("active", true).order("display_order"),
    user
      ? supabase.from("profiles").select("*").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  const planIds = (plans ?? []).map((p: { id: string }) => p.id);
  const { data: limits } = await supabase.from("plan_limits").select("*").in("plan", planIds);

  const currentPlan = profile
    ? effectivePlan({
        plan: (profile as { plan: string }).plan,
        subscription_status: (profile as { subscription_status: string | null }).subscription_status ?? null,
        current_period_end: (profile as { current_period_end: string | null }).current_period_end ?? null,
      })
    : "free";

  return (
    <BillingClient
      plans={(plans ?? []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        name: p.name as string,
        description: p.description as string,
        price_monthly: p.price_monthly as number,
        price_annual: p.price_annual as number,
        display_order: p.display_order as number,
        active: p.active as boolean,
        features: Array.isArray(p.features) ? (p.features as string[]) : [],
      }))}
      limits={limits ?? []}
      currentPlan={currentPlan}
      hasStripeCustomer={!!(profile as { stripe_customer_id?: string | null } | null)?.stripe_customer_id}
    />
  );
}
