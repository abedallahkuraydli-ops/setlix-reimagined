import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, Loader2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  applyDueLateFees,
  computeBilling,
  formatMoney,
  loadBillingForClient,
  type BillingRow,
  type PaymentRow,
  type ServicePriceRow,
} from "@/lib/billing";
import { notifyClientOfChange } from "@/lib/clientNotifications";

interface Props {
  clientId: string;
}

export const AdminBillingSection = ({ clientId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<ServicePriceRow[]>([]);
  const [billing, setBilling] = useState<BillingRow | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  // Form state
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideAmount, setOverrideAmount] = useState("");
  const [nextDue, setNextDue] = useState<Date | undefined>(undefined);
  const [lastPayment, setLastPayment] = useState<Date | undefined>(undefined);
  const [lateFeePct, setLateFeePct] = useState("10");
  const [lateFeeEnabled, setLateFeeEnabled] = useState(true);
  const [resetLateFees, setResetLateFees] = useState(false);

  // New payment dialog
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState<Date>(new Date());
  const [payNote, setPayNote] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await loadBillingForClient(clientId);
    // Auto-apply any newly elapsed late-fee periods
    if (data.billing) {
      const updated = await applyDueLateFees(clientId, data.billing);
      if (updated) data.billing = updated;
    }
    setServices(data.services);
    setBilling(data.billing);
    setPayments(data.payments);

    if (data.billing) {
      setOverrideEnabled(data.billing.total_override_cents !== null);
      setOverrideAmount(
        data.billing.total_override_cents !== null
          ? (data.billing.total_override_cents / 100).toFixed(2)
          : "",
      );
      setNextDue(data.billing.next_payment_due_at ? new Date(data.billing.next_payment_due_at) : undefined);
      setLastPayment(data.billing.last_payment_at ? new Date(data.billing.last_payment_at) : undefined);
      setLateFeePct(String(data.billing.late_fee_percentage));
      setLateFeeEnabled(data.billing.late_fee_enabled);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const summary = computeBilling(services, billing, payments);

  const saveSettings = async () => {
    setSaving(true);
    const payload = {
      client_id: clientId,
      total_override_cents:
        overrideEnabled && overrideAmount ? Math.round(parseFloat(overrideAmount) * 100) : null,
      next_payment_due_at: nextDue ? nextDue.toISOString() : null,
      last_payment_at: lastPayment ? lastPayment.toISOString() : null,
      late_fee_percentage: parseFloat(lateFeePct) || 0,
      late_fee_enabled: lateFeeEnabled,
      ...(resetLateFees ? { late_fee_applied_count: 0, late_fee_last_applied_at: null } : {}),
    };

    const { error } = billing
      ? await supabase.from("client_billing").update(payload).eq("id", billing.id)
      : await supabase.from("client_billing").insert(payload);

    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setResetLateFees(false);
    toast({ title: "Billing updated" });
    refresh();
  };

  const logPayment = async () => {
    const cents = Math.round(parseFloat(payAmount) * 100);
    if (!cents || cents <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("client_payments").insert({
      client_id: clientId,
      amount_cents: cents,
      paid_at: payDate.toISOString(),
      note: payNote || null,
      recorded_by_admin_id: user?.id,
    });
    if (error) {
      toast({ title: "Could not log payment", description: error.message, variant: "destructive" });
      return;
    }
    // Update last_payment_at on billing for convenience
    if (billing) {
      await supabase
        .from("client_billing")
        .update({ last_payment_at: payDate.toISOString() })
        .eq("id", billing.id);
    }
    setPayAmount("");
    setPayNote("");
    setPayDate(new Date());
    toast({ title: "Payment recorded" });
    refresh();
  };

  const deletePayment = async (id: string) => {
    const { error } = await supabase.from("client_payments").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    refresh();
  };

  return (
    <section className="bg-card border border-border rounded-xl p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Billing</h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading billing…
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryTile label="Active services total" value={formatMoney(summary.servicesTotalCents, summary.currency)} />
            <SummaryTile
              label={summary.hasDiscount ? "Override (discounted)" : "Total"}
              value={formatMoney(summary.baseTotalCents, summary.currency)}
              accent={summary.hasDiscount ? "text-emerald-600" : undefined}
            />
            <SummaryTile
              label={`Late fee${summary.lateFeeCents > 0 ? ` (×${billing?.late_fee_applied_count})` : ""}`}
              value={formatMoney(summary.lateFeeCents, summary.currency)}
              accent={summary.lateFeeCents > 0 ? "text-destructive" : undefined}
            />
            <SummaryTile label="Remaining" value={formatMoney(summary.remainingCents, summary.currency)} accent="text-primary" />
          </div>

          {summary.daysUntilDue !== null && (
            <div className={cn(
              "rounded-lg border px-4 py-3 text-sm",
              summary.isOverdue ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-muted/30 text-foreground",
            )}>
              {summary.isOverdue
                ? `Overdue by ${Math.abs(summary.daysUntilDue)} day${Math.abs(summary.daysUntilDue) === 1 ? "" : "s"}`
                : summary.daysUntilDue === 0
                  ? "Payment is due today"
                  : `${summary.daysUntilDue} day${summary.daysUntilDue === 1 ? "" : "s"} until next payment due`}
            </div>
          )}

          {/* Settings form */}
          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-border">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Override total price</Label>
                <Switch checked={overrideEnabled} onCheckedChange={setOverrideEnabled} />
              </div>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 1500.00"
                value={overrideAmount}
                onChange={(e) => setOverrideAmount(e.target.value)}
                disabled={!overrideEnabled}
              />
              <p className="text-xs text-muted-foreground">
                When off, total is computed from active services ({formatMoney(summary.servicesTotalCents, summary.currency)}).
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm">Next payment due</Label>
              <DateField value={nextDue} onChange={setNextDue} placeholder="Pick a due date" />
              <Label className="text-sm">Last payment received</Label>
              <DateField value={lastPayment} onChange={setLastPayment} placeholder="Pick a date" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Late payment fee enabled</Label>
                <Switch checked={lateFeeEnabled} onCheckedChange={setLateFeeEnabled} />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.5"
                  value={lateFeePct}
                  onChange={(e) => setLateFeePct(e.target.value)}
                  disabled={!lateFeeEnabled}
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">% per overdue period (compounded)</span>
              </div>
              {(billing?.late_fee_applied_count ?? 0) > 0 && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={resetLateFees} onChange={(e) => setResetLateFees(e.target.checked)} />
                  Reset accumulated late fees on save (currently ×{billing?.late_fee_applied_count})
                </label>
              )}
            </div>

            <div className="flex items-end justify-end">
              <Button onClick={saveSettings} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save billing settings
              </Button>
            </div>
          </div>

          {/* Payments log */}
          <div className="pt-4 border-t border-border space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Record payment</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Input
                type="number"
                step="0.01"
                placeholder="Amount (€)"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
              <DateField value={payDate} onChange={(d) => d && setPayDate(d)} placeholder="Paid on" />
              <Input placeholder="Note (optional)" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
              <Button onClick={logPayment}><Plus className="h-4 w-4 mr-1" /> Log payment</Button>
            </div>

            {payments.length > 0 && (
              <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{formatMoney(p.amount_cents, p.currency)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(p.paid_at), "PPP")}{p.note ? ` — ${p.note}` : ""}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deletePayment(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
};

const SummaryTile = ({ label, value, accent }: { label: string; value: string; accent?: string }) => (
  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
    <p className={cn("text-base font-bold mt-0.5", accent ?? "text-foreground")}>{value}</p>
  </div>
);

const DateField = ({
  value,
  onChange,
  placeholder,
}: {
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  placeholder: string;
}) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" className={cn("justify-start text-left font-normal", !value && "text-muted-foreground")}>
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value ? format(value, "PPP") : <span>{placeholder}</span>}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className={cn("p-3 pointer-events-auto")} />
    </PopoverContent>
  </Popover>
);
