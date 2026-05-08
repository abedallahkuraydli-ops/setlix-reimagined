import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp } from "lucide-react";

interface Props {
  clientId: string;
}

interface MonthRow {
  month: string;
  invoiced: number;
  received: number;
}

const fmtEur = (cents: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(cents / 100);

const monthKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

export const ClientMonthlyTransactions = ({ clientId }: Props) => {
  const [rows, setRows] = useState<MonthRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [{ data: invs }, { data: pays }] = await Promise.all([
        supabase
          .from("invoices")
          .select("amount_cents, created_at")
          .eq("client_id", clientId),
        supabase
          .from("client_payments")
          .select("amount_cents, paid_at")
          .eq("client_id", clientId),
      ]);

      const map = new Map<string, MonthRow>();
      (invs || []).forEach((i: any) => {
        const k = monthKey(i.created_at);
        const r = map.get(k) || { month: k, invoiced: 0, received: 0 };
        r.invoiced += Number(i.amount_cents || 0);
        map.set(k, r);
      });
      (pays || []).forEach((p: any) => {
        const k = monthKey(p.paid_at);
        const r = map.get(k) || { month: k, invoiced: 0, received: 0 };
        r.received += Number(p.amount_cents || 0);
        map.set(k, r);
      });

      const list = Array.from(map.values()).sort((a, b) => (a.month < b.month ? 1 : -1));
      if (!cancelled) {
        setRows(list);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return (
    <section className="bg-card border border-border rounded-xl p-6 space-y-3">
      <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" /> Monthly transactions
      </h2>
      <div className="overflow-x-auto -mx-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-border bg-muted/30">
              <th className="text-left p-4 font-semibold text-muted-foreground">Month</th>
              <th className="text-right p-4 font-semibold text-muted-foreground">Invoiced</th>
              <th className="text-right p-4 font-semibold text-muted-foreground">Received</th>
              <th className="text-right p-4 font-semibold text-muted-foreground">Outstanding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="p-6 text-center text-muted-foreground text-xs">
                No invoices or payments recorded yet.
              </td></tr>
            ) : (
              rows.map((m) => {
                const outstanding = Math.max(0, m.invoiced - m.received);
                const monthLabel = new Date(m.month).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
                return (
                  <tr key={m.month}>
                    <td className="p-4 text-foreground">{monthLabel}</td>
                    <td className="p-4 text-right tabular-nums text-foreground">{fmtEur(m.invoiced)}</td>
                    <td className="p-4 text-right tabular-nums text-emerald-700">{fmtEur(m.received)}</td>
                    <td className="p-4 text-right tabular-nums text-muted-foreground">{fmtEur(outstanding)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ClientMonthlyTransactions;
