import { supabase } from "@/integrations/supabase/client";

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export const ALLOWED_EXTENSIONS = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx";
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export const validateFile = (file: File): string | null => {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return "Unsupported file type. Allowed: PDF, JPG, PNG, WEBP, DOC, DOCX, XLS, XLSX";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File must be under 25 MB";
  }
  return null;
};

export const formatBytes = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

type AuditAction =
  | "upload"
  | "download"
  | "view"
  | "delete"
  | "admin_upload"
  | "admin_download"
  | "admin_delete";

interface AuditPayload {
  action: AuditAction;
  actor_role: "client" | "admin" | "system";
  actor_user_id: string | null;
  target_user_id?: string | null;
  document_id?: string | null;
  document_request_id?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  metadata?: Record<string, unknown>;
  download_purpose?: string | null;
}

export const logAudit = async (payload: AuditPayload) => {
  try {
    const { error } = await supabase.rpc("log_document_action", {
      _action: payload.action,
      _document_id: payload.document_id ?? undefined,
      _document_request_id: payload.document_request_id ?? undefined,
      _file_path: payload.file_path ?? undefined,
      _file_name: payload.file_name ?? undefined,
      _metadata: (payload.metadata ?? undefined) as never,
      _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      _download_purpose: payload.download_purpose ?? undefined,
    } as never);
    if (error) throw error;
  } catch (err) {
    console.error("Audit log failed", err);
  }
};

/** Compute SHA-256 of a File using SubtleCrypto. Returns hex string. */
export const computeSha256 = async (file: File): Promise<string | null> => {
  try {
    if (typeof crypto === "undefined" || !crypto.subtle) return null;
    const buf = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch (err) {
    console.warn("SHA-256 hashing failed", err);
    return null;
  }
};

/** Human-readable retention period for a document category (matches DB trigger). */
export const retentionLabel = (category: string): string => {
  if (["invoice", "contract", "signed_contract", "setlix_issued", "fiscal"].includes(category)) {
    return "10 years (Portuguese tax law — Decreto-Lei 28/2019)";
  }
  return "5 years (GDPR data minimisation)";
};
