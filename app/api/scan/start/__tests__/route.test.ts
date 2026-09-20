import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn();
  const mockGetInstallationOctokit = vi.fn();
  const mockFetchRepoFiles = vi.fn();
  const mockRunScanEngine = vi.fn();
  const mockCheckLimit = vi.fn();
  const mockRecordUsage = vi.fn();
  return { mockGetUser, mockFrom, mockGetInstallationOctokit, mockFetchRepoFiles, mockRunScanEngine, mockCheckLimit, mockRecordUsage };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mocks.mockGetUser },
    from: mocks.mockFrom,
  })),
}));

vi.mock("@/lib/github/app", () => ({
  getInstallationOctokit: mocks.mockGetInstallationOctokit,
}));

vi.mock("@/lib/github/fetch-repo", () => ({
  fetchRepoFiles: mocks.mockFetchRepoFiles,
  parseRepoInput: vi.fn((input: string) => {
    if (input === "owner/repo") return { fullName: "owner/repo" };
    return null;
  }),
}));

vi.mock("@/lib/scan/engine", () => ({
  runScanEngine: mocks.mockRunScanEngine,
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(() => ({ ok: true })),
  clientKey: vi.fn(() => "key"),
  tooManyRequests: vi.fn(),
}));

vi.mock("@/lib/entitlements", () => ({
  checkLimit: mocks.mockCheckLimit,
  recordUsage: mocks.mockRecordUsage,
}));

import { POST } from "@/app/api/scan/start/route";

const MOCK_USER = { id: "user-123" };
const MOCK_REPO_ROW = {
  id: "row-uuid",
  user_id: "user-123",
  full_name: "owner/repo",
  installation_id: 42,
  default_branch: "main",
};
const MOCK_OCTOKIT = { request: vi.fn() };
const MOCK_FETCHED = {
  fullName: "owner/repo",
  githubRepoId: 999,
  branch: "main",
  commitSha: "sha123",
  files: [{ path: "lib/a.ts", content: "const x = 1;" }],
  truncated: false,
};
const MOCK_SCAN_RESULT = {
  status: "ok",
  score: 100,
  findings: [],
  filesScanned: 1,
};

function makeRequest(body: object) {
  return {
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Request;
}

describe("POST /api/scan/start", () => {
  const MOCK_PROFILE = {
    plan: 'free',
    current_period_start: null,
    current_period_end: null,
    created_at: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mocks.mockRunScanEngine.mockReturnValue(MOCK_SCAN_RESULT);
    mocks.mockCheckLimit.mockResolvedValue({ ok: true });
    mocks.mockRecordUsage.mockResolvedValue(undefined);
  });

  it("returns 404 when repo is not in user's repos table", async () => {
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: MOCK_PROFILE }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
      };
    });

    const res = await POST(makeRequest({ repo: "owner/repo" }));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toMatch(/not connected/i);
    expect(mocks.mockFetchRepoFiles).not.toHaveBeenCalled();
    expect(mocks.mockGetInstallationOctokit).not.toHaveBeenCalled();
  });

  it("returns 503 when getInstallationOctokit returns null", async () => {
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: MOCK_PROFILE }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: MOCK_REPO_ROW, error: null }),
      };
    });
    mocks.mockGetInstallationOctokit.mockResolvedValue(null);

    const res = await POST(makeRequest({ repo: "owner/repo" }));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toMatch(/GitHub App/i);
    expect(mocks.mockFetchRepoFiles).not.toHaveBeenCalled();
  });

  it("fetches via getInstallationOctokit(row.installation_id) for owned repo", async () => {
    const scanChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "scan-id" }, error: null }),
    };

    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: MOCK_PROFILE }),
        };
      }
      if (table === "repos") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: MOCK_REPO_ROW, error: null }),
          update: vi.fn().mockReturnThis(),
        };
      }
      if (table === "scans") return scanChain;
      if (table === "findings") return { insert: vi.fn().mockResolvedValue({}) };
      return {};
    });

    mocks.mockGetInstallationOctokit.mockResolvedValue(MOCK_OCTOKIT);
    mocks.mockFetchRepoFiles.mockResolvedValue(MOCK_FETCHED);

    const res = await POST(makeRequest({ repo: "owner/repo" }));

    expect(mocks.mockGetInstallationOctokit).toHaveBeenCalledWith(42);
    expect(mocks.mockFetchRepoFiles).toHaveBeenCalledWith("owner/repo", undefined, MOCK_OCTOKIT);
    expect(res.status).toBe(200);
  });

  it("never writes installation_id: 0", async () => {
    const upsertFn = vi.fn();
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: MOCK_PROFILE }),
        };
      }
      if (table === "repos") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: MOCK_REPO_ROW, error: null }),
          update: vi.fn().mockReturnThis(),
          upsert: upsertFn,
        };
      }
      if (table === "scans") {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: "scan-id" }, error: null }),
        };
      }
      return { insert: vi.fn().mockResolvedValue({}) };
    });
    mocks.mockGetInstallationOctokit.mockResolvedValue(MOCK_OCTOKIT);
    mocks.mockFetchRepoFiles.mockResolvedValue(MOCK_FETCHED);

    await POST(makeRequest({ repo: "owner/repo" }));

    // upsert with installation_id: 0 must never be called
    for (const call of upsertFn.mock.calls) {
      const arg = call[0];
      if (arg && typeof arg === "object") {
        expect(arg.installation_id).not.toBe(0);
      }
    }
  });

  it("returns 402 when free user is at scan limit (no fetch/GitHub calls)", async () => {
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: MOCK_PROFILE }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) };
    });

    const limitResponse = Response.json(
      { error: "Plan limit reached", code: "plan_limit_exceeded", limit: { kind: "scan", used: 1, max: 1, period_end: new Date().toISOString() }, upgrade: "/settings/billing" },
      { status: 402 }
    );
    mocks.mockCheckLimit.mockResolvedValue({ ok: false, response: limitResponse });

    const res = await POST(makeRequest({ repo: "owner/repo" }));
    expect(res.status).toBe(402);
    expect(mocks.mockFetchRepoFiles).not.toHaveBeenCalled();
    expect(mocks.mockGetInstallationOctokit).not.toHaveBeenCalled();
  });

  it("records usage event after successful file upload", async () => {
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: MOCK_PROFILE }),
        };
      }
      return { insert: vi.fn().mockResolvedValue({}) };
    });

    const res = await POST(makeRequest({ files: [{ path: "a.ts", content: "const x = 1" }] }));
    expect(res.status).toBe(200);
    expect(mocks.mockRecordUsage).toHaveBeenCalledWith(expect.anything(), MOCK_USER.id, "scan", "upload");
  });
});
