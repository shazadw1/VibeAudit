import type { ScanFile } from "@/lib/scan/rules";
import type { getInstallationOctokit } from "@/lib/github/app";

const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|sql|py|rb|go|php|env|yml|yaml|json)$/i;
const SKIP_PATH = /(^|\/)(node_modules|\.next|dist|build|\.git|vendor|coverage)\//;
const MAX_FILES = 400;
const MAX_FILE_BYTES = 512 * 1024;
const CONCURRENCY = 12;

export interface FetchedRepo {
  fullName: string;
  githubRepoId: number;
  branch: string;
  commitSha: string | null;
  files: ScanFile[];
  truncated: boolean;
}

type InstallationOctokit = Awaited<ReturnType<typeof getInstallationOctokit>>;
export type GithubClient = { anonymous: true } | NonNullable<InstallationOctokit>;

const BASE_HEADERS: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "User-Agent": "VibeAudit-Scanner",
  "X-GitHub-Api-Version": "2022-11-28",
};

async function apiGet(path: string, client: GithubClient): Promise<any> {
  if ("anonymous" in client) {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: BASE_HEADERS,
      cache: "no-store",
    });
    if (res.status === 404) throw new Error("Repository or branch not found (is it public?)");
    if (res.status === 403) throw new Error("GitHub API rate limit hit");
    if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
    return res.json();
  } else {
    const { data } = await (client as any).request(`GET ${path}`);
    return data;
  }
}

async function getBlobContent(
  fullName: string,
  fileSha: string,
  client: GithubClient
): Promise<string | null> {
  const [owner, repo] = fullName.split("/");
  try {
    if ("anonymous" in client) {
      const res = await fetch(
        `https://api.github.com/repos/${fullName}/git/blobs/${fileSha}`,
        {
          headers: {
            ...BASE_HEADERS,
            Accept: "application/vnd.github.raw+json",
          },
          cache: "no-store",
        }
      );
      if (!res.ok) return null;
      const content = await res.text();
      if (content.length > MAX_FILE_BYTES) return null;
      return content;
    } else {
      const { data } = await (client as any).request(
        `GET /repos/{owner}/{repo}/git/blobs/{file_sha}`,
        {
          owner,
          repo,
          file_sha: fileSha,
          headers: { accept: "application/vnd.github.raw+json" },
        }
      );
      // data may be a string (raw) or an object with content
      if (typeof data === "string") {
        if (data.length > MAX_FILE_BYTES) return null;
        return data;
      }
      if (data?.content) {
        const decoded = Buffer.from(data.content, "base64").toString("utf-8");
        if (decoded.length > MAX_FILE_BYTES) return null;
        return decoded;
      }
      return null;
    }
  } catch {
    return null;
  }
}

/** Run an async mapper over items with a bounded concurrency pool. */
async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Parse "owner/repo", a full GitHub URL, or "owner/repo/tree/branch". */
export function parseRepoInput(input: string): { fullName: string; branch?: string } | null {
  const cleaned = input.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "");
  const treeMatch = cleaned.match(/^([^/]+)\/([^/]+)\/tree\/(.+)$/);
  if (treeMatch) return { fullName: `${treeMatch[1]}/${treeMatch[2]}`, branch: treeMatch[3] };
  const m = cleaned.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (m) return { fullName: `${m[1]}/${m[2]}` };
  return null;
}

/**
 * Fetch a repository's scannable files via the GitHub API.
 * The caller must supply an explicit client:
 *   - { anonymous: true } for public repos with no auth token
 *   - an installation Octokit from getInstallationOctokit() for private/installation-scoped access
 * No environment token (GITHUB_TOKEN / GITHUB_PAT) is ever read here.
 */
export async function fetchRepoFiles(
  fullName: string,
  branch: string | undefined,
  client: GithubClient
): Promise<FetchedRepo> {
  // Repo metadata gives us the numeric id and the default branch.
  const repo = await apiGet(`/repos/${fullName}`, client);
  const githubRepoId: number = repo.id;
  const ref = branch || repo.default_branch || "main";

  const tree = await apiGet(
    `/repos/${fullName}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    client
  );
  const commitSha: string | null = tree.sha ?? null;

  const blobs = (tree.tree || [])
    .filter((n: any) => n.type === "blob" && typeof n.path === "string")
    .filter((n: any) => CODE_EXT.test(n.path) && !SKIP_PATH.test(n.path))
    .filter((n: any) => typeof n.size !== "number" || n.size <= MAX_FILE_BYTES);

  const truncated = Boolean(tree.truncated) || blobs.length > MAX_FILES;
  const selected = blobs.slice(0, MAX_FILES);

  const files = await pool(selected, CONCURRENCY, async (node: any): Promise<ScanFile | null> => {
    const content = await getBlobContent(fullName, node.sha, client);
    if (content === null) return null;
    return { path: node.path, content };
  });

  return {
    fullName,
    githubRepoId,
    branch: ref,
    commitSha,
    files: files.filter((f): f is ScanFile => f !== null),
    truncated,
  };
}
