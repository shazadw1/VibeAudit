"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Bot,
  User,
  Send,
  Terminal,
  Code2,
  ShieldAlert,
  ShieldCheck,
  Check,
  Copy,
  RefreshCw,
  ArrowRight,
  GitPullRequest,
  FileText,
  Cpu,
  Lock,
  Zap,
  Layers,
  HelpCircle,
  ExternalLink,
  Github,
  Laptop,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  timestamp: string;
  content: string;
  codeSnippet?: {
    language: string;
    filename: string;
    code: string;
  };
  actions?: {
    label: string;
    icon: any;
    actionType: "pr" | "copy" | "scan";
  }[];
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    sender: "ai",
    timestamp: "Just now",
    content:
      "Hello! This is a **sample conversation** showing what VibeAudit Copilot can do. It is not connected to any real repositories.\n\nIn a live session, you could ask me to audit API endpoints, generate CI/CD workflows, or explain security fixes. How can I help you explore the demo?",
    actions: [
      { label: "Example: Scan app/api/ for Auth Bypass", icon: ShieldAlert, actionType: "scan" },
      { label: "Example: Generate GitHub Actions CI YAML", icon: Terminal, actionType: "copy" },
      { label: "Example: Explain a SQL injection fix", icon: GitPullRequest, actionType: "pr" },
    ],
  },
];

const PRESET_PROMPTS = [
  {
    title: "🔍 Example: Audit app/api/ for OWASP Top 10 Vulnerabilities",
    sub: "Scan Next.js App Router endpoints for broken access control & injection",
    promptText: "Audit repositories for OWASP Top 10 vulnerabilities in app/api/ endpoints and highlight critical risks.",
    response: {
      content:
        "### 🚨 Example Security Audit Report: `app/api/` Endpoints\n\n*(This is a sample response — no real scan was performed.)*\n\nIn a live session, the copilot would analyze your connected repository for issues such as:\n\n1. **Example: Injection Risk (`app/api/checkout/route.ts:42`)**: Direct string interpolation in a SQL query could allow SQL injection attacks. A recommended fix is to use parameterized queries.\n2. **Rate Limiting Hardening (`app/api/ai/generate/route.ts`)**: A sliding window rate limiter (e.g. 10 req/min per IP) helps prevent abuse.\n3. **JWT Expiration**: Ensure access tokens enforce a short TTL (e.g. 15 minutes).",
      codeSnippet: {
        language: "typescript",
        filename: "lib/security/jwt-guard.ts",
        code: `// ✅ Example JWT Hardening Policy\nimport { jwtVerify } from "jose";\n\nexport async function verifySecureToken(token: string) {\n  const secret = new TextEncoder().encode(process.env.JWT_SECRET);\n  const { payload } = await jwtVerify(token, secret, {\n    issuer: "urn:vibeaudit:enterprise",\n    maxTokenAge: "15m", // Enforce strict 15-minute window\n  });\n  return payload;\n}`,
      },
      actions: [
        { label: "⚡ View Fix Engine (Demo)", icon: GitPullRequest, actionType: "pr" },
        { label: "📋 Copy JWT Guard Code", icon: Copy, actionType: "copy" },
      ],
    },
  },
  {
    title: "🛡️ Example: Generate GitHub Actions CI/CD Blocking Workflow",
    sub: "Block insecure pull requests before merging into main",
    promptText: "Generate a GitHub Actions YAML workflow that runs VibeAudit scanning and blocks PRs with low security scores.",
    response: {
      content:
        "### ⚡ Example: Automated CI/CD Enforcement Workflow\n\n*(This is a sample response — no workflow was deployed.)*\n\nHere is an example GitHub Actions workflow file. In a live integration this configuration would run the scanner on pull requests and block merges when the VibeScore drops below a configured threshold.",
      codeSnippet: {
        language: "yaml",
        filename: ".github/workflows/vibeaudit-security.yml",
        code: `name: VibeAudit Security Scan\n\non:\n  pull_request:\n    branches: [main, staging]\n\njobs:\n  security-audit:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Checkout Code Repository\n        uses: actions/checkout@v4\n\n      - name: Execute VibeAudit Scanner\n        uses: vibeaudit/action-scanner@v2\n        with:\n          api-key: \${{ secrets.VIBEAUDIT_API_TOKEN }}\n          min-vibescore: 90\n          fail-on-critical: true`,
      },
      actions: [
        { label: "📋 Copy Workflow YAML", icon: Copy, actionType: "copy" },
        { label: "✔ Mark CI Policy Active (Demo)", icon: ShieldCheck, actionType: "scan" },
      ],
    },
  },
  {
    title: "📊 Example: Draft Executive Security Summary",
    sub: "Generate a security briefing for stakeholders",
    promptText: "Generate an example executive security summary of a SaaS platform for enterprise stakeholders.",
    response: {
      content:
        "### 🏛️ Example Executive Security Briefing\n\n*(This is a sample response — figures and status shown here are illustrative only.)*\n\n**Platform Status:** Security scanning active\n\n#### Example Security Highlights:\n- **Automated Scanning:** Continuous scanning across connected repositories with alerts for critical and moderate vulnerabilities.\n- **Audit Trail:** Administrative actions and merges are logged for compliance review.\n- **Enterprise Identity:** Single Sign-On (SSO) and automated provisioning can be enforced across engineering roles.",
      actions: [
        { label: "📋 Copy Executive Briefing (Demo)", icon: Copy, actionType: "copy" },
      ],
    },
  },
  {
    title: "🔧 Example: Explain a SQL injection fix",
    sub: "Understand how a parameterized query patch prevents SQL injection",
    promptText: "Explain how a SQL injection vulnerability in route.ts would be detected and why a parameterized array binding patch is secure.",
    response: {
      content:
        "### 🧠 Example: SQL Injection Fix Explanation\n\n*(This is a sample response — no real repository was analyzed.)*\n\nWhen a scanner finds direct string concatenation in a database query, it flags a potential SQL injection risk. For example:\n\n#### Why this pattern is dangerous:\nAn attacker could send a payload like `{\"userId\": \"' OR '1'='1\"}`, bypassing authentication and exposing customer data.\n\n#### How to repair it:\n1. Replace concatenation with a parameterized placeholder (`$1`).\n2. Pass user input as an array binding `[userId]` into the database driver call.\n3. Add a runtime type guard (`typeof userId !== 'string'`) before database execution.",
      codeSnippet: {
        language: "typescript",
        filename: "app/api/checkout/route.ts (example diff)",
        code: `// Before (Vulnerable):\n// const query = "SELECT * FROM billing_profiles WHERE user_id = '" + userId + "'";\n\n// After (Parameterized):\nconst query = "SELECT * FROM billing_profiles WHERE user_id = $1";\nconst profile = await db.query(query, [userId]);`,
      },
      actions: [
        { label: "⚡ View Fix Engine (Demo)", icon: GitPullRequest, actionType: "pr" },
      ],
    },
  },
];

export function CopilotClient() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "integrations">("chat");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendPrompt = (promptText: string, presetResponse?: any) => {
    if (isTyping || !promptText.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      timestamp: "Just now",
      content: promptText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsTyping(true);

    setTimeout(() => {
      const aiResponseContent = presetResponse || {
        content: `### Demo Response\n\nThis is a demo preview — no real analysis was performed. In a live session, the copilot would analyze your connected repositories and provide specific findings based on your actual code.`,
        actions: [
          { label: "📋 Copy (Demo)", icon: Copy, actionType: "copy" },
        ],
      };

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        timestamp: "Just now",
        content: aiResponseContent.content,
        codeSnippet: aiResponseContent.codeSnippet,
        actions: aiResponseContent.actions,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1200);
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleActionClick = (actionType: string) => {
    if (actionType === "pr") {
      window.location.href = "/fixes";
    } else {
      alert("This is a demo preview; no action was taken.");
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto font-sans">
      {/* Demo Banner */}
      <div className="w-full rounded-2xl bg-amber-500/10 border border-amber-500/40 px-5 py-3 text-amber-200 text-sm font-medium flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
        <span>Demo preview: sample conversation, not connected to your repositories.</span>
      </div>

      {/* 1. Header Command Bar */}
      <div className="border-b border-white/15 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold mb-3 uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>AI Security Assistant</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <span>VibeAudit Copilot</span>
            <span className="text-xs px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
              Demo
            </span>
          </h1>
          <p className="text-slate-300 text-sm mt-1.5 font-medium max-w-3xl">
            Explore example security workflows and CI/CD integrations. Connect your repository to enable live analysis.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs font-mono transition-all ${
              activeTab === "chat"
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-glow"
                : "bg-white/[0.05] text-slate-400 hover:text-white border border-white/10"
            }`}
          >
            <Bot className="h-4 w-4" />
            <span>AI Assistant</span>
          </button>
          <button
            onClick={() => setActiveTab("integrations")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs font-mono transition-all ${
              activeTab === "integrations"
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-glow"
                : "bg-white/[0.05] text-slate-400 hover:text-white border border-white/10"
            }`}
          >
            <Laptop className="h-4 w-4" />
            <span>IDE &amp; CLI Ecosystem</span>
          </button>
        </div>
      </div>

      {/* 2. Main Content: Chat OR Integrations */}
      {activeTab === "chat" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left / Main Chat Column (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Chat Feed Box */}
            <div className="glass-card rounded-3xl p-6 md:p-8 border border-white/20 bg-[#0d0a14]/95 shadow-2xl space-y-6 min-h-[520px] max-h-[650px] overflow-y-auto flex flex-col justify-between">
              <div className="space-y-6">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-4 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                        msg.sender === "ai"
                          ? "bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-glow"
                          : "bg-slate-800 text-slate-300 border border-white/15"
                      }`}
                    >
                      {msg.sender === "ai" ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl p-5 space-y-3 ${
                        msg.sender === "ai"
                          ? "bg-white/[0.04] border border-white/15 text-slate-200 shadow-md"
                          : "bg-indigo-600 text-white shadow-lg"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 text-[10px] font-mono text-slate-400 pb-2 border-b border-white/10">
                        <span className="font-bold text-white uppercase">{msg.sender === "ai" ? "VibeAudit Copilot" : "You"}</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                        {msg.content}
                      </div>

                      {/* Code Snippet Box */}
                      {msg.codeSnippet && (
                        <div className="mt-3 rounded-2xl bg-black/80 border border-white/15 overflow-hidden font-mono text-xs">
                          <div className="px-4 py-2 bg-white/[0.05] border-b border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                            <span className="text-indigo-300 font-bold flex items-center gap-1.5">
                              <Code2 className="h-3.5 w-3.5" />
                              <span>{msg.codeSnippet.filename}</span>
                            </span>
                            <button
                              onClick={() => handleCopyCode(msg.codeSnippet!.code, msg.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white transition"
                            >
                              {copiedCode === msg.id ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-400" />
                                  <span className="text-emerald-400 font-bold">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="p-4 overflow-x-auto text-indigo-200/90 leading-relaxed">
                            <code>{msg.codeSnippet.code}</code>
                          </pre>
                        </div>
                      )}

                      {/* Interactive Action Buttons */}
                      {msg.actions && (
                        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
                          {msg.actions.map((act, idx) => {
                            const ActIcon = act.icon;
                            return (
                              <button
                                key={idx}
                                onClick={() => handleActionClick(act.actionType)}
                                className="px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-[11px] font-bold text-white transition flex items-center gap-1.5 shadow-sm font-mono"
                              >
                                <ActIcon className="h-3.5 w-3.5 text-indigo-400" />
                                <span>{act.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 text-xs font-mono text-indigo-300 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 w-fit">
                    <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                    <span>VibeAudit Copilot is composing a response...</span>
                  </motion.div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="pt-4 border-t border-white/10">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendPrompt(inputVal);
                  }}
                  className="flex items-center gap-3"
                >
                  <input
                    type="text"
                    placeholder="Ask Copilot to audit endpoints, write CI YAML, or explain CVEs..."
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    className="flex-1 rounded-2xl bg-black/80 border border-white/20 px-5 py-3.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition shadow-inner font-medium"
                  />
                  <button
                    type="submit"
                    disabled={isTyping || !inputVal.trim()}
                    className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-emerald-500 hover:opacity-95 text-white transition shadow-glow disabled:opacity-50 shrink-0"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Right Column: Preset Prompts (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-1 px-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold uppercase tracking-wider w-fit">
              ⚡ One-Click Example Prompts
            </div>
            <div className="space-y-3">
              {PRESET_PROMPTS.map((preset, idx) => (
                <motion.div
                  key={idx}
                  onClick={() => handleSendPrompt(preset.promptText, preset.response)}
                  whileHover={{ scale: 1.02 }}
                  className="p-5 rounded-2xl glass-card border border-white/15 hover:border-indigo-500/50 bg-white/[0.02] hover:bg-white/[0.05] transition cursor-pointer space-y-1.5 shadow-md group relative overflow-hidden"
                >
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center justify-between">
                    <span>{preset.title}</span>
                    <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-indigo-400 transition-transform group-hover:translate-x-1 shrink-0" />
                  </h4>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">{preset.sub}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* IDE & CLI Integrations Ecosystem Tab */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-indigo-400 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30">
              Developer Ecosystem &amp; Plugins
            </span>
            <h2 className="text-3xl font-black text-white">Embed VibeAudit Into Your Workflow</h2>
            <p className="text-sm text-slate-300 font-medium">
              Install our scanner directly into your favorite IDEs, local terminal CLI, or continuous integration pipelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "Cursor IDE & VS Code Extension",
                badge: "v2.4.0 — Recommended",
                desc: "Real-time inline security warnings and one-click refactoring suggestions as you type code in your editor.",
                cmd: "ext install vibeaudit.security-copilot",
                icon: Laptop,
                color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
              },
              {
                title: "GitHub Actions CI/CD Scanner",
                badge: "Official Action v2",
                desc: "Automatically scan pull requests in an isolated Docker container and block merges if critical OWASP vulnerabilities are detected.",
                cmd: "uses: vibeaudit/action-scanner@v2",
                icon: Github,
                color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
              },
              {
                title: "Local Terminal CLI (@vibeaudit/cli)",
                badge: "npm / pnpm / bun",
                desc: "Run fast offline audits from your terminal before pushing commits to your remote repository.",
                cmd: "npx -y @vibeaudit/cli scan --dir ./",
                icon: Terminal,
                color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
              },
              {
                title: "GitLab CI & Bitbucket Pipelines",
                badge: "Docker Container",
                desc: "Drop-in Docker container image compatible with self-hosted GitLab Runners and AWS CodeBuild environments.",
                cmd: "image: registry.vibeaudit.ai/scanner:latest",
                icon: Cpu,
                color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="glass-card rounded-3xl p-8 border border-white/15 bg-gradient-to-br from-white/[0.03] to-transparent space-y-5 shadow-xl hover:border-white/25 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl border ${item.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white">{item.title}</h3>
                        <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">{item.badge}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 font-medium leading-relaxed">{item.desc}</p>

                  <div className="p-3.5 rounded-2xl bg-black/80 border border-white/15 font-mono text-xs text-indigo-300 flex items-center justify-between gap-2 shadow-inner">
                    <span className="truncate">{item.cmd}</span>
                    <button
                      onClick={() => handleCopyCode(item.cmd, `item-${idx}`)}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition shrink-0 text-[11px]"
                    >
                      {copiedCode === `item-${idx}` ? "Copied!" : "Copy Command"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
