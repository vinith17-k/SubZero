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

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const action = pathParts[pathParts.length - 1]; // profile, notifications, privacy, account, or settings

  try {
    // GET /settings — merged profile + settings
    if (req.method === "GET") {
      const { data: profile, error: pErr } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (pErr) throw pErr;

      const { data: settings, error: sErr } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (sErr) throw sErr;

      return jsonResponse({
        data: {
          ...profile,
          ...settings,
          id: profile.id,
          settings_id: settings.id,
        },
      });
    }

    // PATCH /settings/profile
    if (req.method === "PATCH" && action === "profile") {
      const body = await req.json();
      const allowed = ["full_name", "email", "currency"];
      const updates: Record<string, any> = {};
      for (const k of allowed) {
        if (body[k] !== undefined) updates[k] = body[k];
      }

      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse({ data, message: "Profile updated" });
    }

    // PATCH /settings/notifications
    if (req.method === "PATCH" && action === "notifications") {
      const body = await req.json();
      const allowed = ["renewal_alerts_enabled", "weekly_summary_enabled", "ai_insights_enabled", "price_change_alerts_enabled", "advance_notice_days"];
      const updates: Record<string, any> = {};
      for (const k of allowed) {
        if (body[k] !== undefined) updates[k] = body[k];
      }

      const { data, error } = await supabase
        .from("user_settings")
        .update(updates)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse({ data, message: "Notification settings updated" });
    }

    // PATCH /settings/privacy
    if (req.method === "PATCH" && action === "privacy") {
      const body = await req.json();
      const allowed = ["two_factor_enabled", "analytics_sharing_enabled"];
      const updates: Record<string, any> = {};
      for (const k of allowed) {
        if (body[k] !== undefined) updates[k] = body[k];
      }

      const { data, error } = await supabase
        .from("user_settings")
        .update(updates)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse({ data, message: "Privacy settings updated" });
    }

    // DELETE /settings/account
    if (req.method === "DELETE" && action === "account") {
      // Use service role to delete the auth user (cascades to all tables)
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) throw error;

      return jsonResponse({ data: null, message: "Account deleted" });
    }

    return jsonResponse({ error: "Not found", code: "NOT_FOUND" }, 404);
  } catch (e) {
    console.error("settings error:", e);
    return jsonResponse({ error: e.message, code: "SERVER_ERROR" }, 500);
  }
});
