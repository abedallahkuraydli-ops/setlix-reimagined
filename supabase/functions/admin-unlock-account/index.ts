// Superadmin unlocks a locked account and (optionally) sends a password
// reset email. Marks the lockout row as resolved and clears recent
// failed login attempts for that email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isSuper } = await admin.rpc("is_superadmin", {
      _user_id: userData.user.id,
    });
    if (!isSuper) return json({ error: "Forbidden" }, 403);

    const { lockoutId, sendResetEmail } = await req.json();
    if (!lockoutId) return json({ error: "lockoutId required" }, 400);

    const { data: lockout, error: lookupErr } = await admin
      .from("account_lockouts")
      .select("id, email, user_id, unlocked_at")
      .eq("id", lockoutId)
      .maybeSingle();
    if (lookupErr || !lockout) return json({ error: "Lockout not found" }, 404);

    // Mark as unlocked
    await admin
      .from("account_lockouts")
      .update({
        unlocked_at: new Date().toISOString(),
        unlocked_by: userData.user.id,
      })
      .eq("id", lockoutId);

    // Clear recent failed attempts so the client doesn't get re-locked instantly
    await admin
      .from("login_attempts")
      .delete()
      .ilike("email", lockout.email);

    // Optionally send a password reset email
    if (sendResetEmail) {
      try {
        // Use the admin client to generate a recovery link
        await admin.auth.resetPasswordForEmail(lockout.email);
      } catch (e) {
        console.error("Failed to send reset email", e);
      }
    }

    return json({ success: true });
  } catch (e) {
    console.error("admin-unlock-account error", e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
