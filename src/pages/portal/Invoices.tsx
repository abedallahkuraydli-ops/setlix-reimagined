import { useEffect, useState } from "react";
import { Receipt, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Invoice {
  id: string;
  description: string;
  amount_cents: number;
  currency: string;
  paid_at: string | null;
  moloni_pdf_url: string | null;
  moloni_document_number: string | null;
}

const fmt = (cents: number, ccy: string) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: ccy || "EUR" }).format(cents / 100);

const Invoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("invoices")
        .select("id, description, amount_cents, currency, paid_at, moloni_pdf_url, moloni_document_number")
        .eq("status", "paid")
        .order("paid_at", { ascending: false });
      if (data) setInvoices(data as Invoice[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
        <p className="text-muted-foreground text-sm mt-1">Download and review your invoices.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-xl">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Receipt className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">No invoices yet</h2>
          <p className="text-sm text-muted-foreground max-w-sm text-center">
            Invoices for your services will be available here for download once payments are completed.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center gap-4 p-4">
              <Receipt className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{inv.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {inv.moloni_document_number ?? "Pending issuance"}
                  {inv.paid_at && ` · ${new Date(inv.paid_at).toLocaleDateString("pt-PT")}`}
                </p>
              </div>
              <div className="text-sm font-semibold text-foreground">{fmt(inv.amount_cents, inv.currency)}</div>
              {inv.moloni_pdf_url && (
                <Button asChild size="sm" variant="outline">
                  <a href={inv.moloni_pdf_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1" /> PDF</a>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Invoices;
