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

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // Path: /subscriptions or /subscriptions/:id
  const subId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null;

  try {
    if (req.method === "GET" && !subId) {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const enriched = (data || []).map((s: any) => ({
        ...s,
        monthly_cost: getMonthlyCost(Number(s.cost), s.billing_cycle),
        days_until_renewal: s.next_renewal_date ? daysUntil(s.next_renewal_date) : null,
      }));

      return jsonResponse({ data: enriched });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { data, error } = await supabase
        .from("subscriptions")
        .insert({ ...body, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      return jsonResponse({ data, message: "Subscription created" }, 201);
    }

    if (req.method === "PATCH" && subId) {
      const body = await req.json();
      const { data, error } = await supabase
        .from("subscriptions")
        .update(body)
        .eq("id", subId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse({ data, message: "Subscription updated" });
    }

    if (req.method === "DELETE" && subId) {
      const { error } = await supabase
        .from("subscriptions")
        .update({ is_active: false })
        .eq("id", subId)
        .eq("user_id", userId);

      if (error) throw error;
      return jsonResponse({ data: null, message: "Subscription deactivated" });
    }

    return jsonResponse({ error: "Not found", code: "NOT_FOUND" }, 404);
  } catch (e) {
    console.error("subscriptions error:", e);
    return jsonResponse({ error: e.message, code: "SERVER_ERROR" }, 500);
  }
});
