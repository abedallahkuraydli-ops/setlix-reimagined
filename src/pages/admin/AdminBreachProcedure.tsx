import { AlertTriangle, Mail, Phone, FileText, Clock, Shield } from "lucide-react";

/**
 * Internal documentation page for handling personal-data breaches under
 * GDPR Art. 33 (notification to supervisory authority within 72 h) and
 * Art. 34 (notification to affected data subjects when high risk).
 *
 * Kept inside the admin area as living documentation that travels with the
 * codebase, satisfying the accountability principle (Art. 5(2)).
 */
const AdminBreachProcedure = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-start gap-3 mb-6">
        <div className="rounded-full bg-destructive/10 p-3">
          <Shield className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Breach Notification Procedure</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mandatory workflow under GDPR Art. 33–34 and Portuguese Law 58/2019.
          </p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4 mb-6 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-foreground">72-hour clock</p>
          <p className="text-muted-foreground mt-1">
            From the moment we become <em>aware</em> of a breach, we have 72 hours to notify the
            CNPD. The clock does not stop for weekends or holidays.
          </p>
        </div>
      </div>

      <section className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-primary" /> Step 1 — Contain (within 1 hour)
          </h2>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li>Identify and isolate the affected systems / accounts</li>
            <li>Rotate compromised credentials, API keys and secrets</li>
            <li>Suspend any leaking edge function or third-party integration</li>
            <li>Preserve logs (Supabase, Stripe, Moloni) — do <strong>not</strong> delete</li>
          </ul>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-primary" /> Step 2 — Assess (within 24 hours)
          </h2>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li>What data categories were exposed? (identity, contact, fiscal, payment)</li>
            <li>How many data subjects are affected?</li>
            <li>Was the data encrypted / pseudonymised at rest?</li>
            <li>What is the likely risk to rights and freedoms? (low / medium / high)</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3 italic">
            Document everything in <code>/admin/breach-procedure</code> incident log (TODO: add
            DB-backed register).
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
            <Mail className="h-4 w-4 text-primary" /> Step 3 — Notify CNPD (within 72 hours)
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Submit the notification via the CNPD online portal:{" "}
            <a
              href="https://www.cnpd.pt/comunicar-uma-violacao-de-dados-pessoais/"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              cnpd.pt — comunicar violação de dados
            </a>
          </p>
          <div className="text-xs text-foreground bg-muted/50 rounded-lg p-3 space-y-2">
            <p><strong>Required information:</strong></p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Nature of the breach + categories and approximate number of subjects</li>
              <li>Categories and approximate number of records concerned</li>
              <li>Name and contact of the DPO / responsible person</li>
              <li>Likely consequences</li>
              <li>Measures taken or proposed to mitigate</li>
            </ul>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
            <Phone className="h-4 w-4 text-primary" /> Step 4 — Notify affected users (if high risk)
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Required by Art. 34 when the breach is likely to result in a <em>high risk</em> to
            rights and freedoms (e.g. fiscal data, NIF, payment details exposed).
          </p>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-semibold mb-2">Email template (PT/EN):</p>
            <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
{`Subject: Important security notice regarding your Setlix account

Dear [name],

On [date] we became aware of a security incident that may have exposed
the following personal data of yours: [categories].

What happened: [brief plain-language explanation]
What we have done: [containment measures]
What you should do: [change password, monitor accounts, etc.]

We have notified the Portuguese Data Protection Authority (CNPD).
You may also lodge a complaint with the CNPD: www.cnpd.pt

For any question, contact dpo@setlix.pt.

— Setlix Security Team`}
            </pre>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-foreground mb-3">Key contacts</h2>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li><strong>CNPD:</strong> +351 213 928 400 — geral@cnpd.pt</li>
            <li><strong>Setlix DPO:</strong> dpo@setlix.pt</li>
            <li><strong>Stripe security:</strong> security@stripe.com</li>
            <li><strong>Moloni support:</strong> support@moloni.pt</li>
            <li><strong>Lovable Cloud / Supabase:</strong> security@supabase.io</li>
          </ul>
        </div>
      </section>
    </div>
  );
};

export default AdminBreachProcedure;
