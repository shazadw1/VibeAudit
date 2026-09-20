"use client";

import React, { useState } from "react";
import {
  Terminal,
  Github,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  FileCode,
  AlertOctagon,
  AlertTriangle,
  Info,
  Search,
} from "lucide-react";
import { ScoreRing } from "@/components/dashboard/score-ring";

interface EngineFinding {
  check_type: string;
  severity: "critical" | "high" | "medium" | "low";
  file_path: string;
  line: number;
  title: string;
  plain_english: string;
  fix_suggestion: string;
  cwe: string;
}

interface ScanResponse {
  repo?: string;
  branch?: string;
  score: number;
  findingsCount: number;
  filesScanned: number;
  truncated?: boolean;
  findings: EngineFinding[];
  scanId?: string | null;
}

const SEV_STYLE: Record<string, string> = {
  critical: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  high: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  medium: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  low: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
};

export function RealScanClient() {
  const [repo, setRepo] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);

  const runScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repo.trim() || scanning) return;
    setScanning(true);
    setError(null);
    setResult(null);
    try {
      // Uses /svc/scan (outside /api) so it is not intercepted by the
      // project's /api proxy, and needs no login — public real scan.
      const res = await fetch("/svc/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repo.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Scan failed");
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err?.message || "Network error");
    } finally {
      setScanning(false);
    }
  };

  const counts = result
    ? {
        critical: result.findings.filter((f) => f.severity === "critical").length,
        high: result.findings.filter((f) => f.severity === "high").length,
        medium: result.findings.filter((f) => f.severity === "medium").length,
        low: result.findings.filter((f) => f.severity === "low").length,
      }
    : null;

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono uppercase tracking-wider">
          <Terminal className="h-4 w-4" />
          <span>Real Static Analysis Engine</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
          Scan a <span className="text-gradient">GitHub Repository</span>
        </h1>
        <p className="text-sm text-slate-300 font-medium max-w-2xl">
          Enter a public GitHub repo (<span className="font-mono text-slate-200">owner/repo</span> or a URL).
          VibeAudit fetches the source, runs real detectors for secrets, missing auth, RLS gaps, payment
          bypass, injection and more, and returns a live security score.
        </p>
      </div>

      {/* Input */}
      <form onSubmit={runScan} className="glass-card rounded-2xl p-5 border border-white/15 space-y-4">
        <div className="relative">
          <Github className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="vercel/next.js  or  https://github.com/owner/repo"
            className="w-full rounded-xl bg-black/50 border border-white/10 pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono transition"
          />
        </div>
        <button
          type="submit"
          disabled={scanning || !repo.trim()}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 py-3.5 font-extrabold text-sm text-white shadow-glow hover:opacity-95 transition disabled:opacity-50"
        >
          {scanning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Fetching & analyzing source…</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              <span>Run Real Scan</span>
            </>
          )}
        </button>
        <p className="text-[11px] text-slate-500 font-medium">
          Tip: try your own repo, e.g. <span className="font-mono">joocn619/VibeAudit</span>. Private repos
          require connecting the GitHub App and scanning from the dashboard.
        </p>
      </form>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-300 flex items-center gap-2">
          <AlertOctagon className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && counts && (
        <div className="space-y-6">
          {/* Score + summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 glass-card rounded-3xl p-8 border border-white/15 bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent flex flex-col items-center justify-center text-center">
              <ScoreRing score={result.score} size={130} />
              <h3 className="text-lg font-black text-white mt-4 font-mono">
                {result.score >= 90 ? "Strong" : result.score >= 60 ? "Needs Work" : "At Risk"}
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">{result.repo} · {result.branch}</p>
            </div>

            <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Critical", value: counts.critical, cls: "text-rose-400 border-rose-500/30" },
                { label: "High", value: counts.high, cls: "text-orange-400 border-orange-500/30" },
                { label: "Medium", value: counts.medium, cls: "text-amber-400 border-amber-500/30" },
                { label: "Files", value: result.filesScanned, cls: "text-indigo-400 border-indigo-500/30" },
              ].map((s) => (
                <div key={s.label} className={`glass-card rounded-2xl p-5 border ${s.cls} bg-white/[0.02] flex flex-col justify-between`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">{s.label}</span>
                  <span className="text-3xl font-black font-mono text-white mt-3">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {result.truncated && (
            <p className="text-xs text-amber-300/80 flex items-center gap-2">
              <Info className="h-3.5 w-3.5" /> Large repo — only the first batch of files was analyzed.
            </p>
          )}

          {/* Findings */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2 font-mono">
              {result.findings.length === 0 ? (
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-rose-400" />
              )}
              <span>{result.findings.length} Findings</span>
            </h2>
          </div>

          {result.findings.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center border border-emerald-500/25">
              <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-200 font-semibold">No issues detected by the current rule set.</p>
              <p className="text-xs text-slate-400 mt-1">Score {result.score}/100 across {result.filesScanned} files.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {result.findings.map((f, i) => (
                <div key={i} className="glass-card rounded-2xl border border-white/12 bg-white/[0.02] p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase font-mono tracking-wider border shrink-0 mt-0.5 ${SEV_STYLE[f.severity]}`}>
                        {f.severity}
                      </span>
                      <div>
                        <h3 className="text-sm md:text-base font-bold text-white">{f.title}</h3>
                        <p className="text-xs font-mono text-slate-400 flex items-center gap-1.5 mt-1">
                          <FileCode className="h-3.5 w-3.5 text-indigo-400" />
                          <span>{f.file_path}:{f.line}</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-slate-500">{f.cwe}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 font-mono mb-1.5">Why it matters</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{f.plain_english}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 font-mono mb-1.5">How to fix</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{f.fix_suggestion}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
