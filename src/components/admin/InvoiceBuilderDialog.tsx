import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Mode = "per_service" | "bundle" | "full";

interface BillableLine {
  id: string;
  name: string;
  price_cents: number;
  quantity: number;
  vat_rate: number;
}

interface Props {
  clientId: string;
  onCreated: () => void;
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(cents / 100);

const VAT_OPTIONS = [0, 6, 13, 23];

export function InvoiceBuilderDialog({ clientId, onCreated }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<Mode>("full");
  const [lines, setLines] = useState<BillableLine[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [discountPct, setDiscountPct] = useState("0");
  const [bundleDescription, setBundleDescription] = useState("");
  const [overrideVat, setOverrideVat] = useState<string>("");
  const [customNotes, setCustomNotes] = useState("");

  // Load billable client_services (unpaid + price set)
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("client_services")
      .select("id, quantity, price_cents, vat_rate, payment_status, service_catalogue:service_catalogue_id(name, price_cents, vat_rate)")
      .eq("client_id", clientId)
      .neq("payment_status", "paid")
      .then(({ data }) => {
        const mapped: BillableLine[] = (data ?? [])
          .map((cs: any) => {
            const price = cs.price_cents ?? cs.service_catalogue?.price_cents ?? 0;
            const vat = cs.vat_rate ?? cs.service_catalogue?.vat_rate ?? 23;
            return {
              id: cs.id,
              name: cs.service_catalogue?.name ?? "Service",
              price_cents: price,
              quantity: cs.quantity ?? 1,
              vat_rate: Number(vat),
            };
          })
          .filter((l) => l.price_cents > 0);
        setLines(mapped);
        setSelected(new Set(mapped.map((l) => l.id)));
        setLoading(false);
      });
  }, [open, clientId]);

  const activeLines = useMemo(() => {
    if (mode === "per_service") return lines.filter((l) => selected.has(l.id));
    return lines.filter((l) => selected.has(l.id));
  }, [mode, lines, selected]);

  const toggleLine = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Compute totals — VAT is applied per line on net subtotal after the overall discount %
  const totals = useMemo(() => {
    const grossPerLine = activeLines.map((l) => {
      // For aggregation: each line's net = price * qty (price is gross-incl-VAT in current schema convention).
      // We treat price_cents as GROSS (incl. VAT) — same as the invoice.amount_cents convention used today.
      const lineGross = l.price_cents * l.quantity;
      return { line: l, lineGross };
    });
    const subtotalGross = grossPerLine.reduce((s, x) => s + x.lineGross, 0);
    const discount = Math.min(100, Math.max(0, parseFloat(discountPct) || 0));
    const discountAmt = Math.round(subtotalGross * (discount / 100));
    const totalGross = subtotalGross - discountAmt;
    // weighted average VAT (used only for display + Moloni rate when mode = bundle/full with mixed VATs)
    const weightedVat = subtotalGross > 0
      ? grossPerLine.reduce((s, x) => s + x.line.vat_rate * x.lineGross, 0) / subtotalGross
      : 23;
    return { subtotalGross, discountAmt, totalGross, weightedVat };
  }, [activeLines, discountPct]);

  const handleCreate = async () => {
    if (activeLines.length === 0) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: adminProfile } = await supabase.from("profiles").select("id").eq("user_id", user!.id).single();

    const discount = Math.min(100, Math.max(0, parseFloat(discountPct) || 0));
    const overrideVatNum = overrideVat ? parseFloat(overrideVat) : null;

    try {
      if (mode === "per_service") {
        // One invoice per selected line
        const inserts = activeLines.map((l) => ({
          client_id: clientId,
          client_service_id: l.id,
          description: l.name,
          amount_cents: Math.round(l.price_cents * l.quantity * (1 - discount / 100)),
          vat_rate: overrideVatNum ?? l.vat_rate,
          discount_percentage: discount,
          currency: "EUR",
          status: "pending" as const,
          notes: customNotes.trim() || null,
          created_by_admin_id: adminProfile?.id ?? null,
        }));
        const { error } = await supabase.from("invoices").insert(inserts);
        if (error) throw error;
      } else {
        // bundle / full → single invoice
        const description = bundleDescription.trim()
          || (mode === "full"
            ? `Setlix services — ${activeLines.length} item${activeLines.length > 1 ? "s" : ""}`
            : activeLines.map((l) => l.name).join(", "));
        const { error } = await supabase.from("invoices").insert({
          client_id: clientId,
          description,
          amount_cents: totals.totalGross,
          vat_rate: overrideVatNum ?? Number(totals.weightedVat.toFixed(2)),
          discount_percentage: discount,
          currency: "EUR",
          status: "pending",
          notes: customNotes.trim() || null,
          created_by_admin_id: adminProfile?.id ?? null,
        });
        if (error) throw error;
      }

      toast({ title: "Invoice created", description: "The client can now pay it from their portal." });
      setOpen(false);
      setSelected(new Set());
      setDiscountPct("0");
      setBundleDescription("");
      setOverrideVat("");
      setCustomNotes("");
      onCreated();
    } catch (e: any) {
      toast({ title: "Could not create invoice", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Issue invoice</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Build invoice</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : lines.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No billable services. Add a price and quantity to a service first.
          </p>
        ) : (
          <div className="space-y-5">
            {/* Mode toggle */}
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              {(["full", "bundle", "per_service"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    if (m === "full") setSelected(new Set(lines.map((l) => l.id)));
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                    mode === m ? "bg-background shadow text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {m === "full" && "Full (all services)"}
                  {m === "bundle" && "Bundle (one invoice)"}
                  {m === "per_service" && "Per service (one each)"}
                </button>
              ))}
            </div>

            {/* Lines */}
            <div className="border border-border rounded-lg divide-y divide-border">
              {lines.map((l) => {
                const isOn = selected.has(l.id);
                const lineGross = l.price_cents * l.quantity;
                return (
                  <label
                    key={l.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${isOn ? "bg-accent/30" : ""}`}
                  >
                    <Checkbox
                      checked={isOn}
                      onCheckedChange={() => toggleLine(l.id)}
                      disabled={mode === "full"}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{l.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmt(l.price_cents)} × {l.quantity} · VAT {l.vat_rate}%
                      </p>
                    </div>
                    <div className="text-sm font-semibold tabular-nums">{fmt(lineGross)}</div>
                  </label>
                );
              })}
            </div>

            {/* Bundle description */}
            {mode === "bundle" && (
              <div>
                <Label>Invoice description (optional)</Label>
                <Input
                  value={bundleDescription}
                  onChange={(e) => setBundleDescription(e.target.value)}
                  placeholder="e.g. Setlix services – April 2026"
                />
              </div>
            )}

            {/* Discount + VAT override */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Discount on total (%)</Label>
                <Input
                  type="number" min="0" max="100" step="0.5"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                />
              </div>
              <div>
                <Label>VAT override (optional)</Label>
                <Select value={overrideVat || "auto"} onValueChange={(v) => setOverrideVat(v === "auto" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (per service)</SelectItem>
                    {VAT_OPTIONS.map((v) => (
                      <SelectItem key={v} value={String(v)}>{v}%</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Internal notes (optional)</Label>
              <Textarea rows={2} value={customNotes} onChange={(e) => setCustomNotes(e.target.value)} />
            </div>

            {/* Summary */}
            <div className="bg-muted/40 rounded-lg p-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span className="tabular-nums">{fmt(totals.subtotalGross)}</span>
              </div>
              {totals.discountAmt > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount ({discountPct}%)</span>
                  <span className="tabular-nums">−{fmt(totals.discountAmt)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-foreground pt-1.5 border-t border-border">
                <span>Total (incl. VAT)</span>
                <span className="tabular-nums">{fmt(totals.totalGross)}</span>
              </div>
              {mode === "per_service" && activeLines.length > 1 && (
                <p className="text-xs text-muted-foreground pt-2">
                  Will create {activeLines.length} separate invoices.
                </p>
              )}
            </div>

            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={creating || activeLines.length === 0}
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : `Create ${mode === "per_service" && activeLines.length > 1 ? `${activeLines.length} invoices` : "invoice"}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
