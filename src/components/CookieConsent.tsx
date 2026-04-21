import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStoredConsent, setStoredConsent, initConsent } from "@/lib/analytics";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    initConsent();
    if (!getStoredConsent()) setVisible(true);
  }, []);

  if (!visible) return null;

  const handle = (choice: "accepted" | "rejected") => {
    setStoredConsent(choice);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[100] p-4 sm:p-6"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-background/95 backdrop-blur shadow-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">
              We value your privacy
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use strictly necessary cookies to make this site work. With your consent,
              we also use Google Analytics to understand how visitors use the site so we
              can improve it. You can change your choice at any time on our{" "}
              <Link to="/cookie-policy" className="text-primary underline">
                Cookie Policy
              </Link>{" "}
              page. See our{" "}
              <Link to="/privacy-policy" className="text-primary underline">
                Privacy Policy
              </Link>{" "}
              for details.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => handle("rejected")}
              className="px-5 py-2.5 rounded-lg border border-input bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Reject non-essential
            </button>
            <button
              type="button"
              onClick={() => handle("accepted")}
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
