// Lisbon-aware time formatting helpers used across the appointments UI.
const TZ = "Europe/Lisbon";

export function formatLisbonDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

export function formatLisbonTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function formatLisbonRange(startIso: string, endIso: string): string {
  return `${formatLisbonDate(startIso)} · ${formatLisbonTime(startIso)}–${formatLisbonTime(endIso)}`;
}

export function lisbonDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export const LISBON_TZ = TZ;
