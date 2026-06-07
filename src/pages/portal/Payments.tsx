import { useEffect, useState } from "react";
import { Loader2, ExternalLink, CheckCircle2, AlertCircle, Building2, Copy, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Invoice {
  id: string;
  description: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  moloni_pdf_url: string | null;
  moloni_document_number: string | null;
}

const fmt = (cents: number, ccy: string) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: ccy || "EUR" }).format(cents / 100);

interface BankDetails {
  bankName: string;
  accountHolder: string;
  iban: string;
  bic: string;
}

const FALLBACK_BANK: BankDetails = {
  bankName: "Millennium BCP",
  accountHolder: "Inconstant Scape Unip Lda",
  iban: "PT50 0033 0000 4579 9951 6510 5",
  bic: "BCOMPTPL",
};

const Payments = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientFullName, setClientFullName] = useState<string>("");
  const [bank, setBank] = useState<BankDetails>(FALLBACK_BANK);

  useEffect(() => {
    // Use the RPC helper that exposes only bank fields (not the full
    // admin_settings row, which is admin-only).
    supabase
      .rpc("get_company_bank_details")
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setBank({
          bankName: data.bank_name || FALLBACK_BANK.bankName,
          accountHolder: data.bank_account_holder || FALLBACK_BANK.accountHolder,
          iban: data.bank_iban || FALLBACK_BANK.iban,
          bic: data.bank_bic || FALLBACK_BANK.bic,
        });
      });
  }, []);

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from("invoices")
      .select("id, description, amount_cents, currency, status, created_at, paid_at, moloni_pdf_url, moloni_document_number")
      .order("created_at", { ascending: false });
    if (data) setInvoices(data as Invoice[]);
    setLoading(false);
  };

  useEffect(() => { fetchInvoices(); }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, first_name, last_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const composed = data.full_name?.trim()
          || [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
        if (composed) setClientFullName(composed);
      });
  }, [user]);

  const paymentReference = `${(clientFullName || "CLIENT FULL NAME").toUpperCase()}: SERVICE PAYMENT`;

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  // Online payments are not enabled — clients pay via bank transfer only.

  const pending = invoices.filter((i) => i.status === "pending" || i.status === "failed");
  const history = invoices.filter((i) => i.status === "paid" || i.status === "refunded");

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Payments</h1>
        <p className="text-muted-foreground text-sm mt-1">Pay outstanding invoices and review your payment history.</p>
      </div>

      {/* Bank transfer notice — temporary while online payments are being integrated */}
      <section className="mb-8 rounded-xl border border-primary/20 bg-primary/5 p-5 md:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="rounded-lg bg-primary/10 p-2 shrink-0">
            <Info className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Online payments coming soon</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Setlix is currently working on integrating an online payment system into the portal.
              Until that is ready, payments can only be made via regular bank transfer using the
              details below.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          {[
            { label: "Bank", value: bank.bankName },
            { label: "Account holder", value: bank.accountHolder },
            { label: "IBAN", value: bank.iban },
            { label: "BIC / SWIFT", value: bank.bic },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-start justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </p>
                <p className="text-sm font-medium text-foreground break-all">{item.value}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={() => copyToClipboard(item.value, item.label)}
                title={`Copy ${item.label}`}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-dashed border-primary/30 bg-background p-3">
          <div className="flex items-start gap-2">
            <Building2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground mb-1">
                Payment reference (use in the transfer description)
              </p>
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
                <code className="text-xs font-mono text-foreground break-all">
                  {paymentReference}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => copyToClipboard(paymentReference, "Reference")}
                  title="Copy reference"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                Replace <span className="font-semibold">CLIENT FULL NAME</span> with your full
                legal name if it isn't already filled in. Including this reference helps us
                match your transfer to the correct invoice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Outstanding</h2>
            {pending.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
                You have no outstanding invoices.
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
                {pending.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{inv.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(inv.created_at).toLocaleDateString("pt-PT")}
                        {inv.status === "failed" && <Badge variant="destructive" className="ml-2 text-[10px]">Last attempt failed</Badge>}
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-foreground">{fmt(inv.amount_cents, inv.currency)}</div>
                    <Badge variant="outline" className="text-[10px]">Bank transfer</Badge>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">History</h2>
            {history.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
                No payments yet.
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
                {history.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-4 p-4">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{inv.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {inv.paid_at && new Date(inv.paid_at).toLocaleDateString("pt-PT")}
                        {inv.moloni_document_number && <> · {inv.moloni_document_number}</>}
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-foreground">{fmt(inv.amount_cents, inv.currency)}</div>
                    {inv.moloni_pdf_url ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={inv.moloni_pdf_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1" /> Invoice</a>
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] gap-1"><AlertCircle className="h-3 w-3" /> Issuing</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

    </div>
  );
};

export default Payments;
