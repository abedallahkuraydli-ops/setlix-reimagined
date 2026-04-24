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
    });
    if (error) throw error;
  } catch (err) {
    console.error("Audit log failed", err);
  }
};
