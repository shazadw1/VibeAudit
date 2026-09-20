import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, clientKey, tooManyRequests } from "@/lib/rate-limit";
import { runScanEngine } from "@/lib/scan/engine";
import { fetchRepoFiles, parseRepoInput } from "@/lib/github/fetch-repo";

export const maxDuration = 60;

// Public, no-auth real-scan endpoint. Lives OUTSIDE /api so it is not caught by
// the /api -> Railway proxy on this project, and needs no Supabase session, so
// it works even before auth/DB is fully configured. It reaches only public repos
// (no token is ever sent) and returns analysis (no persistence, no user data),
// gated by rate limiting. Private repos require connecting the GitHub App and
// scanning from the dashboard.
const bodySchema = z.object({
  repo: z.string().min(3).max(200),
  branch: z.string().min(1).max(200).optional(),
});

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "svc-scan"), { limit: 6, windowMs: 60_000 });
  if (!limited.ok) return tooManyRequests(limited);

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide a repo, e.g. owner/repo" }, { status: 400 });
  }

  const parsedRepo = parseRepoInput(parsed.data.repo);
  if (!parsedRepo) {
    return NextResponse.json({ error: "Could not parse repository. Use owner/repo." }, { status: 400 });
  }

  let fetched;
  try {
    fetched = await fetchRepoFiles(parsedRepo.fullName, parsed.data.branch || parsedRepo.branch, { anonymous: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch repository" }, { status: 502 });
  }

  if (fetched.files.length === 0) {
    return NextResponse.json({ error: "No scannable source files found in repository." }, { status: 422 });
  }

  const result = runScanEngine(fetched.files);

  return NextResponse.json({
    status: result.status,
    repo: fetched.fullName,
    branch: fetched.branch,
    score: result.score,
    findingsCount: result.findings.length,
    filesScanned: result.filesScanned,
    truncated: fetched.truncated,
    findings: result.findings,
  });
}
