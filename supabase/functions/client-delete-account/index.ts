// Allows a client to delete their own account. Sends an internal notification
// email to the superadmin (info@setlix.pt) before deleting the auth user.
// Refuses to delete admins or superadmins.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
    const userId = userData.user.id;
    const userEmail = userData.user.email ?? null;

    const admin = createClient(supabaseUrl, serviceKey);

    // Block admins/superadmins from using the self-delete flow.
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roleSet = new Set((roles ?? []).map((r) => r.role));
    if (roleSet.has("superadmin") || roleSet.has("admin")) {
      return json(
        {
          error:
            "Admin and superadmin accounts cannot be self-deleted. Please contact support.",
        },
        403,
      );
    }

    const { reason } = await req.json().catch(() => ({}));

    // Look up profile name for the notification email.
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, first_name, last_name")
      .eq("user_id", userId)
      .maybeSingle();
    const clientName =
      profile?.full_name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
      userEmail ||
      "A client";

    // Notify superadmin BEFORE deletion so we still have the data on hand.
    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "data-erasure-request",
          recipientEmail: "info@setlix.pt",
          idempotencyKey: `self-delete-${userId}-${Date.now()}`,
          templateData: {
            clientName,
            clientEmail: userEmail,
            clientUserId: userId,
            reason:
              (typeof reason === "string" && reason.trim()) ||
              "Client deleted their own account from the portal settings.",
            requestedAt: new Date().toISOString(),
            adminLink: `${new URL(req.url).origin.replace(/\.functions\..*/, "")}/admin/clients`,
          },
        },
      });
    } catch (e) {
      console.error("notify superadmin failed", e);
      // Do not block deletion if the email fails.
    }

    // Delete the auth user. ON DELETE CASCADE on profiles + related tables
    // removes personal data. Records retained for legal/fiscal obligations
    // (invoices, contracts, fiscal audit) remain governed by their
    // retention_until policy as documented in the privacy policy.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return json({ error: delErr.message }, 500);
    }

    return json({ success: true });
  } catch (e) {
    console.error("client-delete-account error", e);
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
