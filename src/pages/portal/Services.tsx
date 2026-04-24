import { useEffect, useMemo, useState } from "react";
import { Briefcase, Loader2, Plus, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ContractBanner } from "@/components/portal/ContractBanner";
import { useContractStatus } from "@/hooks/useContractStatus";

interface ClientServiceRow {
  id: string;
  status: string;
  progress_percentage: number;
  price_cents: number | null;
  quantity: number;
  vat_rate: number | null;
  currency: string | null;
  payment_status: "unpaid" | "paid" | "refunded" | "not_required";
  service_catalogue: { name: string; category: string } | null;
}

const statusColors: Record<string, string> = {
  requested: "bg-muted text-muted-foreground",
  in_review: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  awaiting_client: "bg-red-100 text-red-800",
  completed: "bg-emerald-100 text-emerald-800",
};

const statusLabels: Record<string, string> = {
  requested: "Requested",
  in_review: "In Review",
  in_progress: "In Progress",
  awaiting_client: "Awaiting Client",
  completed: "Completed",
};

const paymentBadge: Record<string, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-800" },
  unpaid: { label: "Unpaid", className: "bg-amber-100 text-amber-800" },
  refunded: { label: "Refunded", className: "bg-muted text-muted-foreground" },
  not_required: { label: "No charge", className: "bg-muted text-muted-foreground" },
};

const fmt = (cents: number, ccy: string) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: ccy || "EUR" }).format(cents / 100);

const Services = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isSigned, loading: contractLoading } = useContractStatus();
  const [services, setServices] = useState<ClientServiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let profileId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const fetchServices = async () => {
      const { data } = await supabase
        .from("client_services")
        .select("id, status, progress_percentage, price_cents, quantity, vat_rate, currency, payment_status, service_catalogue(name, category)")
        .eq("client_id", profileId!)
        .order("created_at", { ascending: false });
      if (data) setServices(data as any);
      setLoading(false);
    };

    const init = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!profile) { setLoading(false); return; }
      profileId = profile.id;
      await fetchServices();

      channel = supabase
        .channel(`client-services-${profileId}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "client_services", filter: `client_id=eq.${profileId}` },
          () => { fetchServices(); }
        )
        .subscribe();
    };

    init();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [user]);

  const payable = useMemo(
    () => services.filter((s) => s.payment_status === "unpaid" && (s.price_cents || 0) > 0),
    [services]
  );

  const totals = useMemo(() => {
    const currency = payable[0]?.currency || "EUR";
    const total = payable.reduce((sum, s) => sum + (s.price_cents || 0) * (s.quantity || 1), 0);
    return { currency, total, count: payable.length };
  }, [payable]);


  return (
    <div className="animate-in fade-in duration-500">
      {!contractLoading && !isSigned && <ContractBanner showModalOnLoad />}
      <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Services</h1>
          <p className="text-muted-foreground text-sm mt-1">View your active services, prices and pay individually or all at once.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" onClick={() => navigate("/portal/catalogue")}>
            <Plus className="h-4 w-4 mr-1" /> Add services
          </Button>
          {payable.length > 1 && (
            <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total outstanding ({totals.count})</p>
                <p className="text-lg font-semibold text-foreground">{fmt(totals.total, totals.currency)}</p>
              </div>
              <Button
                onClick={() => startCheckout(payable.map((s) => s.id), "all")}
                disabled={payingId !== null}
              >
                {payingId === "all" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CreditCard className="h-4 w-4 mr-1" />}
                Pay all
              </Button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-xl">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Briefcase className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">No active services</h2>
          <p className="text-sm text-muted-foreground max-w-sm text-center mb-4">
            Browse our catalogue and request the services you need.
          </p>
          <Button onClick={() => navigate("/portal/catalogue")}>
            <Plus className="h-4 w-4 mr-1" /> Browse catalogue
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {services.map((s) => {
            const ccy = s.currency || "EUR";
            const qty = s.quantity || 1;
            const unit = s.price_cents || 0;
            const lineTotal = unit * qty;
            const pay = paymentBadge[s.payment_status] || paymentBadge.unpaid;
            const canPay = s.payment_status === "unpaid" && unit > 0;
            return (
              <div key={s.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{s.service_catalogue?.name}</p>
                    <p className="text-xs text-muted-foreground">{s.service_catalogue?.category}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge className={`${statusColors[s.status] || ""} border-0 text-xs`}>
                        {statusLabels[s.status] || s.status}
                      </Badge>
                      <Badge className={`${pay.className} border-0 text-xs`}>{pay.label}</Badge>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {unit > 0 ? (
                      <>
                        <p className="text-base font-semibold text-foreground">{fmt(lineTotal, ccy)}</p>
                        {qty > 1 && (
                          <p className="text-xs text-muted-foreground">{fmt(unit, ccy)} × {qty}</p>
                        )}
                        {s.vat_rate != null && (
                          <p className="text-[11px] text-muted-foreground">incl. VAT {Number(s.vat_rate)}%</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">Price pending</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={s.progress_percentage} className="h-2 flex-1" />
                  <span className="text-sm font-medium text-muted-foreground">{s.progress_percentage}%</span>
                </div>
                {canPay && (
                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startCheckout([s.id], s.id)}
                      disabled={payingId !== null}
                    >
                      {payingId === s.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-1" />
                      )}
                      Pay this service
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>

      <EmbeddedCheckoutDialog
        invoiceId={activeInvoiceId}
        open={checkoutOpen}
        onOpenChange={(open) => {
          setCheckoutOpen(open);
          if (!open) setActiveInvoiceId(null);
        }}
      />
    </div>
  );
};

export default Services;
