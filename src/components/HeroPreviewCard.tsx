import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip as RechartsTooltip, Cell } from "recharts";
import { ArrowUpRight, TrendingDown, Sparkles } from "lucide-react";

const chartData = [
  { month: "Jun", spend: 1850 },
  { month: "Jul", spend: 1850 },
  { month: "Aug", spend: 1650 },
  { month: "Sep", spend: 1450 },
  { month: "Oct", spend: 1250 },
  { month: "Nov", spend: 957, current: true },
];

const subscriptions = [
  {
    name: "YouTube Premium",
    plan: "Individual · Monthly",
    cost: 189,
    usagePct: 92,
    usageText: "Daily user (28 days)",
    status: "Active",
    statusVariant: "active" as const,
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#FF0000]">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    name: "Spotify",
    plan: "Individual · Monthly",
    cost: 119,
    usagePct: 20,
    usageText: "Rare (2 sessions this mo)",
    status: "Low usage",
    statusVariant: "low" as const,
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#1DB954]">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
    ),
  },
  {
    name: "Netflix",
    plan: "Standard · Monthly",
    cost: 649,
    usagePct: 0,
    usageText: "0 hours watched (30d idle)",
    status: "Unused",
    statusVariant: "unused" as const,
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#E50914]">
        <path d="M5.398 0v24c1.196-.19 2.378-.42 3.557-.69V9.585l4.82 13.568c1.391-.28 2.768-.58 4.126-.91V0h-3.699v14.415L9.097 0H5.398z" />
      </svg>
    ),
  },
];

export function HeroPreviewCard() {
  return (
    <TooltipProvider>
      <div className="relative w-full max-w-[430px] mx-auto select-none">
        {/* Floating Top Badge: Wasted money callout */}
        <div className="absolute -top-4 -left-3 sm:-left-6 z-20 flex items-center gap-2 bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-orange-200/60 dark:border-orange-900/40 shadow-md text-xs font-semibold text-neutral-800 dark:text-neutral-200">
          <span className="w-2 h-2 rounded-full bg-[#E8541A] animate-pulse" />
          <span className="font-serif font-bold text-[#E8541A]">₹768</span>
          <span className="text-neutral-500 dark:text-neutral-400">wasted this month</span>
        </div>

        {/* Floating Bottom Badge: Savings pill with subtle shimmer */}
        <div className="sz-shimmer-pill absolute -bottom-4 -right-3 sm:-right-5 z-20 flex items-center gap-2 bg-[#0A0A0A] dark:bg-white text-white dark:text-[#0A0A0A] px-4 py-2 rounded-full border border-neutral-800 dark:border-neutral-200 shadow-xl text-xs font-bold tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-[#E8541A]" />
          <span>Save ₹768/mo</span>
        </div>

        {/* Main Card */}
        <Card className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-[#FFFFFF] dark:bg-[#16161A] shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden transition-all duration-300">
          {/* Header */}
          <CardHeader className="p-5 pb-3 border-b border-neutral-100 dark:border-neutral-800/80 flex flex-row items-center justify-between space-y-0">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Monthly Overview
              </span>
              <CardTitle className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
                Current Billing Cycle
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 rounded-full px-2.5 py-0.5">
              Nov 2026
            </Badge>
          </CardHeader>

          <CardContent className="p-5 pt-4 space-y-4">
            {/* Total Spend Figure */}
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-3xl font-serif font-black tracking-tight text-neutral-900 dark:text-neutral-50 flex items-baseline gap-0.5">
                  <span>₹</span>
                  <NumberTicker value={957} className="font-serif font-black" />
                </div>
                <CardDescription className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                  Total active monthly spend
                </CardDescription>
              </div>

              {/* Recovery Ratio Pill */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/40 cursor-default">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>80% reclaimable</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs max-w-[210px]">
                  ₹768 of ₹957 is spent on unused or rare services (Netflix + Spotify).
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Recharts Monthly Trend Chart */}
            <div className="h-[76px] w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "var(--sz-gray-500, #8A8A82)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(0,0,0,0.03)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A] px-2.5 py-1 rounded-md text-[11px] font-semibold shadow-md">
                          {d.month}: ₹{d.spend} {d.current ? "(Now)" : ""}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="spend" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.current ? "#E8541A" : "var(--sz-gray-200, #E2E1DC)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Subscription Line Items */}
            <div className="space-y-2.5 pt-1">
              {subscriptions.map((sub) => {
                const isUnused = sub.statusVariant === "unused";
                const isLow = sub.statusVariant === "low";

                return (
                  <div
                    key={sub.name}
                    className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/60 space-y-2 transition-colors hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40"
                  >
                    <div className="flex items-center justify-between">
                      {/* Logo + Name */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-white dark:bg-neutral-800 shadow-sm border border-neutral-200/50 dark:border-neutral-700/50 flex items-center justify-center flex-shrink-0">
                          {sub.logo}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                            {sub.name}
                          </div>
                          <div className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-tight mt-0.5">
                            {sub.usageText}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge + Cost */}
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            isUnused
                              ? "bg-orange-500/10 text-[#E8541A] border-orange-500/20 text-[10px] px-2 py-0 font-bold"
                              : isLow
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] px-2 py-0 font-bold"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] px-2 py-0 font-bold"
                          }
                        >
                          {sub.status}
                        </Badge>
                        <div className={`text-xs font-serif font-bold ${isUnused ? "text-[#E8541A]" : "text-neutral-900 dark:text-neutral-100"}`}>
                          ₹{sub.cost}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar for Usage */}
                    <div className="space-y-1">
                      <div className="h-1.5 w-full bg-neutral-200/60 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${sub.usagePct}%`,
                            backgroundColor: isUnused ? "#E8541A" : isLow ? "#F59E0B" : "#10B981",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
