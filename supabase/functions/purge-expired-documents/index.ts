import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const nowIso = new Date().toISOString();
  let purged = 0;
  const errors: string[] = [];

  const { data: expired, error: queryErr } = await supabase
    .from("documents")
    .select("id, user_id, file_path, file_name, retention_until")
    .lt("retention_until", nowIso)
    .limit(500);

  if (queryErr) {
    return new Response(
      JSON.stringify({ ok: false, error: queryErr.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }

  for (const doc of expired ?? []) {
    const { error: storageErr } = await supabase.storage
      .from("documents")
      .remove([doc.file_path]);
    if (storageErr) {
      errors.push(`storage:${doc.id}:${storageErr.message}`);
    }

    const { error: delErr } = await supabase
      .from("documents")
      .delete()
      .eq("id", doc.id);
    if (delErr) {
      errors.push(`db:${doc.id}:${delErr.message}`);
      continue;
    }

    await supabase.from("document_audit_log").insert({
      action: "delete",
      actor_role: "system",
      actor_user_id: null,
      target_user_id: doc.user_id,
      document_id: doc.id,
      file_path: doc.file_path,
      file_name: doc.file_name,
      metadata: { reason: "retention_expired", retention_until: doc.retention_until } as never,
    });
    purged++;
  }

  return new Response(
    JSON.stringify({ ok: true, purged, scanned: expired?.length ?? 0, errors, ranAt: nowIso }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
