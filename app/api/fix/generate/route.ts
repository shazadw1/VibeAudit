import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientKey, tooManyRequests } from "@/lib/rate-limit";
import { checkLimit, recordUsage } from "@/lib/entitlements";

const bodySchema = z.object({
  findingId: z.string().min(1),
  repoId: z.string().min(1),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // AI/GitHub calls are expensive — keep this tightly limited.
  const limited = rateLimit(clientKey(request, `fix:${user.id}`), { limit: 5, windowMs: 60_000 });
  if (!limited.ok) return tooManyRequests(limited);

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan,current_period_start,current_period_end,created_at")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const fixLimitCheck = await checkLimit(supabase, user.id, "fix_attempt", profile);
  if (!fixLimitCheck.ok) return fixLimitCheck.response;

  await recordUsage(supabase, user.id, "fix_attempt", parsed.data.findingId);

  // NOTE: Autonomous AI patch generation + GitHub PR creation is not yet
  // implemented. This is a SIMULATED response, explicitly flagged, so it is
  // never mistaken for a real opened pull request. See lib/ai/fix.ts and
  // lib/github/pr.ts.
  return NextResponse.json({
    simulated: true,
    status: "not_implemented",
    message: "AI fix + PR pipeline not yet implemented — simulated response.",
  });
}
