// GDPR/ePrivacy-compliant analytics loader.
// Google Analytics is only loaded AFTER the user grants explicit consent.

const GA_ID = "G-TZDJHGQB15";
const CONSENT_KEY = "setlix-cookie-consent-v1";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export type ConsentChoice = "accepted" | "rejected";

export interface ConsentRecord {
  choice: ConsentChoice;
  timestamp: string;
  version: 1;
}

export const getStoredConsent = (): ConsentRecord | null => {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (parsed.choice !== "accepted" && parsed.choice !== "rejected") return null;
    return parsed;
  } catch {
    return null;
  }
};

export const setStoredConsent = (choice: ConsentChoice) => {
  const record: ConsentRecord = {
    choice,
    timestamp: new Date().toISOString(),
    version: 1,
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  applyConsent(choice);
};

export const clearStoredConsent = () => {
  localStorage.removeItem(CONSENT_KEY);
  // Revoke analytics + clear GA cookies on the current domain.
  applyConsent("rejected");
  clearGaCookies();
};

const clearGaCookies = () => {
  const cookies = document.cookie.split(";");
  for (const c of cookies) {
    const name = c.split("=")[0].trim();
    if (name.startsWith("_ga") || name === "_gid") {
      const domains = ["", `.${window.location.hostname}`, window.location.hostname];
      for (const d of domains) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${d}`;
      }
    }
  }
};

let gaScriptLoaded = false;

const loadGaScript = () => {
  if (gaScriptLoaded) return;
  gaScriptLoaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  window.gtag("config", GA_ID, { anonymize_ip: true });
};

export const applyConsent = (choice: ConsentChoice) => {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  if (choice === "accepted") {
    window.gtag("consent", "update", {
      analytics_storage: "granted",
    });
    loadGaScript();
  } else {
    window.gtag("consent", "update", {
      analytics_storage: "denied",
    });
  }
};

export const initConsent = () => {
  const stored = getStoredConsent();
  if (stored) applyConsent(stored.choice);
};
