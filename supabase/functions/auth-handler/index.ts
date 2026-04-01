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
    { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } }
  );

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const action = pathParts[pathParts.length - 1];

  try {
    // POST /auth/signup
    if (req.method === "POST" && action === "signup") {
      const { email, password, full_name } = await req.json();
      if (!email || !password) {
        return jsonResponse({ error: "Email and password required", code: "BAD_REQUEST" }, 400);
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: full_name || "" } },
      });

      if (error) throw error;
      return jsonResponse({
        data: {
          user: data.user,
          session: data.session,
        },
        message: "Signup successful",
      }, 201);
    }

    // POST /auth/login
    if (req.method === "POST" && action === "login") {
      const { email, password } = await req.json();
      if (!email || !password) {
        return jsonResponse({ error: "Email and password required", code: "BAD_REQUEST" }, 400);
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      return jsonResponse({
        data: {
          user: data.user,
          session: data.session,
        },
        message: "Login successful",
      });
    }

    // POST /auth/logout
    if (req.method === "POST" && action === "logout") {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return jsonResponse({ data: null, message: "Logged out" });
    }

    // GET /auth/me
    if (req.method === "GET" && action === "me") {
      const token = req.headers.get("Authorization")?.replace("Bearer ", "");
      if (!token) return jsonResponse({ error: "Unauthorized", code: "NO_TOKEN" }, 401);

      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) return jsonResponse({ error: "Unauthorized", code: "INVALID_TOKEN" }, 401);

      const { data: profile, error: profileErr } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", claimsData.claims.sub)
        .single();

      if (profileErr) throw profileErr;
      return jsonResponse({ data: profile });
    }

    return jsonResponse({ error: "Not found", code: "NOT_FOUND" }, 404);
  } catch (e) {
    console.error("auth-handler error:", e);
    return jsonResponse({ error: e.message, code: "SERVER_ERROR" }, 500);
  }
});
