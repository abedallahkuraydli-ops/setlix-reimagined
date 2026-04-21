import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { clearStoredConsent, getStoredConsent, setStoredConsent } from "@/lib/analytics";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const CookiePolicy = () => {
  const [, force] = useState(0);
  const stored = getStoredConsent();

  const update = (choice: "accepted" | "rejected") => {
    setStoredConsent(choice);
    force((n) => n + 1);
    toast({ title: "Preferences updated", description: `Analytics cookies ${choice === "accepted" ? "enabled" : "disabled"}.` });
  };

  const reset = () => {
    clearStoredConsent();
    force((n) => n + 1);
    toast({ title: "Preferences cleared", description: "You will be asked again on your next visit." });
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="pt-32 pb-24 bg-background">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-4xl font-bold text-foreground mb-2">Cookie Policy</h1>
          <p className="text-muted-foreground mb-10 text-sm">Last updated: April 21, 2026</p>

          <div className="prose prose-sm max-w-none text-foreground/90 space-y-6">
            <p>
              This Cookie Policy explains how Setlix ("we", "us") uses cookies and similar
              technologies on <strong>setlix.pt</strong>. It supplements our{" "}
              <a href="/privacy-policy" className="text-primary underline">Privacy Policy</a>{" "}
              and is provided in accordance with the General Data Protection Regulation
              (EU) 2016/679 (GDPR), the ePrivacy Directive 2002/58/EC, and the Portuguese
              Law no. 41/2004.
            </p>

            <h2 className="text-xl font-semibold text-foreground">1. What are cookies?</h2>
            <p>
              Cookies are small text files stored on your device when you visit a website.
              They are widely used to make sites work, improve user experience, and provide
              information to site owners. We also use related technologies such as
              localStorage to remember your preferences.
            </p>

            <h2 className="text-xl font-semibold text-foreground">2. Categories of cookies we use</h2>
            <h3 className="text-lg font-semibold text-foreground">a) Strictly necessary (always active)</h3>
            <p>
              These are required for the website to function and cannot be switched off.
              They include security tokens and a small entry in your browser's localStorage
              (<code>setlix-cookie-consent-v1</code>) that records your cookie choice so we
              do not ask again on every page.
            </p>

            <h3 className="text-lg font-semibold text-foreground">b) Analytics (consent required)</h3>
            <p>
              With your consent, we use <strong>Google Analytics 4</strong> (provider:
              Google Ireland Limited) to understand how visitors interact with our site.
              IP addresses are anonymised. These cookies are only set after you click
              "Accept all" on our consent banner.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-foreground/80">
              <li><code>_ga</code> — distinguishes unique users (retention: up to 2 years)</li>
              <li><code>_ga_&lt;ID&gt;</code> — used by GA4 to persist session state (retention: up to 2 years)</li>
              <li><code>_gid</code> — distinguishes users (retention: 24 hours)</li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground">c) Advertising cookies</h3>
            <p>We do not use advertising or marketing cookies.</p>

            <h2 className="text-xl font-semibold text-foreground">3. International data transfers</h2>
            <p>
              Google Analytics may transfer data outside the European Economic Area (EEA).
              Google relies on the EU-US Data Privacy Framework and Standard Contractual
              Clauses approved by the European Commission as transfer safeguards.
            </p>

            <h2 className="text-xl font-semibold text-foreground">4. Managing your preferences</h2>
            <p>
              You can change or withdraw your consent at any time below. You can also
              delete cookies through your browser settings. Withdrawing consent does not
              affect the lawfulness of processing carried out before withdrawal.
            </p>

            <div className="rounded-xl border border-border bg-muted/30 p-5 not-prose">
              <p className="text-sm text-foreground mb-3">
                <strong>Current preference:</strong>{" "}
                {stored
                  ? stored.choice === "accepted"
                    ? "Analytics cookies enabled"
                    : "Only strictly necessary cookies"
                  : "No preference set"}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => update("accepted")}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
                >
                  Accept analytics
                </button>
                <button
                  type="button"
                  onClick={() => update("rejected")}
                  className="px-4 py-2 rounded-lg border border-input bg-background text-sm font-medium text-foreground hover:bg-muted"
                >
                  Reject analytics
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="px-4 py-2 rounded-lg border border-input bg-background text-sm font-medium text-foreground hover:bg-muted"
                >
                  Clear my choice
                </button>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-foreground">5. Contact</h2>
            <p>
              For any questions about this Cookie Policy, contact{" "}
              <a href="mailto:info@setlix.pt" className="text-primary underline">info@setlix.pt</a>.
              You may also lodge a complaint with the Portuguese Data Protection Authority
              (Comissão Nacional de Proteção de Dados — CNPD).
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default CookiePolicy;
