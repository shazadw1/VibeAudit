import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientKey, tooManyRequests } from "@/lib/rate-limit";
import { runScanEngine } from "@/lib/scan/engine";
import { fetchRepoFiles, parseRepoInput } from "@/lib/github/fetch-repo";
import { getInstallationOctokit } from "@/lib/github/app";
import { checkLimit, recordUsage } from "@/lib/entitlements";

export const maxDuration = 60; // allow time to fetch + scan a repo

const MAX_FILES = 2000;
const MAX_FILE_BYTES = 512 * 1024;

const bodySchema = z.object({
  repo: z.string().min(3).max(200).optional(), // "owner/repo" or GitHub URL
  branch: z.string().min(1).max(200).optional(),
  files: z
    .array(z.object({ path: z.string().min(1).max(1024), content: z.string().max(MAX_FILE_BYTES) }))
    .min(1)
    .max(MAX_FILES)
    .optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit(clientKey(request, `scan:${user.id}`), { limit: 8, windowMs: 60_000 });
  if (!limited.ok) return tooManyRequests(limited);

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Fetch profile for plan limit checks
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan,current_period_start,current_period_end,created_at")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const scanLimitCheck = await checkLimit(supabase, user.id, "scan", profile);
  if (!scanLimitCheck.ok) return scanLimitCheck.response;

  // ---- Path 1: direct file contents (upload) ------------------------------
  if (parsed.data.files && parsed.data.files.length > 0) {
    const result = runScanEngine(parsed.data.files);
    await recordUsage(supabase, user.id, "scan", "upload");
    return NextResponse.json({
      status: result.status,
      score: result.score,
      findingsCount: result.findings.length,
      filesScanned: result.filesScanned,
      findings: result.findings,
    });
  }

  // ---- Path 2: fetch a real GitHub repo and scan it -----------------------
  if (!parsed.data.repo) {
    return NextResponse.json(
      { error: "Provide `repo` (owner/repo or GitHub URL) or `files`." },
      { status: 400 }
    );
  }

  const parsedRepo = parseRepoInput(parsed.data.repo);
  if (!parsedRepo) {
    return NextResponse.json({ error: "Could not parse repository. Use owner/repo." }, { status: 400 });
  }

  // Verify the repo belongs to the requesting user's GitHub App installation.
  const { data: repoRow } = await supabase
    .from("repos")
    .select("*")
    .eq("user_id", user.id)
    .eq("full_name", parsedRepo.fullName)
    .single();

  if (!repoRow) {
    return NextResponse.json(
      { error: "Repository is not connected to your GitHub App installation" },
      { status: 404 }
    );
  }

  const installationClient = await getInstallationOctokit(repoRow.installation_id);
  if (!installationClient) {
    return NextResponse.json(
      { error: "GitHub App is not configured or the installation is unavailable" },
      { status: 503 }
    );
  }

  let fetched;
  try {
    fetched = await fetchRepoFiles(
      parsedRepo.fullName,
      parsed.data.branch || parsedRepo.branch,
      installationClient
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch repository" }, { status: 502 });
  }

  if (fetched.files.length === 0) {
    return NextResponse.json({ error: "No scannable source files found in repository." }, { status: 422 });
  }

  const result = runScanEngine(fetched.files);

  // Best-effort persistence so the scan shows up in history. If a policy or
  // env prevents it, we still return the live findings below.
  let scanId: string | null = null;
  try {
    // Update default_branch on the repo row if it changed.
    if (repoRow.default_branch !== fetched.branch) {
      await supabase
        .from("repos")
        .update({ default_branch: fetched.branch })
        .eq("id", repoRow.id);
    }

    const { data: scanRow } = await supabase
      .from("scans")
      .insert({
        repo_id: repoRow.id,
        user_id: user.id,
        status: "done",
        score: result.score,
        commit_sha: fetched.commitSha,
        finished_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (scanRow) {
      scanId = scanRow.id;
      if (result.findings.length > 0) {
        await supabase
          .from("findings")
          .insert(result.findings.map((f) => ({ ...f, scan_id: scanRow.id })));
      }
    }
  } catch (err) {
    console.error("[scan/start] persistence failed (returning live results):", err);
  }

  await recordUsage(supabase, user.id, "scan", scanId ?? "repo");

  return NextResponse.json({
    status: result.status,
    repo: fetched.fullName,
    branch: fetched.branch,
    scanId,
    score: result.score,
    findingsCount: result.findings.length,
    filesScanned: result.filesScanned,
    truncated: fetched.truncated,
    findings: result.findings,
  });
}
