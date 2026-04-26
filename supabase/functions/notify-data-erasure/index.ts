// Sends an internal email to info@setlix.pt when a client requests data erasure.
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

    const { reason } = await req.json().catch(() => ({}));
    const admin = createClient(supabaseUrl, serviceKey);

    // Look up profile name
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, first_name, last_name")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    const clientName =
      profile?.full_name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
      userData.user.email ||
      "A client";

    await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "data-erasure-request",
        recipientEmail: "info@setlix.pt",
        idempotencyKey: `erasure-${userData.user.id}-${Date.now()}`,
        templateData: {
          clientName,
          clientEmail: userData.user.email,
          clientUserId: userData.user.id,
          reason: reason || null,
          requestedAt: new Date().toISOString(),
          adminLink: `${new URL(req.url).origin.replace(/\.functions\..*/, "")}/admin/clients`,
        },
      },
    });

    return json({ success: true });
  } catch (e) {
    console.error("notify-data-erasure error", e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
