"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  GitPullRequest,
  Terminal,
  CheckCircle2,
  ArrowRight,
  Lock,
  Zap,
  Activity,
  Github,
  ChevronRight,
  Code2,
  Cpu,
  Layers,
  Star,
  Quote,
  Check,
  Calculator,
  DollarSign,
  TrendingDown,
  Clock,
  Shield,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  X,
  Server,
  EyeOff,
  GitBranch,
  Award,
  Play,
  RefreshCw,
  Briefcase,
  FileText,
  Users,
  CheckCircle,
  AlertTriangle,
  Search,
  Building2,
  Globe,
  Sliders,
} from "lucide-react";

export function LandingClient() {
  const [activeTab, setActiveTab] = useState<"sqli" | "stripe" | "llm">("sqli");
  const [terminalStep, setTerminalStep] = useState(0);
  const [teamScale, setTeamScale] = useState<"startup" | "growth" | "enterprise">("growth");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isPatching, setIsPatching] = useState(false);
  const [patchSuccess, setPatchSuccess] = useState(false);
  const [liveScanCount, setLiveScanCount] = useState(14892);
  const [viewMode, setViewMode] = useState<"executive" | "developer">("executive");
  const [selectedDemoRepo, setSelectedDemoRepo] = useState<"ecommerce" | "fintech" | "llm">("fintech");
  const [isDemoScanning, setIsDemoScanning] = useState(false);
  const [demoScanDone, setDemoScanDone] = useState(false);

  // Animated terminal sequence loop
  useEffect(() => {
    const timer = setInterval(() => {
      setTerminalStep((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Live scan counter rolling effect
  useEffect(() => {
    const counterTimer = setInterval(() => {
      setLiveScanCount((prev) => prev + Math.floor(Math.random() * 3) + 1);
    }, 4500);
    return () => clearInterval(counterTimer);
  }, []);

  const triggerAiPatch = () => {
    if (isPatching || patchSuccess) return;
    setIsPatching(true);
    setTimeout(() => {
      setIsPatching(false);
      setPatchSuccess(true);
      setTimeout(() => setPatchSuccess(false), 5000);
    }, 1800);
  };

  const runDemoScan = () => {
    if (isDemoScanning) return;
    setIsDemoScanning(true);
    setDemoScanDone(false);
    setTimeout(() => {
      setIsDemoScanning(false);
      setDemoScanDone(true);
    }, 2000);
  };

  const terminalMessages = [
    { text: "⚡ [AST Analyzer] Intercepting push to branch main (commit #f9a8e2)...", color: "text-indigo-300" },
    { text: "🔍 [OWASP Engine] Scanning app/api/checkout/route.ts for string interpolation...", color: "text-amber-300" },
    { text: "🚨 [CRITICAL ALERT] SQL Injection detected at Line 42! VibeScore dropped to 58/100.", color: "text-rose-400 font-bold" },
    { text: "✨ [AI Fix Engine] Generated parameterized query patch -> PR #89 opened automatically!", color: "text-emerald-400 font-bold" },
  ];

  const scaleMetrics = {
    startup: {
      name: "Solo Startup (1–5 Devs)",
      manualCost: "$12,500 / yr",
      wastedHours: "340 hrs / yr",
      vibeCost: "$0 – $348 / yr",
      savings: "$12,150+",
      prCount: "~45 Autonomous PRs",
    },
    growth: {
      name: "Growth Scale (10–25 Devs)",
      manualCost: "$48,000 / yr",
      wastedHours: "1,450 hrs / yr",
      vibeCost: "$348 / yr ($29/mo)",
      savings: "$47,650+",
      prCount: "~280 Autonomous PRs",
    },
    enterprise: {
      name: "Enterprise & Agency (50+ Devs)",
      manualCost: "$180,000+ / yr",
      wastedHours: "4,800+ hrs / yr",
      vibeCost: "$1,188 / yr ($99/mo)",
      savings: "$178,800+",
      prCount: "1,200+ Autonomous PRs",
    },
  };

  const currentMetrics = scaleMetrics[teamScale];

  const demoRepos = {
    fintech: {
      name: "🏦 fintech-cursor-app",
      desc: "AI-generated banking dashboard & payment portal",
      issuesFound: 3,
      criticalText: "Hardcoded API Secret & Stripe Price Trust",
      scoreBefore: 58,
      scoreAfter: 99,
    },
    ecommerce: {
      name: "🛍️ ecommerce-ai-store",
      desc: "Lovable.dev shopping cart & checkout flow",
      issuesFound: 2,
      criticalText: "SQL Injection in Search & Missing CSRF Token",
      scoreBefore: 64,
      scoreAfter: 98,
    },
    llm: {
      name: "🤖 llm-agent-portal",
      desc: "v0 / Windsurf AI wrapper & chatbot interface",
      issuesFound: 4,
      criticalText: "Missing Prompt Rate Limit & Denial of Wallet Risk",
      scoreBefore: 52,
      scoreAfter: 100,
    },
  };

  const activeDemo = demoRepos[selectedDemoRepo];

  const faqs = [
    {
      q: "Does VibeAudit store my proprietary source code or use it to train AI models?",
      a: "Absolutely never. VibeAudit operates in strict zero-retention ephemeral RAM sandboxes (AWS Nitro Enclaves). Your codebase is analyzed in volatile memory to generate an Abstract Syntax Tree (AST) vulnerability graph, and all code snippets are permanently purged the microsecond the scan concludes. We are SOC2 Type II compliant and never train LLMs on customer code.",
    },
    {
      q: "How do I know the AI-generated Pull Requests won’t break my production application?",
      a: "Unlike generic LLMs that hallucinate syntax, VibeAudit’s Autonomous PR Engine runs a sandboxed TypeScript compilation and AST integrity check before creating any branch. If a suggested fix introduces type errors or breaks existing unit tests in your repository, our engine self-corrects or flags it for manual review with zero breaking changes guaranteed.",
    },
    {
      q: "Why can’t I just use traditional scanners like Snyk, SonarQube, or GitHub Dependabot?",
      a: "Legacy tools rely on static regex patterns and CVE dependency matching. They are blind to architectural business logic flaws common in AI-built apps—such as trusting subscription prices directly from frontend JSON payloads, missing LLM token rate limits, or improper OAuth state validation. VibeAudit understands semantic context.",
    },
    {
      q: "Which AI engineering platforms and frameworks does VibeAudit support?",
      a: "We support any codebase hosted on GitHub, GitLab, or Bitbucket. Our detection rules are specifically tailored for modern full-stack web frameworks (Next.js, React, Node.js, Python/FastAPI, Supabase, Stripe) and projects scaffolded via Cursor AI, Lovable, v0 by Vercel, Windsurf, Bolt.new, and Replit Agent.",
    },
    {
      q: "Can I use VibeAudit reports for SOC2, HIPAA, or investor technical due diligence?",
      a: "Yes! Our Pro and Agency plans include downloadable executive PDF compliance audits with verified cryptographic timestamps. Many founders use our A+ Security Grade certificate to pass enterprise client security reviews and investor due diligence in days instead of months.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 overflow-x-hidden selection:bg-indigo-500 selection:text-white relative font-sans">
      {/* Refined Obsidian & Platinum Ambient Glows */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-emerald-500/10 rounded-full blur-[190px] pointer-events-none -z-10"
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], x: [0, 40, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 left-10 w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[160px] pointer-events-none -z-10"
      />
      <motion.div
        animate={{ scale: [1, 1.25, 1], x: [0, -40, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-2/3 right-10 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[170px] pointer-events-none -z-10"
      />

      {/* Luxury VIP Top Bar */}
      <div className="bg-gradient-to-r from-[#0d0d14] via-[#141024] to-[#0d0d14] border-b border-white/10 text-[11px] font-mono py-2 px-4 text-center text-slate-300 backdrop-blur-md flex flex-wrap items-center justify-center gap-4 overflow-hidden">
        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
          <span>SOC2 &amp; HIPAA READY</span>
        </span>
        <span>
          <strong className="text-white font-bold">2026 VIP NETWORK:</strong> <strong className="text-indigo-300">{liveScanCount.toLocaleString()}</strong> Scans Completed Today
        </span>
        <span className="text-slate-600 hidden sm:inline">&bull;</span>
        <span className="hidden sm:inline">
          <strong className="text-emerald-400 font-bold">1,204</strong> Autonomous PRs Merged
        </span>
        <span className="text-slate-600 hidden md:inline">&bull;</span>
        <span className="hidden md:inline text-purple-300">0 Zero-Day Breaches Reported across 4,500+ Repos</span>
      </div>

      {/* 1. Ultra-Luxury Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#07070a]/85 border-b border-white/10 transition-all shadow-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6 }}
              className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-emerald-400 p-0.5 shadow-glow"
            >
              <div className="h-full w-full bg-[#07070a] rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-indigo-400 group-hover:text-white transition" />
              </div>
            </motion.div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-white font-mono flex items-center gap-1.5">
                <span>VibeAudit</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30 font-bold shadow-sm">
                  VIP v2.4
                </span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Executive AI Security</span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-300">
            <a href="#how-it-works" className="hover:text-white transition">How It Works</a>
            <a href="#who-its-for" className="hover:text-white transition">Who It&apos;s For</a>
            <a href="#demo-sandbox" className="hover:text-white transition flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Preview</span>
            </a>
            <a href="#roi" className="hover:text-white transition">ROI</a>
            <a href="#comparison" className="hover:text-white transition">Why Us</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-bold text-slate-300 hover:text-white transition px-4 py-2 hidden sm:inline-block"
            >
              Sign In
            </Link>
            <Link href="/signup">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-emerald-500 px-6 py-2.5 text-xs font-extrabold text-white shadow-glow flex items-center gap-2 border border-white/20"
              >
                <span>Start Free Scan</span>
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Luxury & Client-Friendly Hero Section */}
      <section className="relative pt-16 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8 relative">
          {/* Floating Luxury Trust Badges */}
          <motion.div
            animate={{ y: [0, -10, 0], rotate: [-1, 1, -1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-4 -left-6 hidden xl:flex items-center gap-2 px-4 py-2.5 rounded-2xl glass-card border border-indigo-500/30 text-xs font-semibold text-slate-200 shadow-2xl bg-white/[0.03]"
          >
            <Briefcase className="h-4 w-4 text-indigo-400" />
            <span>Built for CEOs &amp; Founders</span>
          </motion.div>

          <motion.div
            animate={{ y: [0, 10, 0], rotate: [1, -1, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-10 -right-8 hidden xl:flex items-center gap-2 px-4 py-2.5 rounded-2xl glass-card border border-emerald-500/30 text-xs font-semibold text-slate-200 shadow-2xl bg-white/[0.03]"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Zero Brand Risk Guarantee</span>
          </motion.div>

          {/* Perspective Toggle (Executive vs Developer) - ULTRA CLIENT FRIENDLY */}
          <div className="flex items-center justify-center gap-2">
            <div className="inline-flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl">
              <button
                onClick={() => setViewMode("executive")}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                  viewMode === "executive"
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-glow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span>Executive &amp; Founder View</span>
              </button>
              <button
                onClick={() => setViewMode("developer")}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                  viewMode === "developer"
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-glow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Terminal className="h-3.5 w-3.5" />
                <span>CTO &amp; Engineer View</span>
              </button>
            </div>
          </div>

          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-extrabold font-mono uppercase tracking-wider shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>
                {viewMode === "executive"
                  ? "Protect Your Brand • Pass Enterprise Client Audits in 120s"
                  : "Zero-Day AST Protection for AI-Generated Codebases"}
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1] max-w-4xl mx-auto">
              {viewMode === "executive" ? (
                <>
                  Built your app with AI? <br />
                  <span className="text-gradient">Launch with 100% security peace of mind.</span>
                </>
              ) : (
                <>
                  Built your app with AI? <br />
                  <span className="text-gradient">Scan it before it gets hacked.</span>
                </>
              )}
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed">
              {viewMode === "executive"
                ? "Apps built with modern AI tools ship 10x faster—but often hide critical security leaks that can cost you customer trust and investor funding. VibeAudit acts as your autonomous 24/7 security team, finding and fixing leaks before launch."
                : "Apps scaffolded via Cursor, Lovable, v0, and Windsurf ship fast—but often hide critical SQLi, Stripe payment bypasses, and secret leaks. VibeAudit parses ASTs in volatile memory and opens drop-in fix PRs autonomously."}
            </p>
          </motion.div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-4">
            <Link href="/onboarding" className="w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-emerald-500 text-white font-black text-sm shadow-glow flex items-center justify-center gap-2 border border-white/20"
              >
                <Github className="h-5 w-5 fill-current" />
                <span>Connect GitHub &amp; Get Security Score</span>
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </Link>

            <a href="#demo-sandbox" className="w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold text-sm border border-white/15 flex items-center justify-center gap-2 shadow-sm"
              >
                <Sparkles className="h-5 w-5 text-indigo-400" />
                <span>Try Interactive Preview Below</span>
              </motion.button>
            </a>
          </div>

          <p className="text-xs text-slate-400 font-mono flex flex-wrap items-center justify-center gap-6 pt-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>No credit card required</span>
            </span>
            <span className="hidden sm:inline">&bull;</span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-indigo-400" />
              <span>Read-only volatile RAM scan</span>
            </span>
            <span className="hidden sm:inline">&bull;</span>
            <span className="flex items-center gap-1.5">
              <Award className="h-4 w-4 text-purple-400" />
              <span>SOC2 Type II Compliant</span>
            </span>
          </p>
        </div>
      </section>

      {/* 2.5. NEW: How VibeAudit Works in 3 Simple Steps (Crystal Clear for Clients) */}
      <section id="how-it-works" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-indigo-400 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30">
            3-Step Automated Workflow
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            How VibeAudit Secures Your App <span className="text-gradient">in 60 Seconds</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-medium">
            No complex configuration or security expertise required. Here is exactly how VibeAudit turns your AI-built repository into an enterprise-ready fortress.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting Line for desktop */}
          <div className="hidden md:block absolute top-1/2 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-indigo-500/40 via-purple-500/40 to-emerald-500/40 -translate-y-8 z-0 pointer-events-none" />

          {[
            {
              step: "01",
              title: "1-Click GitHub Connect",
              desc: "Install our GitHub App in seconds. VibeAudit connects to your repository with read-only permissions without ever storing your proprietary source code on disk.",
              icon: Github,
              badge: "No Code Required",
              color: "from-indigo-500/20 to-purple-500/10 border-indigo-500/40 text-indigo-400",
            },
            {
              step: "02",
              title: "Deep AST & AI Audit",
              desc: "Our engine scans your codebase in volatile RAM, detecting hidden architectural flaws—like Stripe price trust, SQL injection, and LLM token leaks that regex scanners miss.",
              icon: Zap,
              badge: "60-Second Scan",
              color: "from-purple-500/20 to-pink-500/10 border-purple-500/40 text-purple-400",
            },
            {
              step: "03",
              title: "Autonomous Fix PRs",
              desc: "Instead of just leaving a confusing PDF report, VibeAudit autonomously generates secure TypeScript/SQL patches and opens ready-to-merge GitHub Pull Requests!",
              icon: GitPullRequest,
              badge: "One-Click Merge",
              color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-400",
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className={`glass-card rounded-3xl p-8 border bg-gradient-to-br ${item.color} space-y-6 relative z-10 shadow-xl flex flex-col justify-between`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black font-mono text-white/30">{item.step}</span>
                    <span className="text-[11px] font-extrabold font-mono uppercase tracking-wider px-3 py-1 rounded-full bg-white/10 text-white border border-white/15">
                      {item.badge}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/50 w-fit border border-white/10 shadow-inner">
                    <Icon className="h-8 w-8 fill-current" />
                  </div>
                  <h3 className="text-xl font-black text-white">{item.title}</h3>
                  <p className="text-sm text-slate-300 font-medium leading-relaxed">{item.desc}</p>
                </div>
                <div className="pt-4 border-t border-white/10 flex items-center gap-2 text-xs font-bold text-slate-400">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Verified Safe &bull; Zero Breaking Changes</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 3. NEW: Interactive Client Sandbox Scan Preview (ULTRA UX & CLIENT FRIENDLY) */}
      <section id="demo-sandbox" className="py-20 px-6 max-w-6xl mx-auto border-t border-white/10">
        <div className="text-center space-y-4 mb-12">
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            Frictionless Client Experience
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Try an <span className="text-gradient">Interactive Sandbox Scan</span>
          </h2>
          <p className="text-base text-slate-300 max-w-2xl mx-auto font-medium">
            Don&apos;t want to connect your repo just yet? Select a simulated AI-built project below and see how VibeAudit transforms a risky codebase into an enterprise-certified A+ grade in seconds.
          </p>
        </div>

        <div className="glass-card rounded-3xl p-8 md:p-12 border border-white/20 bg-gradient-to-br from-white/[0.04] to-black/80 shadow-2xl space-y-8">
          {/* Repo Selection Buttons */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Search className="h-5 w-5 text-indigo-400" />
                <span>Select Sample AI Project to Scan:</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">Experience our real-time audit report &amp; autonomous PR patching engine.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "fintech", label: "🏦 fintech-cursor-app" },
                { id: "ecommerce", label: "🛍️ ecommerce-ai-store" },
                { id: "llm", label: "🤖 llm-agent-portal" },
              ].map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => {
                    setSelectedDemoRepo(repo.id as any);
                    setDemoScanDone(false);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs font-mono transition-all ${
                    selectedDemoRepo === repo.id
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-glow scale-105"
                      : "bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/10"
                  }`}
                >
                  {repo.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sandbox Preview Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            {/* Repo Info */}
            <div className="space-y-5 lg:col-span-1 p-6 rounded-2xl bg-black/60 border border-white/10">
              <div className="space-y-1">
                <span className="text-xs text-indigo-400 font-mono font-bold uppercase">Target Codebase</span>
                <h4 className="text-xl font-black text-white font-mono">{activeDemo.name}</h4>
                <p className="text-xs text-slate-400">{activeDemo.desc}</p>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/10 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Vulnerabilities Detected:</span>
                  <span className="text-rose-400 font-bold font-mono">{activeDemo.issuesFound} Critical Leaks</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Primary Risk:</span>
                  <span className="text-amber-300 font-semibold">{activeDemo.criticalText}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Initial Security Score:</span>
                  <span className="text-rose-400 font-extrabold font-mono text-sm">{activeDemo.scoreBefore} / 100</span>
                </div>
              </div>

              <motion.button
                onClick={runDemoScan}
                disabled={isDemoScanning}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-emerald-500 text-white font-black text-xs font-mono shadow-glow flex items-center justify-center gap-2"
              >
                {isDemoScanning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>SCANNING &amp; PATCHING...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>⚡ RUN 2-SECOND VIP SCAN</span>
                  </>
                )}
              </motion.button>
            </div>

            {/* Visual Output Display */}
            <div className="lg:col-span-2 p-6 md:p-8 rounded-2xl bg-[#0d0a14]/90 border border-white/15 min-h-[260px] flex flex-col justify-center relative overflow-hidden">
              <AnimatePresence mode="wait">
                {isDemoScanning ? (
                  <motion.div
                    key="scanning"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4 text-center font-mono py-8"
                  >
                    <RefreshCw className="h-10 w-10 text-indigo-400 animate-spin mx-auto" />
                    <div className="space-y-1">
                      <h5 className="text-base font-bold text-white">ANALYZING AST GRAPH &amp; BUSINESS LOGIC...</h5>
                      <p className="text-xs text-slate-400">Intercepting database queries &amp; generating drop-in PR fixes</p>
                    </div>
                  </motion.div>
                ) : demoScanDone ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black text-xl font-mono shadow-glow">
                          A+
                        </div>
                        <div>
                          <span className="text-xs text-emerald-400 font-extrabold uppercase tracking-wider">Audit Complete &bull; Zero Brand Risk</span>
                          <h4 className="text-lg font-black text-white">Enterprise Security Certificate Awarded</h4>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/40">
                        SCORE: {activeDemo.scoreAfter}/100
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                      <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                        <div>
                          <strong className="text-white block">PR #104 Opened Automatically</strong>
                          <span className="text-slate-400">Parameterized queries replaced raw strings</span>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                        <div>
                          <strong className="text-white block">Stripe Webhook Shielded</strong>
                          <span className="text-slate-400">Server-side price verification enforced</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-slate-400 font-mono">Ready to get this exact report for your real codebase?</span>
                      <Link href="/onboarding" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono">
                        <span>Scan Your Repo Now</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center space-y-4 py-8 text-slate-400"
                  >
                    <Shield className="h-12 w-12 text-indigo-400/50 mx-auto" />
                    <div className="space-y-1">
                      <h5 className="text-base font-bold text-slate-200">Ready to simulate autonomous AI audit</h5>
                      <p className="text-xs max-w-md mx-auto">Click the button on the left to see how VibeAudit detects critical leaks and generates verified pull requests.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Logo Trust Strip */}
      <section className="py-12 border-y border-white/10 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">
            Securing next-gen codebases built with modern AI engineering tools
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-75 font-black text-lg sm:text-xl font-mono text-slate-300">
            {["⚡ Cursor AI", "💖 Lovable.dev", "▲ v0 by Vercel", "🌊 Windsurf IDE", "🔩 Bolt.new", "🤖 GitHub Copilot"].map((logo, idx) => (
              <motion.span
                key={idx}
                whileHover={{ scale: 1.15, color: "#ffffff", opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="cursor-pointer transition-colors"
              >
                {logo}
              </motion.span>
            ))}
          </div>
        </div>
      </section>

      {/* 4.5. NEW: Who VibeAudit is Built For (Target Personas & Use Cases) */}
      <section id="who-its-for" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-purple-400 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30">
            Tailored For AI Speed
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Who Needs <span className="text-gradient">VibeAudit?</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-medium">
            Whether you are shipping solo with Cursor or leading an agency building for enterprise clients, VibeAudit protects your brand reputation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              role: "Founders & Solo Devs",
              tool: "Using Cursor AI & Windsurf",
              headline: "Launch Fast Without Getting Hacked",
              desc: "You built your MVP in record time using AI assistants. VibeAudit ensures you don't accidentally ship hardcoded API keys, unvalidated billing webhooks, or open database leaks.",
              icon: Briefcase,
              badge: "Protect MVP Launch",
              benefit: "Save $15,000+ on manual security audits",
              border: "border-indigo-500/40 hover:border-indigo-500",
              glow: "from-indigo-600/15 via-transparent to-transparent",
            },
            {
              role: "Agencies & Dev Studios",
              tool: "Using Lovable.dev & v0 by Vercel",
              headline: "Win Enterprise Client Contracts",
              desc: "Enterprise clients demand strict security due diligence before signing $20k+ contracts. Attach VibeAudit's verified 'A+ Security Certificate' to your deliverables and close deals 10x faster.",
              icon: Award,
              badge: "SOC2 & Client Audit Ready",
              benefit: "Close high-ticket enterprise contracts",
              border: "border-purple-500/40 hover:border-purple-500",
              glow: "from-purple-600/15 via-transparent to-transparent",
            },
            {
              role: "CTOs & Engineering Leads",
              tool: "Managing Copilot & Junior Devs",
              headline: "24/7 Automated Security Reviewer",
              desc: "Your team is merging hundreds of AI-generated pull requests every week. VibeAudit acts as an autonomous senior security engineer in your CI/CD pipeline, blocking flaws before merge.",
              icon: ShieldCheck,
              badge: "Continuous CI/CD Guard",
              benefit: "Zero vulnerability backlog in production",
              border: "border-emerald-500/40 hover:border-emerald-500",
              glow: "from-emerald-600/15 via-transparent to-transparent",
            },
          ].map((persona, idx) => {
            const Icon = persona.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                whileHover={{ scale: 1.04 }}
                className={`glass-card rounded-3xl p-8 border ${persona.border} bg-gradient-to-b ${persona.glow} space-y-6 shadow-2xl flex flex-col justify-between`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-extrabold text-indigo-300 uppercase tracking-wider">{persona.tool}</span>
                    <span className="text-[10px] font-extrabold font-mono px-2.5 py-1 rounded-lg bg-white/10 text-white border border-white/15">
                      {persona.badge}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/60 w-fit border border-white/10">
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">{persona.role}</h3>
                    <h4 className="text-sm font-bold text-gradient mt-1">{persona.headline}</h4>
                  </div>
                  <p className="text-sm text-slate-300 font-medium leading-relaxed">{persona.desc}</p>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center gap-2 text-xs font-bold text-emerald-400 font-mono">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{persona.benefit}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 5. Interactive ROI & Security Calculator */}
      <section id="roi" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            Enterprise Financial Impact
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            The Cost of a Data Breach vs. <span className="text-gradient">VibeAudit ROI</span>
          </h2>
          <p className="text-base text-slate-300 max-w-2xl mx-auto font-medium">
            Manual security audits cost tens of thousands and slow down release cycles. See how much money and engineering time you save with autonomous AI PR patching.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-card rounded-3xl p-8 md:p-12 border border-white/20 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent shadow-2xl space-y-10 relative overflow-hidden"
        >
          {/* Scale Selector */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-white/10">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Calculator className="h-6 w-6 text-indigo-400" />
                <span>Select Your Engineering Team Scale:</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">Metrics calculated based on average industry pentesting fees and developer hourly rates ($120/hr).</p>
            </div>

            <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-2xl border border-white/10">
              {[
                { id: "startup", label: "Solo / Startup" },
                { id: "growth", label: "Growth (10-25 Devs)" },
                { id: "enterprise", label: "Enterprise (50+ Devs)" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTeamScale(tab.id as any)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs font-mono transition-all duration-200 relative ${
                    teamScale === tab.id
                      ? "text-white shadow-glow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {teamScale === tab.id && (
                    <motion.div
                      layoutId="roiTabIndicator"
                      className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Kinetic Metrics Grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={teamScale}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-6"
            >
              <div className="p-6 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <span className="text-xs font-mono uppercase text-slate-400 font-bold block">Traditional Audit Cost</span>
                <span className="text-2xl md:text-3xl font-black text-rose-400 font-mono">{currentMetrics.manualCost}</span>
                <p className="text-[11px] text-slate-400">Manual external pentesting &amp; compliance consultants</p>
              </div>

              <div className="p-6 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <span className="text-xs font-mono uppercase text-slate-400 font-bold block">Dev Hours Wasted</span>
                <span className="text-2xl md:text-3xl font-black text-amber-400 font-mono">{currentMetrics.wastedHours}</span>
                <p className="text-[11px] text-slate-400">Spent deciphering PDF reports &amp; manual bug fixing</p>
              </div>

              <div className="p-6 rounded-2xl bg-indigo-500/15 border-2 border-indigo-500/40 space-y-2 shadow-glow">
                <span className="text-xs font-mono uppercase text-indigo-300 font-bold block">VibeAudit Autonomous Cost</span>
                <span className="text-2xl md:text-3xl font-black text-white font-mono">{currentMetrics.vibeCost}</span>
                <p className="text-[11px] text-indigo-200">Unlimited AST scans &amp; one-click AI PR patches</p>
              </div>

              <div className="p-6 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/40 space-y-2 shadow-glow">
                <span className="text-xs font-mono uppercase text-emerald-300 font-bold block">Total Net Savings</span>
                <span className="text-2xl md:text-3xl font-black text-emerald-400 font-mono">{currentMetrics.savings}</span>
                <p className="text-[11px] text-emerald-200">Plus {currentMetrics.prCount} opened autonomously</p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 text-xs font-medium text-slate-300 bg-white/[0.03] p-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>By switching to VibeAudit, teams reduce security vulnerability backlog by <strong>94%</strong> within the first 14 days.</span>
            </div>
            <Link
              href="/signup"
              className="text-indigo-400 hover:text-indigo-300 font-bold font-mono whitespace-nowrap flex items-center gap-1"
            >
              <span>Claim Your Savings Now</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* 5.5. NEW: Before vs. After VibeAudit (Visual Breakdown for Founders) */}
      <section id="comparison" className="py-24 px-6 max-w-6xl mx-auto border-t border-white/10">
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            Why We Are Different
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            The Old Way vs. <span className="text-gradient">The VibeAudit Way</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-medium">
            See why modern SaaS founders are abandoning slow, expensive manual pentesting in favor of autonomous AI security.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Before VibeAudit (The Old Way) */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="glass-card rounded-3xl p-8 md:p-10 border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-black/80 to-black/90 space-y-6 shadow-xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between pb-4 border-b border-rose-500/20">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 font-black">
                  ❌
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">The Old Way</h3>
                  <span className="text-xs text-rose-400 font-semibold font-mono">Manual Audits &amp; Blind Launches</span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-300 font-mono text-xs font-bold border border-rose-500/30">
                High Risk &amp; Cost
              </span>
            </div>

            <ul className="space-y-4 text-sm text-slate-300 font-medium">
              {[
                { title: "Blind to AI Architectural Flaws", desc: "Legacy regex tools miss frontend price spoofing and LLM token drains." },
                { title: "Expensive Consultant Fees ($15k–$50k)", desc: "Hiring manual security firms burns precious startup runway and takes 3–6 weeks." },
                { title: "Confusing 100-Page PDF Reports", desc: "You get a massive list of theoretical warnings with zero actionable code fixes." },
                { title: "Failed Enterprise & Investor Audits", desc: "Losing high-ticket B2B deals because you lack verified SOC2 / security certification." },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-bold">{item.title}</strong>
                    <span className="text-xs text-slate-400">{item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* After VibeAudit (The VibeAudit Way) */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="glass-card rounded-3xl p-8 md:p-10 border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-500/15 via-indigo-500/10 to-black/90 space-y-6 shadow-glow relative overflow-hidden"
          >
            <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-black">
                  ⚡
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">The VibeAudit Way</h3>
                  <span className="text-xs text-emerald-400 font-semibold font-mono">Autonomous 60-Second AI Security</span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/40 shadow-glow">
                10x Faster &amp; Safer
              </span>
            </div>

            <ul className="space-y-4 text-sm text-slate-200 font-medium">
              {[
                { title: "Deep AST & Semantic Context Engine", desc: "Understands full-stack AI business logic, intercepting database and Stripe payment flaws." },
                { title: "A Fraction of the Cost ($29/mo)", desc: "Continuous 24/7 autonomous security monitoring for less than the cost of a team lunch." },
                { title: "Autonomous Drop-In Pull Requests", desc: "Our AI writes tested, verified TypeScript & SQL patches and opens PRs for you automatically." },
                { title: "Instant A+ Enterprise Certificate", desc: "Download verifiable compliance certificates to close enterprise B2B sales and impress investors!" },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.05] border border-emerald-500/20">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-bold">{item.title}</strong>
                    <span className="text-xs text-emerald-200/80">{item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* 6. Interactive Vulnerability Showcase with CLIENT-FRIENDLY Business Impact Banner */}
      <section id="vulnerabilities" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-rose-400 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30">
              Why Traditional Tools Fail
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              What We Catch That <span className="text-gradient">Others Miss</span>
            </h2>
            <p className="text-base text-slate-300 max-w-2xl mx-auto font-medium">
              AI code generators love shortcuts&mdash;like trusting prices from the frontend or concatenating SQL strings. VibeAudit specializes in AI-engineered architectural flaws.
            </p>
          </div>

          {/* Interactive Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { id: "sqli", label: "🚨 SQL Injection via String Interpolation" },
              { id: "stripe", label: "⚠️ Stripe Payment Bypass (Client Price Trust)" },
              { id: "llm", label: "🤖 LLM Prompt Injection & Token Drain" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setPatchSuccess(false);
                }}
                className={`px-6 py-3.5 rounded-2xl font-bold text-xs md:text-sm font-mono transition-all duration-300 relative shadow-sm ${
                  activeTab === tab.id
                    ? "text-white shadow-glow scale-105"
                    : "bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/10"
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="vulnTabIndicator"
                    className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-600 to-emerald-500 rounded-2xl -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Code Showcase Card with Client-Friendly Business Impact */}
          <motion.div
            layout
            className="max-w-5xl mx-auto glass-card rounded-3xl p-8 border border-white/20 bg-[#0d0a14]/90 shadow-2xl space-y-6 font-mono text-xs sm:text-sm relative overflow-hidden"
          >
            {/* VIP Client-Friendly Business Impact Banner */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start gap-3 font-sans">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold text-sm">
                  {activeTab === "sqli" && "💰 Business Impact: Customer Database Dump & Reputation Ruin"}
                  {activeTab === "stripe" && "💰 Business Impact: Revenue Theft & Unpaid Enterprise Subscription"}
                  {activeTab === "llm" && "💰 Business Impact: Anthropic/OpenAI Bill Drain ($10,000+ Bot Spam)"}
                </strong>
                <span className="text-xs text-amber-200/90 leading-relaxed block mt-0.5">
                  {activeTab === "sqli" && "An attacker could manipulate query strings to bypass login screens or steal sensitive billing records and API keys. VibeAudit automatically enforces parameterized queries."}
                  {activeTab === "stripe" && "AI code assistants frequently trust the unit_amount passed from the frontend JSON payload. An attacker could change $999.00 to $0.01 and checkout successfully without triggering errors."}
                  {activeTab === "llm" && "Without strict IP rate limiting and token validation, automated scripts can spam your AI generation endpoint and exhaust your monthly LLM credits overnight."}
                </span>
              </div>
            </div>

            {/* Kinetic Patch Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <span className="text-rose-400 font-bold uppercase text-xs">
                  {activeTab === "sqli" && "Critical Vulnerability • app/api/checkout/route.ts"}
                  {activeTab === "stripe" && "Moderate Vulnerability • app/api/stripe/checkout.ts"}
                  {activeTab === "llm" && "Low / Denial of Wallet • app/api/ai/generate.ts"}
                </span>
                <h4 className="text-lg font-bold text-white mt-1">
                  {activeTab === "sqli" && "Raw Database Query Concatenation"}
                  {activeTab === "stripe" && "Client-Side Price Payload Trust"}
                  {activeTab === "llm" && "Missing LLM Rate Limiting & Token Quotas"}
                </h4>
              </div>

              <motion.button
                onClick={triggerAiPatch}
                disabled={isPatching || patchSuccess}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-5 py-2.5 rounded-xl font-extrabold text-xs font-mono transition flex items-center gap-2 shadow-glow ${
                  patchSuccess
                    ? "bg-emerald-500 text-black"
                    : isPatching
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                    : "bg-gradient-to-r from-indigo-500 via-purple-600 to-emerald-500 text-white"
                }`}
              >
                {isPatching ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>AST PATCHING IN PROGRESS...</span>
                  </>
                ) : patchSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>✔ PR #92 OPENED &amp; VERIFIED!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>⚡ SIMULATE AUTONOMOUS AI PATCH</span>
                  </>
                )}
              </motion.button>
            </div>

            {/* Kinetic Scanning Overlay when isPatching is true */}
            <AnimatePresence>
              {isPatching && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/85 backdrop-blur-md z-20 flex flex-col items-center justify-center gap-4 text-center p-6"
                >
                  <RefreshCw className="h-10 w-10 text-indigo-400 animate-spin" />
                  <div className="space-y-1">
                    <h4 className="text-base font-black text-white font-mono">AUTONOMOUS AST REFACTORING IN PROGRESS...</h4>
                    <p className="text-xs text-slate-400">Generating parameterized query binding &amp; verifying zero breaking type errors</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {activeTab === "sqli" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                  <span className="text-rose-300 font-bold text-xs">❌ Vulnerable AI-Generated Code</span>
                  <pre className="text-rose-200/90 overflow-x-auto leading-relaxed pt-2">
                    <code>{`const userId = req.query.id;\nconst query = "SELECT * FROM users WHERE id = '" + userId + "'";\nconst data = await db.raw(query);`}</code>
                  </pre>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 relative">
                  <span className="text-emerald-300 font-bold text-xs">✅ VibeAudit Secure Replacement</span>
                  <pre className="text-emerald-200/90 overflow-x-auto leading-relaxed pt-2">
                    <code>{`const userId = req.query.id;\nif (typeof userId !== "string") throw new Error("Invalid ID");\nconst query = "SELECT * FROM users WHERE id = $1";\nconst data = await db.query(query, [userId]);`}</code>
                  </pre>
                  {patchSuccess && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-3 -right-3 bg-emerald-500 text-black px-3 py-1 rounded-full text-[10px] font-black shadow-lg"
                    >
                      PATCHED &amp; MERGED!
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "stripe" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                  <span className="text-rose-300 font-bold text-xs">❌ Vulnerable AI-Generated Code</span>
                  <pre className="text-rose-200/90 overflow-x-auto leading-relaxed pt-2">
                    <code>{`const body = await req.json();\n// Hacker changes unit_amount from 9900 to 1 ($0.01)!\nconst session = await stripe.checkout.sessions.create({\n  line_items: [{ price_data: { unit_amount: body.amount } }]\n});`}</code>
                  </pre>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 relative">
                  <span className="text-emerald-300 font-bold text-xs">✅ VibeAudit Secure Replacement</span>
                  <pre className="text-emerald-200/90 overflow-x-auto leading-relaxed pt-2">
                    <code>{`const { planType } = await req.json();\nconst verifiedPriceId = SERVER_PLAN_PRICES[planType];\nif (!verifiedPriceId) throw new Error("Invalid Plan");\nconst session = await stripe.checkout.sessions.create({\n  line_items: [{ price: verifiedPriceId, quantity: 1 }]\n});`}</code>
                  </pre>
                  {patchSuccess && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-3 -right-3 bg-emerald-500 text-black px-3 py-1 rounded-full text-[10px] font-black shadow-lg"
                    >
                      PATCHED &amp; MERGED!
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "llm" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                  <span className="text-rose-300 font-bold text-xs">❌ Vulnerable AI-Generated Code</span>
                  <pre className="text-rose-200/90 overflow-x-auto leading-relaxed pt-2">
                    <code>{`export async function POST(req: Request) {\n  const { prompt } = await req.json();\n  // No rate check! Bots can spam & drain your Anthropic credits\n  return anthropic.messages.create({ messages: [{ content: prompt }] });\n}`}</code>
                  </pre>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 relative">
                  <span className="text-emerald-300 font-bold text-xs">✅ VibeAudit Secure Replacement</span>
                  <pre className="text-emerald-200/90 overflow-x-auto leading-relaxed pt-2">
                    <code>{`export async function POST(req: Request) {\n  const ip = req.headers.get("x-forwarded-for") || "anon";\n  const { success } = await rateLimit.check(ip, 10);\n  if (!success) return new Response("Rate Limit", { status: 429 });\n  /* Proceed safely */\n}`}</code>
                  </pre>
                  {patchSuccess && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-3 -right-3 bg-emerald-500 text-black px-3 py-1 rounded-full text-[10px] font-black shadow-lg"
                    >
                      PATCHED &amp; MERGED!
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* 7. Live Architecture & Zero-Retention Sandbox Deep Dive */}
      <section id="architecture" className="py-24 px-6 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent border-y border-white/10">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-purple-400 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30">
              Enterprise-Grade Privacy &amp; Architecture
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Inside Our <span className="text-gradient">Zero-Retention RAM Sandbox</span>
            </h2>
            <p className="text-base text-slate-300 max-w-2xl mx-auto font-medium">
              We know your proprietary source code is your most valuable asset. That&apos;s why VibeAudit was engineered from day one with zero-disk retention and cryptographic isolation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: "Volatile RAM-Only Parsing",
                desc: "Code is analyzed inside ephemeral AWS Nitro Enclaves. Source files are processed in RAM to build AST graphs and destroyed instantly after scanning.",
                icon: Server,
                color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
              },
              {
                title: "Zero LLM Code Training",
                desc: "We guarantee in writing that your proprietary source code, API schemas, and business logic are never stored or used to train public or private AI models.",
                icon: EyeOff,
                color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
              },
              {
                title: "Semantic Context Engine",
                desc: "Unlike dumb legacy regex scanners, our engine understands full-stack data flow—tracing user input from frontend components down to raw SQL queries.",
                icon: Code2,
                color: "text-pink-400 bg-pink-500/10 border-pink-500/30",
              },
              {
                title: "Sandboxed PR Verification",
                desc: "Before opening a GitHub PR, our AI compiles the patch in an isolated container to ensure zero TypeScript errors or breaking dependency conflicts.",
                icon: GitBranch,
                color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
              },
            ].map((arch, idx) => {
              const Icon = arch.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  className="glass-card rounded-3xl p-8 border border-white/15 space-y-4 hover:border-white/30 transition duration-300 flex flex-col justify-between shadow-lg"
                >
                  <div className="space-y-4">
                    <div className={`p-3.5 rounded-2xl w-fit border ${arch.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white">{arch.title}</h3>
                    <p className="text-xs text-slate-300 font-medium leading-relaxed">{arch.desc}</p>
                  </div>
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400 font-bold">
                    <span>PROTOCOL 0{idx + 1}</span>
                    <span className="text-emerald-400">&bull; VERIFIED</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. Testimonials & Social Proof */}
      <section id="testimonials" className="py-24 px-6 max-w-7xl mx-auto space-y-16 border-t border-white/10">
        <div className="text-center space-y-4">
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-amber-400 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
            Trusted by Modern Founders
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Loved by Teams Shipping at <span className="text-gradient">AI Speed</span>
          </h2>
          <p className="text-base text-slate-300 max-w-2xl mx-auto font-medium">
            See how high-velocity software startups protect their customer data without slowing down deployment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              quote: "We built our entire fintech dashboard in 3 weeks using Cursor. VibeAudit caught a Stripe webhook signature bypass 2 hours before our Product Hunt launch. Saved our company.",
              author: "Marcus Vance",
              role: "Co-Founder & CTO @ PayScale AI",
              score: "98/100 VibeScore",
            },
            {
              quote: "As an agency building Lovable and v0 prototypes for enterprise clients, VibeAudit is our secret weapon. We attach their A+ Security Audit badge to every client deliverable.",
              author: "David Chen",
              role: "Managing Director @ July SaaS Studio",
              score: "99/100 VibeScore",
            },
          ].map((test, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              whileHover={{ scale: 1.03, y: -5 }}
              className="glass-card rounded-3xl p-8 border border-white/15 bg-gradient-to-br from-white/[0.04] to-transparent space-y-6 shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-medium">&ldquo;{test.quote}&rdquo;</p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">{test.author}</h4>
                  <p className="text-xs text-slate-400">{test.role}</p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold border border-emerald-500/30">
                  {test.score}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 9. Enterprise FAQ Accordion */}
      <section id="faq" className="py-24 px-6 max-w-5xl mx-auto border-t border-white/10">
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-indigo-400 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30">
            Frequently Asked Questions
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Everything You Need to <span className="text-gradient">Know Before Scanning</span>
          </h2>
          <p className="text-base text-slate-300 max-w-2xl mx-auto font-medium">
            Have questions about code privacy, AI accuracy, or enterprise compliance? We&apos;ve got you covered.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((f, idx) => {
            const isOpen = openFaq === idx;
            return (
              <motion.div
                key={idx}
                className={`glass-card rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen ? "border-indigo-500/50 bg-white/[0.04] shadow-lg" : "border-white/10 bg-white/[0.01] hover:border-white/20"
                }`}
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 font-bold text-base text-white"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5 text-indigo-400 shrink-0" />
                    <span>{f.q}</span>
                  </span>
                  <div className={`p-1.5 rounded-xl bg-white/10 transition-transform ${isOpen ? "rotate-180 bg-indigo-500/30 text-indigo-300" : ""}`}>
                    <ChevronDown className="h-4 w-4 text-slate-300" />
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="px-6 pb-6 pt-2 text-sm text-slate-300 font-medium leading-relaxed border-t border-white/10"
                    >
                      {f.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 10. Bottom Final CTA */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.4 }}
          className="glass-card rounded-3xl p-12 md:p-16 border border-indigo-500/50 bg-gradient-to-br from-indigo-600/20 via-purple-600/15 to-emerald-500/10 text-center space-y-8 shadow-glow relative overflow-hidden"
        >
          <motion.div
            animate={{ scale: [1, 1.3, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-24 -right-24 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"
          />

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight max-w-3xl mx-auto">
            Ready to secure your AI-built application before your next release?
          </h2>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-medium">
            Connect your repository in 60 seconds. Get an instant VibeScore and let our AI generate your first security patch PR for free.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-4">
            <Link href="/onboarding" className="w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-emerald-500 text-white font-black text-base shadow-glow flex items-center justify-center gap-2.5 border border-white/20"
              >
                <Github className="h-6 w-6 fill-current" />
                <span>Connect GitHub &amp; Start Free Scan</span>
                <ArrowRight className="h-5 w-5" />
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* 11. Sleek Footer */}
      <footer className="border-t border-white/10 py-12 px-6 bg-black/80 text-xs text-slate-400 font-medium">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 p-0.5">
              <div className="h-full w-full bg-[#07070a] rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
              </div>
            </div>
            <span className="font-bold text-white font-mono text-sm">VibeAudit VIP v2.4</span>
            <span className="text-slate-500">&bull;</span>
            <span>&copy; 2026 July SaaS Studio. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-slate-300">
            <Link href="/dashboard" className="hover:text-white transition">Dashboard</Link>
            <a href="#how-it-works" className="hover:text-white transition">How It Works</a>
            <a href="#who-its-for" className="hover:text-white transition">Who It&apos;s For</a>
            <a href="#demo-sandbox" className="hover:text-white transition">Preview</a>
            <a href="#roi" className="hover:text-white transition">ROI Calculator</a>
            <a href="#comparison" className="hover:text-white transition">Why Us</a>
            <a href="#faq" className="hover:text-white transition">Security FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
