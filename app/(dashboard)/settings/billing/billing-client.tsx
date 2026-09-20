"use client";

import React, { useState } from "react";
import { CheckCircle2, CreditCard, ArrowRight, Check, Crown } from "lucide-react";

type PlanRow = {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  features: string[];
  display_order: number;
  active: boolean;
};

type PlanLimitRow = {
  plan: string;
  scans_per_period: number | null;
  repos: number | null;
  monitored_repos: number | null;
  fix_attempts_per_period: number | null;
  certificates_per_period: number | null;
  exports_per_period: number | null;
  api_requests_per_day: number | null;
  team_seats: number | null;
};

type BillingClientProps = {
  plans: PlanRow[];
  limits: PlanLimitRow[];
  currentPlan: string;
  hasStripeCustomer: boolean;
};

export default function BillingClient({ plans, currentPlan, hasStripeCustomer }: BillingClientProps) {
  const [annual, setAnnual] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    setUpgrading(planId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, interval: annual ? 'year' : 'month' }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.updated) {
        window.location.reload();
      } else {
        console.error('Checkout error:', data.error);
      }
    } finally {
      setUpgrading(null);
    }
  };

  const handleManageBilling = async () => {
    const res = await fetch('/api/stripe/portal', { method: 'POST' });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  const planDisplayName = (id: string) => {
    if (id === 'pro') return 'Pro AI Shield';
    if (id === 'agency') return 'Agency Enterprise';
    return 'Developer Free';
  };

  return (
    <div className="space-y-10 pb-20 max-w-6xl mx-auto">
      {/* 1. Header & Billing Cycle Toggle */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold font-mono uppercase tracking-wider mb-1 shadow-sm">
          <Crown className="h-4 w-4 text-amber-400" />
          <span>SaaS Monetization & Quotas</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
          Flexible Plans for <span className="text-gradient">Secure Teams</span>
        </h1>
        <p className="text-base text-slate-300 max-w-2xl mx-auto font-medium">
          Scale your autonomous AI security audits. Upgrade anytime to unlock instant code-fix PRs and continuous CI/CD push monitoring.
        </p>

        {/* Annual Toggle Switch */}
        <div className="flex items-center justify-center gap-4 pt-4">
          <span className={`text-sm font-bold ${!annual ? "text-white" : "text-slate-400"}`}>Monthly Billing</span>
          <button
            onClick={() => setAnnual(!annual)}
            className="w-14 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 p-1 transition-all relative shadow-inner"
          >
            <span
              className={`w-6 h-6 rounded-full bg-white block transition-transform shadow-md ${
                annual ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
          <span className={`text-sm font-bold flex items-center gap-2 ${annual ? "text-white" : "text-slate-400"}`}>
            <span>Annual Billing</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-extrabold text-emerald-300 font-mono">
              SAVE 20%
            </span>
          </span>
        </div>
      </div>

      {/* 2. Usage Quota Meter Card */}
      <div className="glass-card rounded-3xl p-6 border border-white/15 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="text-xs font-bold font-mono uppercase text-indigo-300">Active Workspace Quota</span>
          <h3 className="text-lg font-black text-white">Current Plan: {planDisplayName(currentPlan)}</h3>
          {hasStripeCustomer && (
            <button
              onClick={handleManageBilling}
              className="text-xs text-indigo-300 hover:text-indigo-200 underline underline-offset-2"
            >
              Manage billing
            </button>
          )}
        </div>

        <div className="flex items-center gap-8">
          <div className="space-y-1.5 w-48">
            <div className="flex justify-between text-xs font-bold font-mono text-slate-300">
              <span>AST Scans</span>
              <span className="text-emerald-400">Unlimited</span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden border border-white/10">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 w-full rounded-full"></div>
            </div>
          </div>

          <div className="space-y-1.5 w-48">
            <div className="flex justify-between text-xs font-bold font-mono text-slate-300">
              <span>AI Fix PRs</span>
              <span className="text-purple-400">Active (14 PRs)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden border border-white/10">
              <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 w-3/4 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((p) => {
          const popular = p.id === 'pro';
          const isCurrent = currentPlan === p.id;
          const isUpgrading = upgrading === p.id;
          const price = annual ? p.price_annual : p.price_monthly;
          const features = Array.isArray(p.features) ? p.features : [];

          return (
            <div
              key={p.id}
              className={`glass-card rounded-3xl p-8 border transition-all duration-300 flex flex-col justify-between relative overflow-hidden shadow-xl ${
                popular
                  ? "border-indigo-500/60 bg-gradient-to-b from-indigo-500/15 via-purple-500/10 to-transparent shadow-glow scale-105 z-10"
                  : "border-white/15 bg-white/[0.02] hover:border-white/30"
              }`}
            >
              {popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-extrabold uppercase font-mono px-4 py-1.5 rounded-bl-2xl tracking-wider shadow-md">
                  Most Popular
                </div>
              )}

              <div>
                <h3 className="text-xl font-black text-white">{p.name}</h3>
                <p className="text-xs text-slate-300 font-medium mt-1.5 min-h-[32px]">{p.description}</p>

                <div className="my-6 flex items-baseline gap-1">
                  <span className="text-4xl md:text-5xl font-black font-mono text-white">${price}</span>
                  <span className="text-xs font-bold text-slate-400">/ month {annual && "(billed annually)"}</span>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/10">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 block mb-2">
                    Included Capabilities:
                  </span>
                  {features.map((feat) => (
                    <div key={feat} className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-xs text-slate-200 font-medium">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8">
                <button
                  onClick={() => p.id !== 'free' && handleUpgrade(p.id)}
                  disabled={isCurrent || isUpgrading || p.id === 'free'}
                  className={`w-full py-4 rounded-2xl font-extrabold text-xs transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                    isCurrent
                      ? "bg-white/10 text-slate-400 cursor-default border border-white/10"
                      : isUpgrading
                      ? "bg-indigo-500/50 text-indigo-200 cursor-wait"
                      : p.id === 'free'
                      ? "bg-white/[0.08] text-slate-400 cursor-default border border-white/10"
                      : popular
                      ? "bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:opacity-95 text-white shadow-glow hover:scale-105"
                      : "bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/15"
                  }`}
                >
                  {isCurrent ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span>Current Active Plan</span>
                    </>
                  ) : isUpgrading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Processing Stripe...</span>
                    </>
                  ) : p.id === 'free' ? (
                    <>
                      <span>Downgrade to Free</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      <span>Upgrade to {p.name}</span>
                      <ArrowRight className="h-4 w-4 ml-0.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
