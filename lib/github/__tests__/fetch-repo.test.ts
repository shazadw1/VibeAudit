import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchRepoFiles } from "@/lib/github/fetch-repo";

// Minimal tree response
const MOCK_REPO = { id: 12345, default_branch: "main" };
const MOCK_TREE = {
  sha: "abc123",
  truncated: false,
  tree: [
    { type: "blob", path: "lib/index.ts", sha: "blobsha1", size: 100 },
    { type: "blob", path: "node_modules/x/index.js", sha: "blobsha2", size: 50 },
  ],
};
const MOCK_BLOB_CONTENT = 'export const x = 1;';

describe("fetchRepoFiles — anonymous client", () => {
  let fetchCalls: { url: string; headers: Record<string, string> }[] = [];

  beforeEach(() => {
    fetchCalls = [];
    vi.stubGlobal("fetch", async (url: string, opts: any) => {
      const headers = opts?.headers ?? {};
      fetchCalls.push({ url, headers });

      if (url.includes("/repos/owner/repo") && !url.includes("git/")) {
        return { ok: true, status: 200, json: async () => MOCK_REPO };
      }
      if (url.includes("/git/trees/")) {
        return { ok: true, status: 200, json: async () => MOCK_TREE };
      }
      if (url.includes("/git/blobs/")) {
        return { ok: true, status: 200, text: async () => MOCK_BLOB_CONTENT };
      }
      return { ok: false, status: 404, json: async () => ({}), text: async () => "" };
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(a) sends no Authorization header on anonymous path", async () => {
    await fetchRepoFiles("owner/repo", undefined, { anonymous: true });
    for (const call of fetchCalls) {
      expect(call.headers?.Authorization).toBeUndefined();
    }
  });

  it("(a) does not read GITHUB_TOKEN or GITHUB_PAT env vars", async () => {
    const origGet = process.env;
    const accessed: string[] = [];
    const proxy = new Proxy(origGet, {
      get(target, prop: string) {
        if (prop === "GITHUB_TOKEN" || prop === "GITHUB_PAT") {
          accessed.push(prop);
        }
        return (target as any)[prop];
      },
    });
    vi.stubGlobal("process", { ...process, env: proxy });

    await fetchRepoFiles("owner/repo", undefined, { anonymous: true });
    expect(accessed).toEqual([]);

    vi.unstubAllGlobals();
  });

  it("(b) calls metadata and tree endpoints via the GitHub API", async () => {
    await fetchRepoFiles("owner/repo", undefined, { anonymous: true });
    const urls = fetchCalls.map((c) => c.url);
    expect(urls.some((u) => u.includes("api.github.com/repos/owner/repo"))).toBe(true);
    expect(urls.some((u) => u.includes("/git/trees/"))).toBe(true);
  });

  it("(c) filtering skips node_modules and returns only code files", async () => {
    const result = await fetchRepoFiles("owner/repo", undefined, { anonymous: true });
    const paths = result.files.map((f) => f.path);
    expect(paths).toContain("lib/index.ts");
    expect(paths.every((p) => !p.startsWith("node_modules"))).toBe(true);
  });

  it("(c) populates githubRepoId, branch, commitSha correctly", async () => {
    const result = await fetchRepoFiles("owner/repo", undefined, { anonymous: true });
    expect(result.githubRepoId).toBe(12345);
    expect(result.branch).toBe("main");
    expect(result.commitSha).toBe("abc123");
    expect(result.fullName).toBe("owner/repo");
  });
});

describe("fetchRepoFiles — installation Octokit client", () => {
  it("(b) calls octokit.request for metadata, tree, and blob reads", async () => {
    const requestCalls: string[] = [];

    const mockOctokit = {
      request: vi.fn().mockImplementation(async (route: string, params?: any) => {
        requestCalls.push(route);
        if (route.includes("/repos/{owner}/{repo}") || route === "GET /repos/owner/repo") {
          return { data: MOCK_REPO };
        }
        if (route.includes("/git/trees/")) {
          return { data: MOCK_TREE };
        }
        if (route.includes("/git/blobs/")) {
          return { data: MOCK_BLOB_CONTENT };
        }
        return { data: {} };
      }),
    };

    // Mock the request method to handle both URL-style and route-style calls
    mockOctokit.request.mockImplementation(async (route: string) => {
      requestCalls.push(route);
      if (route.includes("repos/owner/repo") && !route.includes("git/")) {
        return { data: MOCK_REPO };
      }
      if (route.includes("/git/trees/")) {
        return { data: MOCK_TREE };
      }
      if (route.includes("/git/blobs/")) {
        return { data: MOCK_BLOB_CONTENT };
      }
      return { data: {} };
    });

    const result = await fetchRepoFiles("owner/repo", undefined, mockOctokit as any);

    expect(mockOctokit.request).toHaveBeenCalled();
    expect(requestCalls.length).toBeGreaterThanOrEqual(2); // at least repo + tree
    expect(result.githubRepoId).toBe(12345);
    expect(result.branch).toBe("main");
  });
});
