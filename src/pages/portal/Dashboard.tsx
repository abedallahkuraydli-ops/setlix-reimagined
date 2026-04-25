import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Briefcase,
  BookOpen,
  FileText,
  HelpCircle,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  Wallet,
  CalendarClock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NotificationsBanner } from "@/components/portal/NotificationsBanner";
import {
  applyDueLateFees,
  computeBilling,
  formatMoney,
  loadBillingForClient,
  type BillingRow,
  type BillingSummary,
} from "@/lib/billing";

const ACTIVE_STATUSES = ["requested", "in_review", "in_progress"] as const;

type DocRequest = {
  id: string;
  document_name: string;
  description: string | null;
  created_at: string;
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [nif, setNif] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [activeCount, setActiveCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState<DocRequest[]>([]);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [billingNextDue, setBillingNextDue] = useState<string | null>(null);

  // Load profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("id, first_name, nif")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setProfileId(data.id);
        if (data.first_name) setFirstName(data.first_name);
        if (data.nif) setNif(data.nif);
      });
  }, [user]);

  // Load counts + pending document requests + billing
  useEffect(() => {
    if (!user || !profileId) return;
    let cancelled = false;

    const load = async () => {
      const [services, docs, requests, billingData] = await Promise.all([
        supabase
          .from("client_services")
          .select("status")
          .eq("client_id", profileId),
        supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("document_requests")
          .select("id, document_name, description, created_at, uploaded_at")
          .eq("client_id", profileId)
          .is("uploaded_at", null)
          .order("created_at", { ascending: false }),
        loadBillingForClient(profileId),
      ]);

      if (cancelled) return;

      const statuses = (services.data ?? []).map((s) => s.status as string);
      setActiveCount(statuses.filter((s) => (ACTIVE_STATUSES as readonly string[]).includes(s)).length);
      setCompletedCount(statuses.filter((s) => s === "completed").length);
      setDocumentsCount(docs.count ?? 0);
      setPendingRequests((requests.data ?? []) as DocRequest[]);

      // Auto-apply elapsed late-fee periods (no-op for clients who lack RLS update;
      // RLS prevents it for clients, so this only succeeds for admins viewing this UI.
      // The compute still reflects whatever is stored.)
      let billing: BillingRow | null = billingData.billing;
      if (billing) {
        const updated = await applyDueLateFees(profileId, billing).catch(() => null);
        if (updated) billing = updated;
      }
      setBillingNextDue(billing?.next_payment_due_at ?? null);
      setBillingSummary(computeBilling(billingData.services, billing, billingData.payments));
    };

    load();

    // Realtime updates
    const channel = supabase
      .channel(`portal-dashboard-${profileId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "client_services", filter: `client_id=eq.${profileId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "documents", filter: `user_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "document_requests", filter: `client_id=eq.${profileId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "client_billing", filter: `client_id=eq.${profileId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "client_payments", filter: `client_id=eq.${profileId}` }, load)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, profileId]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  const stats = [
    { label: "Active Services", value: String(activeCount), icon: Briefcase, color: "text-primary", path: "/portal/services" },
    { label: "Documents", value: String(documentsCount), icon: FileText, color: "text-accent", path: "/portal/documents" },
    { label: "Pending Requests", value: String(pendingRequests.length), icon: Clock, color: "text-amber-600", path: "/portal/documents" },
    { label: "Completed", value: String(completedCount), icon: CheckCircle2, color: "text-emerald-600", path: "/portal/services" },
  ];

  const quickActions = [
    { label: "My Services", description: "View and manage your active services", icon: Briefcase, path: "/portal/services" },
    { label: "Add Services", description: "Browse our catalogue and request more", icon: BookOpen, path: "/portal/catalogue" },
    { label: "Documents", description: "Access your files and agreements", icon: FileText, path: "/portal/documents" },
    { label: "Get Support", description: "Contact our team for assistance", icon: HelpCircle, path: "/portal/support" },
  ];

  const formatRelative = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
      {/* Welcome banner */}
      <div className="rounded-xl bg-primary p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
          <div className="w-full h-full border-[40px] border-primary-foreground rotate-45 translate-x-1/3 -translate-y-1/4" />
        </div>
        <div className="relative z-10">
          <p className="text-primary-foreground/70 text-sm font-medium mb-1">{greeting()},</p>
          <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-2">
            {firstName || "Welcome back"}
          </h1>
          {nif && (
            <p className="text-primary-foreground/80 text-xs font-medium mb-2 tracking-wide">NIF: {nif}</p>
          )}
          <p className="text-primary-foreground/60 text-sm max-w-lg">
            Your client portal is ready. Here you can manage your services, access documents, and get support — all in one place.
          </p>
        </div>
      </div>

      {/* Live notifications from admin actions */}
      <NotificationsBanner />


      {pendingRequests.length > 0 && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-100 dark:bg-amber-900/40 p-2 mt-0.5">
              <AlertCircle className="h-5 w-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm mb-1">
                Action required — {pendingRequests.length} document{pendingRequests.length === 1 ? "" : "s"} requested
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Your administrator has requested the following document{pendingRequests.length === 1 ? "" : "s"}. Please upload them to proceed.
              </p>
              <ul className="space-y-2 mb-3">
                {pendingRequests.slice(0, 4).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 text-sm bg-card border border-border rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{r.document_name}</p>
                      {r.description && (
                        <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatRelative(r.created_at)}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate("/portal/documents")}
                className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
              >
                <Upload className="h-3.5 w-3.5" /> Upload documents <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment reminder banner (3/2/1/0 days before due, or overdue) */}
      {billingSummary && billingSummary.remainingCents > 0 && billingSummary.daysUntilDue !== null && billingSummary.daysUntilDue <= 3 && (
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${
          billingSummary.isOverdue
            ? "border-destructive/40 bg-destructive/10"
            : billingSummary.daysUntilDue === 0
              ? "border-amber-400/60 bg-amber-50 dark:bg-amber-950/20"
              : "border-primary/30 bg-primary/5"
        }`}>
          <CalendarClock className={`h-5 w-5 mt-0.5 shrink-0 ${billingSummary.isOverdue ? "text-destructive" : "text-primary"}`} />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-foreground">
              {billingSummary.isOverdue
                ? `Payment overdue by ${Math.abs(billingSummary.daysUntilDue)} day${Math.abs(billingSummary.daysUntilDue) === 1 ? "" : "s"}`
                : billingSummary.daysUntilDue === 0
                  ? "Payment is due today"
                  : `Payment due in ${billingSummary.daysUntilDue} day${billingSummary.daysUntilDue === 1 ? "" : "s"}`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatMoney(billingSummary.remainingCents, billingSummary.currency)} remaining
              {billingNextDue ? ` • Due ${new Date(billingNextDue).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
              {billingSummary.lateFeeCents > 0 ? ` • Late fee applied: ${formatMoney(billingSummary.lateFeeCents, billingSummary.currency)}` : ""}
            </p>
          </div>
        </div>
      )}

      {/* Billing summary card */}
      {billingSummary && billingSummary.grandTotalCents > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Billing summary</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Total price</p>
              {billingSummary.hasDiscount ? (
                <div className="mt-0.5">
                  <p className="text-xs text-muted-foreground line-through">
                    {formatMoney(billingSummary.servicesTotalCents, billingSummary.currency)}
                  </p>
                  <p className="text-lg font-bold text-emerald-600">
                    {formatMoney(billingSummary.baseTotalCents, billingSummary.currency)}
                  </p>
                </div>
              ) : (
                <p className="text-lg font-bold text-foreground mt-0.5">
                  {formatMoney(billingSummary.baseTotalCents, billingSummary.currency)}
                </p>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Paid</p>
              <p className="text-lg font-bold text-foreground mt-0.5">{formatMoney(billingSummary.paidCents, billingSummary.currency)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Remaining</p>
              <p className="text-lg font-bold text-primary mt-0.5">{formatMoney(billingSummary.remainingCents, billingSummary.currency)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Next payment</p>
              {billingNextDue ? (
                <>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {new Date(billingNextDue).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  {billingSummary.daysUntilDue !== null && (
                    <p className={`text-xs mt-0.5 font-medium ${billingSummary.isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                      {billingSummary.isOverdue
                        ? `Overdue by ${Math.abs(billingSummary.daysUntilDue)}d`
                        : billingSummary.daysUntilDue === 0
                          ? "Due today"
                          : `${billingSummary.daysUntilDue} day${billingSummary.daysUntilDue === 1 ? "" : "s"} left`}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground mt-0.5">Not scheduled</p>
              )}
            </div>
          </div>
          {billingSummary.lateFeeCents > 0 && (
            <p className="text-xs text-destructive mt-3">
              Includes late payment fee of {formatMoney(billingSummary.lateFeeCents, billingSummary.currency)}.
            </p>
          )}
          {billingSummary.remainingCents > 0 && (
            <div className="mt-4 flex items-center justify-end">
              <button
                onClick={() => navigate("/portal/payments")}
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 hover:bg-primary/90 transition-colors"
              >
                Pay now <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <button
            key={stat.label}
            onClick={() => navigate(stat.path)}
            className="text-left bg-card border border-border rounded-xl p-4 md:p-5 space-y-2 hover:border-primary/30 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="group text-left bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all duration-200"
              >
                <action.icon className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-foreground text-sm mb-1">{action.label}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>
                <div className="flex items-center gap-1 mt-3 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Open <ArrowRight className="h-3 w-3" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* To-do / pending */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">To-Do</h2>
          <div className="bg-card border border-border rounded-xl p-4">
            {pendingRequests.length === 0 ? (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-muted p-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium">You're all caught up</p>
                  <p className="text-xs text-muted-foreground mt-0.5">No pending requests from your administrator.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.slice(0, 5).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => navigate("/portal/documents")}
                    className="w-full text-left flex items-start gap-3 hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                  >
                    <div className="mt-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 p-1.5">
                      <Upload className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-medium truncate">Upload: {r.document_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatRelative(r.created_at)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
