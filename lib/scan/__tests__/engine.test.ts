import { describe, expect, it } from "vitest";
import { runScanEngine } from "@/lib/scan/engine";
import { RULES, type ScanFile } from "@/lib/scan/rules";
import { calculateSecurityScore } from "@/lib/scan/scorer";
import { explainFinding } from "@/lib/ai/explain";

// One fixture per rule. Values are synthetic and never valid credentials.
const FIXTURES: Record<string, ScanFile> = {
  "exposed-api-keys": { path: "lib/client.ts", content: 'const key = "sk_live_' + "a".repeat(20) + '";' },
  "public-service-role-key": { path: "lib/supabase.ts", content: 'const NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;' },
  "rls-disabled": { path: "supabase/migrations/1.sql", content: "create table public.orders (id uuid primary key);" },
  "missing-auth": { path: "app/api/orders/route.ts", content: "export async function POST(req: Request) { return Response.json({ ok: true }); }" },
  "sql-injection": { path: "lib/db.ts", content: "db.query(`select * from users where id = ${id}`);" },
  "xss-dangerous-html": { path: "components/Post.tsx", content: "<div dangerouslySetInnerHTML={{ __html: body }} />" },
  "prompt-injection": { path: "lib/ai.ts", content: "import Anthropic from '@anthropic-ai/sdk';\nconst prompt = `Summarise: ${input}`;" },
  "no-rate-limiting": { path: "app/api/orders/route.ts", content: "export async function POST(req: Request) { const { data } = await supabase.auth.getUser(); return Response.json({ ok: true }); }" },
};

const CLEAN: ScanFile[] = [
  { path: "app/api/safe/route.ts", content: "import { rateLimit } from '@/lib/rate-limit';\nexport async function POST() { rateLimit(); const { data } = await supabase.auth.getUser(); return Response.json({}); }" },
  { path: "lib/util.ts", content: "export const add = (a: number, b: number) => a + b;" },
  { path: "node_modules/x/index.js", content: 'const k = "sk_live_' + "b".repeat(20) + '";' },
];

describe("rule fixtures", () => {
  for (const [id, file] of Object.entries(FIXTURES)) {
    it(`${id} fires on its fixture`, () => {
      const ids = runScanEngine([file]).findings.map((f) => f.check_type);
      expect(ids).toContain(id);
    });
  }

  it("every rule has a fixture except payment-bypass (tracked separately)", () => {
    const covered = new Set(Object.keys(FIXTURES));
    const missing = RULES.map((r) => r.id).filter((id) => !covered.has(id));
    expect(missing).toEqual(["payment-bypass"]);
  });

  it("every rule has an explanation entry", () => {
    for (const r of RULES) {
      const e = explainFinding(r.id);
      expect(e.plainEnglish, r.id).toBeTruthy();
      expect(e.fixSuggestion, r.id).toBeTruthy();
    }
  });
});

describe("engine", () => {
  it("clean input scores 100 and skips node_modules", () => {
    const res = runScanEngine(CLEAN);
    expect(res.findings).toEqual([]);
    expect(res.score).toBe(100);
    expect(res.filesScanned).toBe(2);
  });

  it("orders findings worst-first and is deterministic", () => {
    const files = Object.values(FIXTURES);
    const a = runScanEngine(files);
    const b = runScanEngine([...files].reverse());
    expect(a.findings).toEqual(b.findings);
    const order = { critical: 0, high: 1, medium: 2, low: 3 } as const;
    for (let i = 1; i < a.findings.length; i++) {
      expect(order[a.findings[i - 1].severity]).toBeLessThanOrEqual(order[a.findings[i].severity]);
    }
  });
});

describe("scorer (snapshot of current additive model; see implementation_plan.md §0.3)", () => {
  it("subtracts 25/12/5/2 with a floor of 0", () => {
    expect(calculateSecurityScore([])).toBe(100);
    expect(calculateSecurityScore([{ severity: "critical" }, { severity: "high" }, { severity: "medium" }, { severity: "low" }])).toBe(56);
    expect(calculateSecurityScore(Array(5).fill({ severity: "critical" }))).toBe(0);
  });
});
