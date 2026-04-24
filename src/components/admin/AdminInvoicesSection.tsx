import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Download, Plus, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Invoice {
  id: string;
  description: string;
  amount_cents: number;
  currency: string;
  vat_rate: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  notes: string | null;
}

const fmt = (cents: number, ccy: string) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: ccy || "EUR" }).format(cents / 100);

interface Props {
  clientId: string;
  clientUserId: string;
}

export const AdminInvoicesSection = ({ clientId, clientUserId }: Props) => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [vatRate, setVatRate] = useState("23");
  const [notes, setNotes] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from("invoices")
      .select("id, description, amount_cents, currency, vat_rate, status, created_at, paid_at, notes")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (data) setInvoices(data as Invoice[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, [clientId]);

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setVatRate("23");
    setNotes("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast({ title: "Please choose a PDF", variant: "destructive" });
      return;
    }
    if (file.type !== "application/pdf") {
      toast({ title: "Only PDF files are accepted", variant: "destructive" });
      return;
    }
    const cents = Math.round(parseFloat(amount) * 100);
    if (!description.trim() || !Number.isFinite(cents) || cents <= 0) {
      toast({ title: "Description and amount are required", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const path = `${clientUserId}/invoices/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (upErr) throw upErr;

      const { error: invErr } = await supabase.from("invoices").insert({
        client_id: clientId,
        description: description.trim(),
        amount_cents: cents,
        vat_rate: parseFloat(vatRate) || 0,
        currency: "EUR",
        status: "pending",
        notes: notes.trim() || null,
        moloni_pdf_url: path,
      });
      if (invErr) throw invErr;

      const { data: authData } = await supabase.auth.getUser();
      await supabase.from("documents").insert({
        user_id: clientUserId,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: "application/pdf",
        category: "invoice",
        uploaded_by_admin_id: authData.user?.id ?? null,
      });

      toast({ title: "Invoice uploaded" });
      setUploadOpen(false);
      resetForm();
      fetchInvoices();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (inv: Invoice) => {
    setDownloadingId(inv.id);
    try {
      const { data: row } = await supabase
        .from("invoices")
        .select("moloni_pdf_url")
        .eq("id", inv.id)
        .single();
      const path = row?.moloni_pdf_url;
      if (!path) {
        toast({ title: "No file attached", variant: "destructive" });
        return;
      }
      const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60);
      if (error || !data) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const updateStatus = async (id: string, status: "paid" | "cancelled" | "pending") => {
    const patch: { status: typeof status; paid_at?: string } = { status };
    if (status === "paid") patch.paid_at = new Date().toISOString();
    const { error } = await supabase.from("invoices").update(patch).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else fetchInvoices();
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm("Delete this invoice record? The uploaded PDF will remain in storage.")) return;
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else fetchInvoices();
  };

  const statusBadge = (s: string) => {
    if (s === "paid") return <Badge className="text-[10px] gap-1"><CheckCircle2 className="h-3 w-3" /> Paid</Badge>;
    if (s === "pending") return <Badge variant="secondary" className="text-[10px]">Awaiting payment</Badge>;
    if (s === "cancelled") return <Badge variant="outline" className="text-[10px]">Cancelled</Badge>;
    return <Badge variant="outline" className="text-[10px]">{s}</Badge>;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Invoices</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload invoice PDFs manually. Clients pay via bank transfer.
          </p>
        </div>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Upload PDF
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No invoices yet for this client.</p>
      ) : (
        <div className="divide-y divide-border">
          {invoices.map((inv) => (
            <div key={inv.id} className="py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground truncate">{inv.description}</p>
                  {statusBadge(inv.status)}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(inv.created_at).toLocaleDateString("pt-PT")}
                  {inv.paid_at && <> · paid {new Date(inv.paid_at).toLocaleDateString("pt-PT")}</>}
                  {inv.notes && <> · {inv.notes}</>}
                </p>
              </div>
              <div className="text-sm font-semibold text-foreground tabular-nums">
                {fmt(inv.amount_cents, inv.currency)}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDownload(inv)}
                disabled={downloadingId === inv.id}
              >
                {downloadingId === inv.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
              </Button>
              {inv.status === "pending" && (
                <Button size="sm" variant="outline" onClick={() => updateStatus(inv.id, "paid")}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark paid
                </Button>
              )}
              {inv.status === "pending" && (
                <Button size="sm" variant="ghost" onClick={() => updateStatus(inv.id, "cancelled")}>
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => deleteInvoice(inv.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={(o) => { setUploadOpen(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload invoice PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inv-file">Invoice PDF</Label>
              <Input id="inv-file" type="file" accept="application/pdf" ref={fileRef} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-desc">Description</Label>
              <Input
                id="inv-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. NIF assistance — March 2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-amount">Amount (€)</Label>
                <Input
                  id="inv-amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-vat">VAT %</Label>
                <Input
                  id="inv-vat"
                  type="number"
                  step="0.01"
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-notes">Internal notes (optional)</Label>
              <Textarea
                id="inv-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The PDF is stored privately. Clients can download it from their portal and pay
              via bank transfer.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Uploading</> : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
