import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getMonthlyCost(cost: number, cycle: string): number {
  if (cycle === "quarterly") return cost / 3;
  if (cycle === "yearly") return cost / 12;
  return cost;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return jsonResponse({ error: "Unauthorized", code: "NO_TOKEN" }, 401);
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) return jsonResponse({ error: "Unauthorized", code: "INVALID_TOKEN" }, 401);
  const userId = claimsData.claims.sub;

  try {
    // Get active subscriptions
    const { data: subs, error: subsErr } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);
    if (subsErr) throw subsErr;

    const activeSubs = subs || [];
    const totalMonthly = activeSubs.reduce((sum, s) => sum + getMonthlyCost(Number(s.cost), s.billing_cycle), 0);

    // Upcoming renewals (next 30 days)
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcoming = activeSubs.filter(s => {
      if (!s.next_renewal_date) return false;
      const d = new Date(s.next_renewal_date);
      return d >= now && d <= in30;
    });

    // Spend by category
    const spendByCategory: Record<string, number> = {};
    activeSubs.forEach(s => {
      const mc = getMonthlyCost(Number(s.cost), s.billing_cycle);
      spendByCategory[s.category] = (spendByCategory[s.category] || 0) + mc;
    });

    // Potential savings from non-dismissed insights
    const { data: insights } = await supabase
      .from("ai_insights")
      .select("potential_saving")
      .eq("user_id", userId)
      .eq("is_dismissed", false);

    const potentialSavings = (insights || []).reduce((sum, i) => sum + Number(i.potential_saving || 0), 0);

    // Monthly spend trend (last 12 months from spending_history)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const { data: history } = await supabase
      .from("spending_history")
      .select("amount, charged_at")
      .eq("user_id", userId)
      .gte("charged_at", twelveMonthsAgo.toISOString().split("T")[0]);

    const monthlyTrend: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyTrend[key] = 0;
    }
    (history || []).forEach(h => {
      const key = h.charged_at.substring(0, 7);
      if (monthlyTrend[key] !== undefined) monthlyTrend[key] += Number(h.amount);
    });

    return jsonResponse({
      data: {
        total_monthly_spend: Math.round(totalMonthly * 100) / 100,
        total_annual_spend: Math.round(totalMonthly * 12 * 100) / 100,
        active_subscriptions_count: activeSubs.length,
        upcoming_renewals: upcoming.map(s => ({
          id: s.id, name: s.name, cost: s.cost, billing_cycle: s.billing_cycle,
          next_renewal_date: s.next_renewal_date, icon_emoji: s.icon_emoji, icon_color: s.icon_color,
        })),
        potential_savings: Math.round(potentialSavings * 100) / 100,
        spend_by_category: spendByCategory,
        monthly_spend_trend: Object.entries(monthlyTrend).map(([month, total]) => ({ month, total: Math.round(total * 100) / 100 })),
      },
    });
  } catch (e) {
    console.error("dashboard-stats error:", e);
    return jsonResponse({ error: e.message, code: "SERVER_ERROR" }, 500);
  }
});
