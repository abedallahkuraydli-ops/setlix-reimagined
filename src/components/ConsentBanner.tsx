import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import {
  PRIVACY_POLICY_VERSION,
  getLatestConsent,
  recordConsent,
} from "@/lib/consent";

/**
 * Shown to authenticated users when they have not yet accepted the
 * current privacy policy version. Records consent + version + IP + UA
 * to satisfy GDPR Art. 7 (proof of consent).
 */
export const ConsentBanner = () => {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const latest = await getLatestConsent(user.id, "privacy_policy");
      if (!active) return;
      if (!latest || latest.policy_version !== PRIVACY_POLICY_VERSION || !latest.granted) {
        setShow(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const accept = async () => {
    if (!user) return;
    setSubmitting(true);
    await recordConsent({
      userId: user.id,
      consentType: "privacy_policy",
      policyVersion: PRIVACY_POLICY_VERSION,
      granted: true,
    });
    setSubmitting(false);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 bg-card border border-border rounded-xl shadow-2xl p-5 animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="rounded-full bg-primary/10 p-2 shrink-0">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Privacy & data processing</p>
          <p className="text-xs text-muted-foreground mt-1">
            We process your personal data under GDPR and Portuguese Law 58/2019. Please review and
            accept our{" "}
            <a href="/privacy-policy" target="_blank" className="underline text-primary">
              Privacy Policy
            </a>{" "}
            (version {PRIVACY_POLICY_VERSION}) to continue.
          </p>
        </div>
      </div>
      <Button onClick={accept} disabled={submitting} size="sm" className="w-full">
        {submitting ? "Recording…" : "I accept"}
      </Button>
    </div>
  );
};
