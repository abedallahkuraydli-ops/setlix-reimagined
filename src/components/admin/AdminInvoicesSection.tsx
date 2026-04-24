import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ExternalLink, RefreshCw, AlertCircle, CheckCircle2, Undo2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InvoiceBuilderDialog } from "./InvoiceBuilderDialog";

interface Invoice {
  id: string;
  description: string;
  amount_cents: number;
  refunded_amount_cents: number;
  currency: string;
  vat_rate: number;
  discount_percentage: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  moloni_pdf_url: string | null;
  moloni_document_number: string | null;
  moloni_document_id: string | null;
  moloni_error: string | null;
}

interface Refund {
  id: string;
  invoice_id: string;
  amount_cents: number;
  currency: string;
  reason: string | null;
  status: string;
  moloni_credit_note_number: string | null;
  moloni_credit_note_pdf_url: string | null;
  moloni_error: string | null;
  created_at: string;
}

const fmt = (cents: number, ccy: string) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: ccy || "EUR" }).format(cents / 100);

interface Props { clientId: string }

export const AdminInvoicesSection = ({ clientId }: Props) => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [reissuingId, setReissuingId] = useState<string | null>(null);
  const [refundFor, setRefundFor] = useState<Invoice | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from("invoices")
      .select("id, description, amount_cents, refunded_amount_cents, currency, vat_rate, discount_percentage, status, created_at, paid_at, moloni_pdf_url, moloni_document_number, moloni_document_id, moloni_error")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (data) setInvoices(data as Invoice[]);

    const { data: rd } = await supabase
      .from("refunds")
      .select("id, invoice_id, amount_cents, currency, reason, status, moloni_credit_note_number, moloni_credit_note_pdf_url, moloni_error, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (rd) setRefunds(rd as Refund[]);

    setLoading(false);
  };

  useEffect(() => { fetchInvoices(); }, [clientId]);

  const handleReissue = async (invoiceId: string) => {
    setReissuingId(invoiceId);
    const { error } = await supabase.functions.invoke("moloni-reissue", { body: { invoice_id: invoiceId } });
    setReissuingId(null);
    if (error) toast({ title: "Reissue failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Moloni invoice issued" }); fetchInvoices(); }
  };

  const openRefund = (inv: Invoice) => {
    const remaining = inv.amount_cents - (inv.refunded_amount_cents ?? 0);
    setRefundFor(inv);
    setRefundAmount((remaining / 100).toFixed(2));
    setRefundReason("");
  };

  const submitRefund = async () => {
    if (!refundFor) return;
    const amount = Math.round(parseFloat(refundAmount) * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    setRefunding(true);
    const { data, error } = await supabase.functions.invoke("refund-invoice", {
      body: { invoice_id: refundFor.id, amount_cents: amount, reason: refundReason || undefined },
    });
    setRefunding(false);
    if (error) {
      toast({ title: "Refund failed", description: error.message, variant: "destructive" });
    } else if ((data as any)?.moloni_error) {
      toast({
        title: "Refund issued — credit note pending",
        description: `Stripe refunded but Moloni credit note failed: ${(data as any).moloni_error}`,
      });
      setRefundFor(null);
      fetchInvoices();
    } else {
      toast({ title: "Refund issued", description: "Stripe refund + Moloni credit note created." });
      setRefundFor(null);
      fetchInvoices();
    }
  };

  const statusBadge = (s: string) => {
    if (s === "paid") return <Badge className="text-[10px] gap-1"><CheckCircle2 className="h-3 w-3" /> Paid</Badge>;
    if (s === "pending") return <Badge variant="secondary" className="text-[10px]">Awaiting payment</Badge>;
    if (s === "failed") return <Badge variant="destructive" className="text-[10px]">Failed</Badge>;
    if (s === "refunded") return <Badge variant="outline" className="text-[10px]">Refunded</Badge>;
    if (s === "partially_refunded") return <Badge variant="outline" className="text-[10px]">Partially refunded</Badge>;
    return <Badge variant="outline" className="text-[10px]">{s}</Badge>;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Invoices & Payments</h3>
        <InvoiceBuilderDialog clientId={clientId} onCreated={fetchInvoices} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No invoices yet for this client.</p>
      ) : (
        <div className="divide-y divide-border">
          {invoices.map((inv) => {
            const remaining = inv.amount_cents - (inv.refunded_amount_cents ?? 0);
            const refundable = (inv.status === "paid" || inv.status === "partially_refunded") && remaining > 0;
            return (
              <div key={inv.id} className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">{inv.description}</p>
                    {statusBadge(inv.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(inv.created_at).toLocaleDateString("pt-PT")}
                    {Number(inv.discount_percentage) > 0 && <> · −{inv.discount_percentage}% discount</>}
                    {inv.moloni_document_number && <> · {inv.moloni_document_number}</>}
                    {(inv.refunded_amount_cents ?? 0) > 0 && (
                      <> · refunded {fmt(inv.refunded_amount_cents, inv.currency)}</>
                    )}
                    {inv.moloni_error && (
                      <span className="text-destructive ml-2 inline-flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Moloni error</span>
                    )}
                  </p>
                </div>
                <div className="text-sm font-semibold text-foreground tabular-nums">{fmt(inv.amount_cents, inv.currency)}</div>
                {inv.moloni_pdf_url && (
                  <Button asChild size="sm" variant="ghost"><a href={inv.moloni_pdf_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
                )}
                {inv.status === "paid" && !inv.moloni_pdf_url && (
                  <Button size="sm" variant="outline" onClick={() => handleReissue(inv.id)} disabled={reissuingId === inv.id}>
                    {reissuingId === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><RefreshCw className="h-3.5 w-3.5 mr-1" /> Issue Moloni</>}
                  </Button>
                )}
                {refundable && (
                  <Button size="sm" variant="outline" onClick={() => openRefund(inv)}>
                    <Undo2 className="h-3.5 w-3.5 mr-1" /> Refund
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {refunds.length > 0 && (
        <div className="mt-6 pt-5 border-t border-border">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Refunds & credit notes</h4>
          <div className="divide-y divide-border">
            {refunds.map((r) => (
              <div key={r.id} className="py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    {fmt(r.amount_cents, r.currency)}
                    {r.moloni_credit_note_number && <span className="text-muted-foreground"> · {r.moloni_credit_note_number}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("pt-PT")}
                    {r.reason && <> · {r.reason}</>}
                    {r.moloni_error && <span className="text-destructive ml-2">· {r.moloni_error}</span>}
                  </p>
                </div>
                <Badge variant={r.status === "succeeded" ? "default" : r.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">
                  {r.status}
                </Badge>
                {r.moloni_credit_note_pdf_url && (
                  <Button asChild size="sm" variant="ghost"><a href={r.moloni_credit_note_pdf_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!refundFor} onOpenChange={(o) => !o && setRefundFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund invoice</DialogTitle>
          </DialogHeader>
          {refundFor && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{refundFor.description}</p>
                <p>Total {fmt(refundFor.amount_cents, refundFor.currency)} · already refunded {fmt(refundFor.refunded_amount_cents ?? 0, refundFor.currency)}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount to refund (€)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason (appears on the credit note)</Label>
                <Textarea
                  id="reason"
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Customer requested withdrawal"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                A Stripe refund and a Moloni credit note (Nota de Crédito) will be issued automatically.
                The original invoice remains immutable as required by Decreto-Lei 28/2019.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundFor(null)} disabled={refunding}>Cancel</Button>
            <Button onClick={submitRefund} disabled={refunding}>
              {refunding ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Processing</> : "Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
