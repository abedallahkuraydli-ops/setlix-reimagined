/**
 * Tamper-evident sealing utilities.
 *
 * We hash a canonical JSON payload of the signature event so that any
 * later modification to the contracts row can be detected by re-hashing
 * and comparing against the stored signature_hash.
 */

export interface SignaturePayload {
  contract_id: string;
  client_id: string;
  contract_file_path: string;
  contract_file_name: string;
  signature_method: string;
  signature_typed_name?: string | null;
  signature_drawn_data_url?: string | null;
  signed_file_path?: string | null;
  signed_at: string;
  signed_user_agent: string;
}

const canonicalize = (obj: SignaturePayload): string => {
  const keys = Object.keys(obj).sort() as (keyof SignaturePayload)[];
  const ordered: Record<string, unknown> = {};
  for (const k of keys) {
    const v = obj[k];
    ordered[k] = v ?? null;
  }
  return JSON.stringify(ordered);
};

export const sha256Hex = async (input: string): Promise<string> => {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const sealSignature = async (payload: SignaturePayload): Promise<string> => {
  return sha256Hex(canonicalize(payload));
};

export const verifySignature = async (
  payload: SignaturePayload,
  expectedHash: string,
): Promise<boolean> => {
  const computed = await sealSignature(payload);
  return computed === expectedHash;
};
