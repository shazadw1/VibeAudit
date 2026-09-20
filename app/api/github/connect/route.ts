import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { syncInstallationRepos } from "@/lib/github/app";
import { rateLimit, clientKey, tooManyRequests } from "@/lib/rate-limit";
import { getPlanLimits, checkLimit, recordUsage } from "@/lib/entitlements";

const bodySchema = z.object({
  installation_id: z.coerce.number().int().positive().optional(),
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

    const limited = rateLimit(clientKey(request, `gh-connect:${user.id}`), {
      limit: 10,
      windowMs: 60_000,
    });
    if (!limited.ok) return tooManyRequests(limited);

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const installationId = parsed.data.installation_id;
    if (!installationId) {
      return NextResponse.json({ error: "Missing installation_id" }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan,current_period_start,current_period_end,created_at")
      .eq("id", user.id)
      .single();
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get repo limit before sync so we can enforce cap after bulk upsert
    const limits = await getPlanLimits(supabase, profile.plan);
    const repoMax = limits.repos; // null = unlimited

    const repoLimitCheck = await checkLimit(supabase, user.id, "repo", profile);
    if (!repoLimitCheck.ok) return repoLimitCheck.response;

    const repos = await syncInstallationRepos(user.id, installationId);

    // syncInstallationRepos upserts all repos accessible to the installation in
    // one pass. Enforce the cap by deleting any rows beyond repoMax, keeping
    // the oldest ones (by connected_at).
    if (repoMax !== null) {
      const { count: totalCount } = await supabase
        .from("repos")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if ((totalCount ?? 0) > repoMax) {
        const { data: keepRows } = await supabase
          .from("repos")
          .select("id")
          .eq("user_id", user.id)
          .order("connected_at", { ascending: true })
          .limit(repoMax);
        const keepSet = new Set(keepRows?.map((r: { id: string }) => r.id) ?? []);
        const { data: allRows } = await supabase
          .from("repos")
          .select("id")
          .eq("user_id", user.id);
        const deleteIds = allRows
          ?.filter((r: { id: string }) => !keepSet.has(r.id))
          .map((r: { id: string }) => r.id) ?? [];
        if (deleteIds.length > 0) {
          await supabase.from("repos").delete().in("id", deleteIds);
        }
      }
    }

    await recordUsage(supabase, user.id, "repo");
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);

    return NextResponse.json({ status: "success", repos });
  } catch (err) {
    console.error("[API/github/connect] Error:", err);
    return NextResponse.json({ error: "Failed to connect repository" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const installationIdParam = requestUrl.searchParams.get("installation_id");

  if (installationIdParam) {
    const installationId = Number.parseInt(installationIdParam, 10);
    if (Number.isFinite(installationId) && installationId > 0) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await syncInstallationRepos(user.id, installationId).catch(console.error);
        await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
      }
    }
  }

  const appSlug = process.env.GITHUB_APP_SLUG || "vibeaudit";
  const githubInstallUrl = `https://github.com/apps/${appSlug}/installations/new`;

  // If the GitHub App is not configured, send the user back to the dashboard.
  if (!process.env.GITHUB_APP_ID || process.env.GITHUB_APP_ID === "123456") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.redirect(githubInstallUrl);
}
