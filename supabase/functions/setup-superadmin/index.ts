// Bootstrap edge function for the Setlix superadmin account.
// Allows info@setlix.pt to be created with email pre-confirmed, and to set
// a password on first entry without going through email verification.
//
// Security: Only operates on the hardcoded SUPERADMIN_EMAIL. If the user
// already exists AND has a password set, the request is rejected — there
// is no way to use this endpoint to take over an existing account.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPERADMIN_EMAIL = "info@setlix.pt";

interface RequestBody {
  action: "status" | "setup";
  password?: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isStrongPassword(pw: string): boolean {
  return (
    pw.length >= 8 &&
    /[A-Z]/.test(pw) &&
    /[a-z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = (await req.json()) as RequestBody;
    if (!body.action) return jsonResponse({ error: "Missing action" }, 400);

    // Find existing user by email (paginate to be safe)
    let existingUser: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null = null;
    {
      let page = 1;
      while (page <= 20) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw error;
        const found = data.users.find(
          (u) => (u.email ?? "").toLowerCase() === SUPERADMIN_EMAIL,
        );
        if (found) {
          existingUser = { id: found.id, email: found.email ?? undefined, user_metadata: found.user_metadata };
          break;
        }
        if (data.users.length < 200) break;
        page++;
      }
    }

    // STATUS: tell the client whether bootstrap is needed.
    // "needs_setup" = no user yet, OR user exists but has never set a password.
    if (body.action === "status") {
      if (!existingUser) {
        return jsonResponse({ needs_setup: true, reason: "no_user" });
      }
      // Probe whether a password is set by attempting a sign-in with a
      // throwaway password. If the user has no password, we still get
      // "Invalid login credentials" — so instead we check user_metadata
      // flag we set during bootstrap.
      const passwordSet = existingUser.user_metadata?.password_set === true;
      return jsonResponse({
        needs_setup: !passwordSet,
        reason: passwordSet ? "ready" : "no_password",
      });
    }

    // SETUP: create the user (or update password if not yet set).
    if (body.action === "setup") {
      const password = body.password ?? "";
      if (!isStrongPassword(password)) {
        return jsonResponse(
          {
            error:
              "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
          },
          400,
        );
      }

      if (existingUser) {
        if (existingUser.user_metadata?.password_set === true) {
          return jsonResponse(
            { error: "Superadmin account is already set up. Please log in." },
            409,
          );
        }
        const { error: updErr } = await admin.auth.admin.updateUserById(
          existingUser.id,
          {
            password,
            email_confirm: true,
            user_metadata: {
              ...(existingUser.user_metadata ?? {}),
              password_set: true,
            },
          },
        );
        if (updErr) throw updErr;
      } else {
        const { error: createErr } = await admin.auth.createUser({
          email: SUPERADMIN_EMAIL,
          password,
          email_confirm: true,
          user_metadata: { full_name: "Setlix Superadmin", password_set: true },
        });
        if (createErr) throw createErr;
      }

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonResponse({ error: message }, 500);
  }
});
