import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

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
      .select("id, file_name, file_path, mime_type")
      .eq("category_id", categoryId);
    if (docsErr) throw docsErr;
    if (!docs || docs.length === 0) {
      return new Response(JSON.stringify({ error: "No documents in category" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const merged = await PDFDocument.create();
    const font = await merged.embedFont(StandardFonts.Helvetica);
    const fontBold = await merged.embedFont(StandardFonts.HelveticaBold);

    // Cover page
    {
      const page = merged.addPage([595, 842]);
      page.drawText(cat.name || "Documents", {
        x: 50, y: 780, size: 22, font: fontBold, color: rgb(0, 0, 0),
      });
      page.drawText(`${docs.length} document${docs.length === 1 ? "" : "s"}`, {
        x: 50, y: 755, size: 12, font, color: rgb(0.3, 0.3, 0.3),
      });
      let y = 720;
      docs.forEach((d, i) => {
        if (y < 60) return;
        const name = (d.file_name || d.file_path.split("/").pop() || "file").slice(0, 80);
        page.drawText(`${i + 1}. ${name}`, { x: 50, y, size: 11, font, color: rgb(0, 0, 0) });
        y -= 18;
      });
    }

    const unsupported: string[] = [];

    for (const d of docs) {
      const { data: fileBlob, error: dlErr } = await admin.storage
        .from("documents")
        .download(d.file_path);
      if (dlErr || !fileBlob) continue;
      const bytes = new Uint8Array(await fileBlob.arrayBuffer());
      const mime = (d.mime_type || "").toLowerCase();
      const name = d.file_name || d.file_path.split("/").pop() || "file";

      try {
        if (mime === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
          const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
          const pages = await merged.copyPages(src, src.getPageIndices());
          pages.forEach((p) => merged.addPage(p));
        } else if (mime.startsWith("image/jpeg") || /\.(jpe?g)$/i.test(name)) {
          const img = await merged.embedJpg(bytes);
          const page = merged.addPage([595, 842]);
          const s = Math.min(495 / img.width, 742 / img.height, 1);
          page.drawImage(img, {
            x: (595 - img.width * s) / 2,
            y: (842 - img.height * s) / 2,
            width: img.width * s,
            height: img.height * s,
          });
        } else if (mime.startsWith("image/png") || /\.png$/i.test(name)) {
          const img = await merged.embedPng(bytes);
          const page = merged.addPage([595, 842]);
          const s = Math.min(495 / img.width, 742 / img.height, 1);
          page.drawImage(img, {
            x: (595 - img.width * s) / 2,
            y: (842 - img.height * s) / 2,
            width: img.width * s,
            height: img.height * s,
          });
        } else {
          unsupported.push(name);
        }
      } catch (_e) {
        unsupported.push(name);
      }
    }

    if (unsupported.length > 0) {
      const page = merged.addPage([595, 842]);
      page.drawText("Files not embedded", {
        x: 50, y: 780, size: 18, font: fontBold, color: rgb(0, 0, 0),
      });
      page.drawText("These files could not be included in the PDF (unsupported format):", {
        x: 50, y: 755, size: 11, font, color: rgb(0.3, 0.3, 0.3),
      });
      let y = 725;
      unsupported.forEach((n, i) => {
        if (y < 60) return;
        page.drawText(`${i + 1}. ${n.slice(0, 80)}`, { x: 50, y, size: 11, font, color: rgb(0, 0, 0) });
        y -= 18;
      });
    }

    const pdfBytes = await merged.save();
    const safeName = (cat.name || "documents").replace(/[^\w.-]+/g, "_");
    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
