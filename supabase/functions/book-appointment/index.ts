import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BookBody {
  slot_start: string;
  slot_end: string;
  notes?: string;
  reschedule_id?: string;
  admin_user_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = (await req.json()) as BookBody;
    if (!body.slot_start || !body.slot_end) {
      return new Response(
        JSON.stringify({ error: "slot_start and slot_end required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const slotStart = new Date(body.slot_start);
    const slotEnd = new Date(body.slot_end);
    if (
      isNaN(slotStart.getTime()) ||
      isNaN(slotEnd.getTime()) ||
      slotEnd <= slotStart
    ) {
      return new Response(JSON.stringify({ error: "Invalid slot times" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (slotStart.getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Slot is in the past" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile, error: pErr } = await adminClient
      .from("profiles")
      .select("id, first_name, last_name, full_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let conflictQuery = adminClient
      .from("appointments")
      .select("id")
      .in("status", ["pending", "confirmed"])
      .lt("slot_start", slotEnd.toISOString())
      .gt("slot_end", slotStart.toISOString());
    if (body.reschedule_id) {
      conflictQuery = conflictQuery.neq("id", body.reschedule_id);
    }
    const { data: conflicts, error: cErr } = await conflictQuery;

    if (cErr) throw cErr;
    if (conflicts && conflicts.length > 0) {
      return new Response(
        JSON.stringify({
          error: "slot_taken",
          message: "This slot was just taken — please pick another time.",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (body.reschedule_id) {
      const { error: cancelErr } = await adminClient
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", body.reschedule_id)
        .eq("client_id", profile.id);
      if (cancelErr) throw cancelErr;
    }

    let chosenAdminProfileId: string | null = null;
    if (body.admin_user_id) {
      const { data: bookable } = await adminClient.rpc("bookable_admins_for_client", {
        _client_profile_id: profile.id,
      });
      const match = (bookable ?? []).find((b: { admin_user_id: string }) => b.admin_user_id === body.admin_user_id);
      if (!match) {
        return new Response(
          JSON.stringify({ error: "Selected admin is not available for this client" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      chosenAdminProfileId = (match as { admin_profile_id: string }).admin_profile_id;
    }

    const { data: appt, error: insErr } = await adminClient
      .from("appointments")
      .insert({
        client_id: profile.id,
        admin_id: chosenAdminProfileId,
        slot_start: slotStart.toISOString(),
        slot_end: slotEnd.toISOString(),
        status: "confirmed",
        notes: body.notes ?? null,
      })
      .select()
      .single();

    if (insErr) throw insErr;

    console.log("Appointment booked", appt.id, "for profile", profile.id, body.reschedule_id ? `(rescheduled from ${body.reschedule_id})` : "");

    return new Response(JSON.stringify({ appointment: appt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("book-appointment error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
