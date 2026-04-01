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
    const url = new URL(req.url);
    const month = url.searchParams.get("month"); // YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return jsonResponse({ error: "month param required (YYYY-MM)", code: "BAD_REQUEST" }, 400);
    }

    const startDate = `${month}-01`;
    const [year, mon] = month.split("-").map(Number);
    const endDate = new Date(year, mon, 0).toISOString().split("T")[0]; // last day of month

    const { data: subs, error } = await supabase
      .from("subscriptions")
      .select("id, name, icon_emoji, icon_color, cost, billing_cycle, next_renewal_date")
      .eq("user_id", userId)
      .eq("is_active", true)
      .gte("next_renewal_date", startDate)
      .lte("next_renewal_date", endDate);

    if (error) throw error;

    // Group by date
    const grouped: Record<string, any[]> = {};
    (subs || []).forEach(s => {
      const date = s.next_renewal_date;
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push({
        subscription_id: s.id,
        name: s.name,
        icon_emoji: s.icon_emoji,
        icon_color: s.icon_color,
        cost: s.cost,
        billing_cycle: s.billing_cycle,
        renewal_date: date,
      });
    });

    return jsonResponse({ data: grouped });
  } catch (e) {
    console.error("calendar-renewals error:", e);
    return jsonResponse({ error: e.message, code: "SERVER_ERROR" }, 500);
  }
});
