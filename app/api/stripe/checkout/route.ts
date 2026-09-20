import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { priceIdForPlan } from "@/lib/stripe/plans";
import type { Profile } from "@/types";

const bodySchema = z.object({
  plan: z.enum(["pro", "agency"]),
  interval: z.enum(["month", "year"]).default("month"),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const priceId = priceIdForPlan(parsed.data.plan, parsed.data.interval);
    if (!priceId) {
      return NextResponse.json({ error: "Plan is not available for purchase" }, { status: 400 });
    }

    const stripe = getStripe();

    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    const profile = data as Profile | null;

    // Reuse an existing Stripe customer or create one keyed to the user id.
    let customerId = profile?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const subscriptionId = profile?.stripe_subscription_id;
    const subscriptionStatus = (profile as { subscription_status?: string | null } | null)?.subscription_status;
    const isActiveSubscription = subscriptionStatus === "active" || subscriptionStatus === "trialing";

    if (subscriptionId && isActiveSubscription) {
      const existingSub = await stripe.subscriptions.retrieve(subscriptionId);
      const existingPriceId = existingSub.items.data[0]?.price.id;
      if (existingPriceId === priceId) {
        return NextResponse.json({ error: "Already on this plan" }, { status: 400 });
      }

      const item = existingSub.items.data[0];
      await stripe.subscriptions.update(subscriptionId, {
        items: [{ id: item.id, price: priceId }],
        proration_behavior: "create_prorations",
      });
      return NextResponse.json({ updated: true });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      metadata: { userId: user.id },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings/billing?checkout=success`,
      cancel_url: `${appUrl}/settings/billing?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[Stripe Checkout] Error:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
