import { supabase } from "@/integrations/supabase/client";

export interface DocPermissionMap {
  [documentId: string]: boolean;
}

export async function fetchAuthorisedDocIds(adminUserId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("document_download_permissions")
    .select("document_id, authorised")
    .eq("admin_user_id", adminUserId)
    .eq("authorised", true);
  return new Set((data ?? []).map((d) => d.document_id as string));
}

export async function logUnauthorisedAttempt(args: {
  adminUserId: string;
  clientProfileId?: string | null;
  documentId?: string | null;
  documentName?: string | null;
}) {
  await supabase.from("unauthorised_download_attempts").insert({
    admin_user_id: args.adminUserId,
    client_profile_id: args.clientProfileId ?? null,
    document_id: args.documentId ?? null,
    document_name: args.documentName ?? null,
  });
}
