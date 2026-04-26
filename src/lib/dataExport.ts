import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";

interface ExportContext {
  userId: string;
  userEmail: string | null;
}

/**
 * Generate a single ZIP containing the client's full GDPR data export:
 * - profile.json (everything from existing JSON export)
 * - surveys/ (per-assignment JSON of questions + answers)
 * - documents/uploaded/<file_name> (client uploads)
 * - documents/setlix-issued/<file_name> (admin-issued documents)
 * - invoices/<number>.pdf (Moloni PDF when available, otherwise invoice.json)
 */
export async function buildClientDataExportZip(ctx: ExportContext): Promise<Blob> {
  const { userId, userEmail } = ctx;
  const zip = new JSZip();

  // 1. Resolve profile id (used for client_services, surveys, etc.)
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  const profileId = profile?.id ?? null;

  // 2. Parallel fetch of structured data
  const [
    servicesRes,
    docsRes,
    docReqRes,
    conversationsRes,
    appointmentsRes,
    auditRes,
    invoicesRes,
    paymentsRes,
    surveyAssignmentsRes,
  ] = await Promise.all([
    supabase.from("client_services").select("*, service_catalogue(*)").eq("client_id", profileId ?? ""),
    supabase.from("documents").select("*").eq("user_id", userId),
    supabase.from("document_requests").select("*").eq("client_id", profileId ?? ""),
    supabase.from("conversations").select("*").eq("client_id", profileId ?? ""),
    supabase.from("appointments").select("*").eq("client_id", profileId ?? ""),
    supabase.from("document_audit_log").select("*").or(`actor_user_id.eq.${userId},target_user_id.eq.${userId}`),
    supabase.from("invoices").select("*").eq("client_id", profileId ?? ""),
    supabase.from("client_payments").select("*").eq("client_id", profileId ?? ""),
    profileId
      ? supabase
          // @ts-ignore — survey_assignments may not be typed
          .from("survey_assignments")
          .select("*")
          .eq("client_profile_id", profileId)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
  ]);

  const profileJson = {
    exported_at: new Date().toISOString(),
    user: { id: userId, email: userEmail },
    profile,
    services: servicesRes.data,
    documents: docsRes.data,
    document_requests: docReqRes.data,
    conversations: conversationsRes.data,
    appointments: appointmentsRes.data,
    invoices: invoicesRes.data,
    payments: paymentsRes.data,
    document_audit_log: auditRes.data,
    gdpr_notice:
      "This export contains personal data Setlix holds about you, in compliance with GDPR Article 20 (right to data portability). Some technical fields are included to allow data portability to another provider.",
  };
  zip.file("profile.json", JSON.stringify(profileJson, null, 2));

  // 3. Surveys
  const assignments = (surveyAssignmentsRes?.data || []) as Array<{ id: string; survey_id?: string; created_at?: string }>;
  if (assignments.length > 0) {
    const surveysFolder = zip.folder("surveys");
    for (const a of assignments) {
      const [{ data: answers }, { data: questions }] = await Promise.all([
        // @ts-ignore
        supabase.from("survey_answers").select("*, question_id").eq("assignment_id", a.id),
        // @ts-ignore
        supabase.from("survey_questions").select("*").eq("survey_id", a.survey_id ?? ""),
      ]);
      surveysFolder?.file(
        `${a.id}.json`,
        JSON.stringify({ assignment: a, questions: questions ?? [], answers: answers ?? [] }, null, 2),
      );
    }
  }

  // 4. Documents — uploaded + setlix-issued — download from storage
  const uploadedFolder = zip.folder("documents/uploaded");
  const issuedFolder = zip.folder("documents/setlix-issued");
  for (const doc of (docsRes.data ?? []) as Array<{
    file_path: string;
    file_name: string;
    category: string;
  }>) {
    try {
      const { data, error } = await supabase.storage.from("documents").download(doc.file_path);
      if (error || !data) continue;
      const target =
        doc.category === "client_upload" ? uploadedFolder : issuedFolder;
      target?.file(doc.file_name || doc.file_path.split("/").pop() || "file", data);
    } catch (e) {
      console.error("Failed to add document to export", doc.file_path, e);
    }
  }

  // 5. Invoices — fetch the Moloni PDF when available
  const invoicesFolder = zip.folder("invoices");
  for (const inv of (invoicesRes.data ?? []) as Array<{
    id: string;
    moloni_document_number: string | null;
    moloni_pdf_url: string | null;
    description: string;
    amount_cents: number;
    currency: string;
    status: string;
    created_at: string;
  }>) {
    const baseName = inv.moloni_document_number || inv.id;
    if (inv.moloni_pdf_url) {
      try {
        const res = await fetch(inv.moloni_pdf_url);
        if (res.ok) {
          const blob = await res.blob();
          invoicesFolder?.file(`${baseName}.pdf`, blob);
          continue;
        }
      } catch (e) {
        console.error("Failed to download invoice PDF", inv.moloni_pdf_url, e);
      }
    }
    invoicesFolder?.file(`${baseName}.json`, JSON.stringify(inv, null, 2));
  }

  return zip.generateAsync({ type: "blob" });
}
