import { createClient } from "npm:@supabase/supabase-js@2";
import JSZip from "npm:jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await supabase.auth.getClaims(token);
    if (!claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const categoryId = String(body?.category_id ?? "");
    if (!categoryId) {
      return new Response(JSON.stringify({ error: "category_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load category + authorize caller
    const { data: cat } = await admin
      .from("document_categories")
      .select("id, name, client_id")
      .eq("id", categoryId)
      .maybeSingle();
    if (!cat) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isSuper } = await admin.rpc("is_superadmin", { _user_id: userId });
    let authorized = !!isSuper;
    if (!authorized) {
      const { data: profile } = await admin
        .from("profiles")
        .select("id, user_id")
        .eq("id", cat.client_id)
        .maybeSingle();
      if (profile?.user_id === userId) authorized = true;
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: docs, error: docsErr } = await admin
      .from("documents")
      .select("id, file_name, file_path")
      .eq("category_id", categoryId);
    if (docsErr) throw docsErr;
    if (!docs || docs.length === 0) {
      return new Response(JSON.stringify({ error: "No documents in category" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const zip = new JSZip();
    const seen = new Map<string, number>();
    for (const d of docs) {
      const { data: fileBlob, error: dlErr } = await admin.storage
        .from("documents")
        .download(d.file_path);
      if (dlErr || !fileBlob) continue;
      let name = d.file_name || d.file_path.split("/").pop() || "file";
      const count = seen.get(name) ?? 0;
      seen.set(name, count + 1);
      if (count > 0) {
        const dot = name.lastIndexOf(".");
        name =
          dot > 0
            ? `${name.slice(0, dot)} (${count})${name.slice(dot)}`
            : `${name} (${count})`;
      }
      zip.file(name, await fileBlob.arrayBuffer());
    }

    const zipBuf = await zip.generateAsync({ type: "uint8array" });
    const safeName = (cat.name || "documents").replace(/[^\w.-]+/g, "_");
    return new Response(zipBuf, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeName}.zip"`,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
