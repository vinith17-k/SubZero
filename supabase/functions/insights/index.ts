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

async function enrichDescription(title: string, details: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return details;

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a financial advisor for subscription management. Write a concise 1-2 sentence human-readable explanation for the given subscription insight. Be specific and actionable. Do not use markdown.",
          },
          {
            role: "user",
            content: `Insight: "${title}". Details: ${details}`,
          },
        ],
      }),
    });

    if (!resp.ok) return details;
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || details;
  } catch {
    return details;
  }
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

  try {
    // GET /insights — list non-dismissed
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("ai_insights")
        .select("*")
        .eq("user_id", userId)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return jsonResponse({ data });
    }

    // POST /insights/generate
    if (req.method === "POST" && pathParts.includes("generate")) {
      const { data: subs, error: subsErr } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);
      if (subsErr) throw subsErr;

      const { data: settings } = await supabase
        .from("user_settings")
        .select("advance_notice_days")
        .eq("user_id", userId)
        .single();

      const advanceDays = settings?.advance_notice_days || 7;
      const insights: any[] = [];
      const activeSubs = subs || [];

      // Rule 1: Cancel — unused/rare
      for (const s of activeSubs) {
        if ((s.usage_frequency === "never" || s.usage_frequency === "rare") && Number(s.cost) > 0) {
          const mc = getMonthlyCost(Number(s.cost), s.billing_cycle);
          const title = `Cancel ${s.name} — low usage`;
          const desc = await enrichDescription(title, `${s.name} costs ₹${mc.toFixed(0)}/mo but usage is ${s.usage_frequency}.`);
          insights.push({
            user_id: userId, type: "cancel", title, description: desc,
            potential_saving: mc, related_subscription_ids: [s.id],
          });
        }
      }

      // Rule 2: Duplicate/overlap by category
      const byCategory: Record<string, any[]> = {};
      activeSubs.forEach(s => {
        if (!byCategory[s.category]) byCategory[s.category] = [];
        byCategory[s.category].push(s);
      });
      const freqOrder = ["never", "rare", "monthly", "weekly", "daily"];
      for (const [cat, group] of Object.entries(byCategory)) {
        if (group.length > 1) {
          group.sort((a, b) => freqOrder.indexOf(a.usage_frequency) - freqOrder.indexOf(b.usage_frequency));
          const lower = group[0];
          const mc = getMonthlyCost(Number(lower.cost), lower.billing_cycle);
          const title = `Overlap in ${cat}: consider cancelling ${lower.name}`;
          const desc = await enrichDescription(title, `You have ${group.length} ${cat} subscriptions. ${lower.name} (${lower.usage_frequency} usage) overlaps with ${group[1].name}.`);
          insights.push({
            user_id: userId, type: "swap", title, description: desc,
            potential_saving: mc, related_subscription_ids: group.map((g: any) => g.id),
          });
        }
      }

      // Rule 3: Downgrade
      for (const s of activeSubs) {
        const mc = getMonthlyCost(Number(s.cost), s.billing_cycle);
        if (mc > 500 && s.usage_frequency !== "daily") {
          const saving = mc * 0.4;
          const title = `Downgrade ${s.name} — not used daily`;
          const desc = await enrichDescription(title, `${s.name} costs ₹${mc.toFixed(0)}/mo with ${s.usage_frequency} usage. A cheaper plan could save ~₹${saving.toFixed(0)}/mo.`);
          insights.push({
            user_id: userId, type: "downgrade", title, description: desc,
            potential_saving: saving, related_subscription_ids: [s.id],
          });
        }
      }

      // Rule 4: Upcoming renewal warning
      const now = new Date();
      const cutoff = new Date(now.getTime() + advanceDays * 24 * 60 * 60 * 1000);
      for (const s of activeSubs) {
        if (s.next_renewal_date) {
          const rd = new Date(s.next_renewal_date);
          if (rd >= now && rd <= cutoff) {
            const daysLeft = Math.ceil((rd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const title = `${s.name} renews in ${daysLeft} days`;
            const desc = await enrichDescription(title, `${s.name} (₹${s.cost}/${s.billing_cycle}) renews on ${s.next_renewal_date}.`);
            insights.push({
              user_id: userId, type: "warning", title, description: desc,
              potential_saving: 0, related_subscription_ids: [s.id],
            });
          }
        }
      }

      // Insert all insights
      if (insights.length > 0) {
        const { error: insertErr } = await supabase.from("ai_insights").insert(insights);
        if (insertErr) throw insertErr;
      }

      return jsonResponse({ data: insights, message: `Generated ${insights.length} insights` });
    }

    // PATCH /insights/:id/dismiss
    if (req.method === "PATCH" && pathParts.includes("dismiss")) {
      const insightId = pathParts[pathParts.length - 2]; // /insights/:id/dismiss
      const { error } = await supabase
        .from("ai_insights")
        .update({ is_dismissed: true })
        .eq("id", insightId)
        .eq("user_id", userId);

      if (error) throw error;
      return jsonResponse({ data: null, message: "Insight dismissed" });
    }

    return jsonResponse({ error: "Not found", code: "NOT_FOUND" }, 404);
  } catch (e) {
    console.error("insights error:", e);
    return jsonResponse({ error: e.message, code: "SERVER_ERROR" }, 500);
  }
});
