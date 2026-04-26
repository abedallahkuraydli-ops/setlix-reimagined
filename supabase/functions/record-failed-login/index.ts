// Records failed login attempts and locks the account after 4 failures.
// Public (verify_jwt = false) so unauthenticated callers can record their
// own failed login. Always uses the service role internally for inserts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_FAILED = 4;
const WINDOW_MIN = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const rawEmail = String(body?.email || "").trim();
    if (!rawEmail) {
      return json({ error: "email required" }, 400);
    }
    const email = rawEmail.toLowerCase();
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    // Insert failed attempt
    await admin.from("login_attempts").insert({
      email,
      ip_address: ip,
      user_agent: userAgent,
    });

    // Count failed attempts in window
    const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
    const { count } = await admin
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .ilike("email", email)
      .gte("attempted_at", since);

    const failedCount = count ?? 0;

    if (failedCount < MAX_FAILED) {
      return json({
        locked: false,
        failed_attempts: failedCount,
        remaining: Math.max(0, MAX_FAILED - failedCount),
      });
    }

    // Already locked?
    const { data: existing } = await admin
      .from("account_lockouts")
      .select("id")
      .ilike("email", email)
      .is("unlocked_at", null)
      .maybeSingle();

    if (!existing) {
      // Look up the user_id for this email (best-effort)
      let userId: string | null = null;
      try {
        const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const found = data?.users?.find(
          (u: { email?: string | null }) => (u.email || "").toLowerCase() === email,
        );
        userId = found?.id ?? null;
      } catch (_) {
        userId = null;
      }

      await admin.from("account_lockouts").insert({
        email,
        user_id: userId,
        reason: "too_many_failed_logins",
        failed_attempt_count: failedCount,
        password_reset_required: true,
      });

      // Notify info@setlix.pt
      try {
        await admin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "account-locked",
            recipientEmail: "info@setlix.pt",
            idempotencyKey: `lockout-${email}-${Date.now()}`,
            templateData: {
              email,
              failedAttempts: failedCount,
              ipAddress: ip,
              userAgent,
              lockedAt: new Date().toISOString(),
              adminUnlockUrl: `${new URL(req.url).origin.replace(/\.functions\..*/, "")}/admin/clients`,
            },
          },
        });
      } catch (e) {
        console.error("Failed to send lockout email", e);
      }
    }

    return json({ locked: true, failed_attempts: failedCount });
  } catch (e) {
    console.error("record-failed-login error", e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
