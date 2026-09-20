import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn();
  const mockGetInstallationOctokit = vi.fn();
  const mockFetchRepoFiles = vi.fn();
  const mockRunScanEngine = vi.fn();
  return { mockGetUser, mockFrom, mockGetInstallationOctokit, mockFetchRepoFiles, mockRunScanEngine };
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
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mocks.mockRunScanEngine.mockReturnValue(MOCK_SCAN_RESULT);
  });

  it("returns 404 when repo is not in user's repos table", async () => {
    mocks.mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
    });

    const res = await POST(makeRequest({ repo: "owner/repo" }));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toMatch(/not connected/i);
    expect(mocks.mockFetchRepoFiles).not.toHaveBeenCalled();
    expect(mocks.mockGetInstallationOctokit).not.toHaveBeenCalled();
  });

  it("returns 503 when getInstallationOctokit returns null", async () => {
    mocks.mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_REPO_ROW, error: null }),
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
});
