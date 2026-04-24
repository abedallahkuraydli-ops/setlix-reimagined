import { supabase } from "@/integrations/supabase/client";

/**
 * Bump this version whenever the privacy policy or terms text changes.
 * Each user is asked to re-consent when the version they accepted is
 * older than the current one.
 */
export const PRIVACY_POLICY_VERSION = "2025-04-20";
export const TERMS_VERSION = "2025-04-20";

export type ConsentType = "privacy_policy" | "terms" | "marketing" | "cookies";

export interface ConsentRecord {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  policy_version: string;
  granted: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const CACHED_IP_KEY = "setlix_client_ip";

const fetchClientIp = async (): Promise<string | null> => {
  if (typeof window === "undefined") return null;
  const cached = sessionStorage.getItem(CACHED_IP_KEY);
  if (cached) return cached;
  try {
    const { data } = await supabase.functions.invoke<{ ip: string | null }>("client-ip");
    if (data?.ip) {
      sessionStorage.setItem(CACHED_IP_KEY, data.ip);
      return data.ip;
    }
  } catch {
    // Best effort only — never block the user
  }
  return null;
};

const PENDING_CONSENTS_KEY = "setlix_pending_consents";

interface PendingConsent {
  consentType: ConsentType;
  policyVersion: string;
  granted: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Stage a consent locally for users that signed up but haven't verified
 * their email yet (no auth session => RLS would block the insert).
 * Flushed automatically by `flushPendingConsents` after first sign-in.
 */
export const stagePendingConsent = (consent: PendingConsent) => {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(PENDING_CONSENTS_KEY);
    const existing: PendingConsent[] = raw ? JSON.parse(raw) : [];
    existing.push(consent);
    localStorage.setItem(PENDING_CONSENTS_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error("Failed to stage pending consent", e);
  }
};

export const flushPendingConsents = async (userId: string) => {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(PENDING_CONSENTS_KEY);
  if (!raw) return;
  let pending: PendingConsent[] = [];
  try {
    pending = JSON.parse(raw);
  } catch {
    localStorage.removeItem(PENDING_CONSENTS_KEY);
    return;
  }
  if (!pending.length) {
    localStorage.removeItem(PENDING_CONSENTS_KEY);
    return;
  }
  for (const c of pending) {
    await recordConsent({ userId, ...c });
  }
  localStorage.removeItem(PENDING_CONSENTS_KEY);
};

export const recordConsent = async (params: {
  userId: string;
  consentType: ConsentType;
  policyVersion: string;
  granted?: boolean;
  metadata?: Record<string, unknown>;
}) => {
  const ip = await fetchClientIp();
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
  const { error } = await supabase.from("consent_log").insert({
    user_id: params.userId,
    consent_type: params.consentType,
    policy_version: params.policyVersion,
    granted: params.granted ?? true,
    ip_address: ip,
    user_agent: ua,
    metadata: (params.metadata ?? null) as never,
  });
  if (error) {
    console.error("Failed to record consent", error);
  }
  return { error };
};

export const getLatestConsent = async (
  userId: string,
  consentType: ConsentType,
): Promise<ConsentRecord | null> => {
  const { data } = await supabase
    .from("consent_log")
    .select("*")
    .eq("user_id", userId)
    .eq("consent_type", consentType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ConsentRecord | null) ?? null;
};

export const listConsents = async (userId: string): Promise<ConsentRecord[]> => {
  const { data } = await supabase
    .from("consent_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data as ConsentRecord[] | null) ?? [];
};
