import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Find users with weekly_summary_enabled
    const { data: settings } = await supabase
      .from("user_settings")
      .select("user_id")
      .eq("weekly_summary_enabled", true);

    const summaries: any[] = [];

    for (const s of settings || []) {
      // Get active subs count
      const { count: subCount } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", s.user_id)
        .eq("is_active", true);

      // Current month spend from spending_history
      const firstOfMonth = new Date();
      firstOfMonth.setDate(1);
      const { data: monthSpend } = await supabase
        .from("spending_history")
        .select("amount")
        .eq("user_id", s.user_id)
        .gte("charged_at", firstOfMonth.toISOString().split("T")[0]);

      const totalSpend = (monthSpend || []).reduce((sum, h) => sum + Number(h.amount), 0);

      // Top 3 pending insights
      const { data: topInsights } = await supabase
        .from("ai_insights")
        .select("title, potential_saving")
        .eq("user_id", s.user_id)
        .eq("is_dismissed", false)
        .order("potential_saving", { ascending: false })
        .limit(3);

      summaries.push({
        user_id: s.user_id,
        active_subscriptions: subCount || 0,
        month_spend: totalSpend,
        top_insights: topInsights || [],
      });

      console.log(`Weekly summary for user ${s.user_id}: ₹${totalSpend} spend, ${subCount} subs, ${(topInsights || []).length} insights`);
    }

    return new Response(
      JSON.stringify({
        data: { summaries_generated: summaries.length, summaries },
        message: "Weekly cron completed",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("cron-weekly error:", e);
    return new Response(JSON.stringify({ error: e.message, code: "SERVER_ERROR" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
