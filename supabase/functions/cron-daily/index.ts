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
    const today = new Date().toISOString().split("T")[0];

    // 1. Spending history automation: find subscriptions with past renewal dates
    const { data: dueSubs, error: dueErr } = await supabase
      .from("subscriptions")
      .select("id, user_id, cost, billing_cycle, next_renewal_date")
      .eq("is_active", true)
      .lte("next_renewal_date", today);

    if (dueErr) throw dueErr;

    for (const sub of dueSubs || []) {
      // Insert spending record
      await supabase.from("spending_history").insert({
        user_id: sub.user_id,
        subscription_id: sub.id,
        amount: sub.cost,
        charged_at: sub.next_renewal_date,
      });

      // Advance renewal date
      const rd = new Date(sub.next_renewal_date);
      if (sub.billing_cycle === "monthly") rd.setMonth(rd.getMonth() + 1);
      else if (sub.billing_cycle === "quarterly") rd.setMonth(rd.getMonth() + 3);
      else if (sub.billing_cycle === "yearly") rd.setFullYear(rd.getFullYear() + 1);

      await supabase
        .from("subscriptions")
        .update({ next_renewal_date: rd.toISOString().split("T")[0] })
        .eq("id", sub.id);
    }

    // 2. Renewal alerts: find users with upcoming renewals
    const { data: allSettings } = await supabase
      .from("user_settings")
      .select("user_id, advance_notice_days")
      .eq("renewal_alerts_enabled", true);

    const alertsSent: string[] = [];
    for (const setting of allSettings || []) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + setting.advance_notice_days);

      const { data: upcoming } = await supabase
        .from("subscriptions")
        .select("name, cost, billing_cycle, next_renewal_date")
        .eq("user_id", setting.user_id)
        .eq("is_active", true)
        .gte("next_renewal_date", today)
        .lte("next_renewal_date", cutoff.toISOString().split("T")[0]);

      if (upcoming && upcoming.length > 0) {
        // Log the alert (email integration can be added later)
        alertsSent.push(setting.user_id);
        console.log(`Renewal alert for user ${setting.user_id}: ${upcoming.length} upcoming renewals`);
      }
    }

    return new Response(
      JSON.stringify({
        data: {
          spending_records_created: (dueSubs || []).length,
          renewal_alerts_sent: alertsSent.length,
        },
        message: "Daily cron completed",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("cron-daily error:", e);
    return new Response(JSON.stringify({ error: e.message, code: "SERVER_ERROR" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
