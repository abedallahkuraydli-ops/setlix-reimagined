import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CheckCircle2,
  Trash2,
  Briefcase,
  Calendar,
  MessageSquare,
  Clock,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type ServiceStatus =
  | "requested"
  | "in_review"
  | "in_progress"
  | "awaiting_client"
  | "completed";

const STATUS_LABEL: Record<string, string> = {
  requested: "Requested",
  in_review: "In Review",
  in_progress: "In Progress",
  awaiting_client: "Awaiting Client",
  completed: "Completed",
};

const STATUS_FLOW: ServiceStatus[] = [
  "requested",
  "in_review",
  "in_progress",
  "awaiting_client",
  "completed",
];

const formatDuration = (ms: number) => {
  if (!isFinite(ms) || ms <= 0) return "—";
  const days = ms / 86_400_000;
  if (days >= 1) return `${days.toFixed(1)}d`;
  const hours = ms / 3_600_000;
  if (hours >= 1) return `${hours.toFixed(1)}h`;
  const mins = ms / 60_000;
  return `${Math.max(1, Math.round(mins))}m`;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [clientCounts, setClientCounts] = useState({ active: 0, completed: 0, deleted: 0 });
  const [transitions, setTransitions] = useState<
    { from: ServiceStatus; to: ServiceStatus; avgMs: number; count: number }[]
  >([]);
  const [upcomingAppts, setUpcomingAppts] = useState(0);
  const [pendingAppts, setPendingAppts] = useState(0);
  const [unreadConversations, setUnreadConversations] = useState(0);
  const [unansweredConversations, setUnansweredConversations] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState<
    { month: string; invoiced: number; received: number }[]
  >([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      // 1) Client lifecycle counts (excluding sample clients and staff accounts)
      const { data: staffRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "superadmin"]);
      const staffUserIds = new Set((staffRoles || []).map((r: any) => r.user_id));

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, lifecycle_status, is_sample");

      const counts = { active: 0, completed: 0, deleted: 0 };
      (profiles || []).forEach((p: any) => {
        if (p.is_sample) return;
        if (staffUserIds.has(p.user_id)) return;
        const ls = (p.lifecycle_status || "active") as keyof typeof counts;
        if (counts[ls] !== undefined) counts[ls] += 1;
      });

      // 2) Service status transition durations.
      //    We approximate per-service per-status durations using the audit log
      //    on client_services is not available, so we use created_at -> updated_at
      //    to estimate time spent until reaching the current status, then bucket
      //    transitions by ordered status flow.
      const { data: services } = await supabase
        .from("client_services")
        .select("status, created_at, updated_at");

      // Aggregate avg ms between consecutive statuses in STATUS_FLOW.
      // For each service at status S, treat (updated_at - created_at) as the time
      // it took to reach S from "requested". Distribute evenly across hops.
      const transAcc: Record<string, { totalMs: number; count: number }> = {};
      (services || []).forEach((s: any) => {
        const idx = STATUS_FLOW.indexOf(s.status as ServiceStatus);
        if (idx <= 0) return;
        const created = new Date(s.created_at).getTime();
        const updated = new Date(s.updated_at).getTime();
        const total = Math.max(0, updated - created);
        if (total <= 0) return;
        const perHop = total / idx;
        for (let i = 0; i < idx; i++) {
          const key = `${STATUS_FLOW[i]}->${STATUS_FLOW[i + 1]}`;
          if (!transAcc[key]) transAcc[key] = { totalMs: 0, count: 0 };
          transAcc[key].totalMs += perHop;
          transAcc[key].count += 1;
        }
      });

      const trans = STATUS_FLOW.slice(0, -1).map((from, i) => {
        const to = STATUS_FLOW[i + 1];
        const acc = transAcc[`${from}->${to}`];
        return {
          from,
          to,
          avgMs: acc && acc.count > 0 ? acc.totalMs / acc.count : 0,
          count: acc?.count || 0,
        };
      });

      // 3) Appointments
      const nowIso = new Date().toISOString();
      const { count: upcoming } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("status", "confirmed")
        .gte("slot_start", nowIso);
      const { count: pending } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      // 4) Messages: conversations with unread client->admin messages,
      //    and conversations whose latest message is from the client (unanswered).
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, client_id, last_message_at");
      const convIds = (convs || []).map((c: any) => c.id);

      let unreadConvs = 0;
      let unansweredConvs = 0;

      if (convIds.length > 0) {
        const { data: msgs } = await supabase
          .from("messages")
          .select("conversation_id, sender_id, read, created_at")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false });

        const byConv = new Map<
          string,
          { sender_id: string; read: boolean; created_at: string }[]
        >();
        (msgs || []).forEach((m: any) => {
          const arr = byConv.get(m.conversation_id) || [];
          arr.push(m);
          byConv.set(m.conversation_id, arr);
        });

        for (const c of convs as any[]) {
          const list = byConv.get(c.id) || [];
          const hasUnreadFromClient = list.some(
            (m) => m.sender_id === c.client_id && !m.read,
          );
          if (hasUnreadFromClient) unreadConvs += 1;
          const latest = list[0];
          if (latest && latest.sender_id === c.client_id) unansweredConvs += 1;
        }
      }

      // 5) Monthly revenue: invoices issued + payments received (sample clients excluded by view)
      const { data: revenueRows } = await supabase
        .from("admin_monthly_revenue" as any)
        .select("month, invoiced_cents, received_cents")
        .order("month", { ascending: false })
        .limit(12);
      const revenue = ((revenueRows as any[]) || []).map((r) => ({
        month: r.month,
        invoiced: Number(r.invoiced_cents || 0),
        received: Number(r.received_cents || 0),
      }));

      if (cancelled) return;
      setClientCounts(counts);
      setTransitions(trans);
      setUpcomingAppts(upcoming ?? 0);
      setPendingAppts(pending ?? 0);
      setUnreadConversations(unreadConvs);
      setUnansweredConversations(unansweredConvs);
      setMonthlyRevenue(revenue);
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "client_services" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, load)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const totalClients = clientCounts.active + clientCounts.completed + clientCounts.deleted;

  const clientCards = [
    {
      label: "In the Works",
      value: clientCounts.active,
      icon: Briefcase,
      tone: "text-amber-600 bg-amber-100",
    },
    {
      label: "Completed",
      value: clientCounts.completed,
      icon: CheckCircle2,
      tone: "text-emerald-600 bg-emerald-100",
    },
    {
      label: "Deleted",
      value: clientCounts.deleted,
      icon: Trash2,
      tone: "text-red-600 bg-red-100",
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of clients, service flow, appointments and messages.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin/clients")}>
          View clients <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Client lifecycle */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Clients ({totalClients})
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {clientCards.map((c) => (
            <div
              key={c.label}
              className="bg-card border border-border rounded-xl p-5 flex items-center gap-4"
            >
              <div className={`rounded-lg p-3 ${c.tone}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? "—" : c.value}
                </p>
                <p className="text-xs text-muted-foreground font-medium">{c.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Service status transitions */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Average time between service statuses
        </h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-semibold text-muted-foreground">From</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">To</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Average duration</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Sample size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transitions.map((t) => (
                  <tr key={`${t.from}-${t.to}`}>
                    <td className="p-4 text-foreground">{STATUS_LABEL[t.from]}</td>
                    <td className="p-4 text-foreground">
                      <span className="inline-flex items-center gap-2">
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        {STATUS_LABEL[t.to]}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-foreground">
                      {loading ? "—" : formatDuration(t.avgMs)}
                    </td>
                    <td className="p-4 text-muted-foreground">{t.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-3 text-xs text-muted-foreground border-t border-border bg-muted/20">
            Estimated from each service's elapsed time between creation and current status, distributed across the standard flow.
          </p>
        </div>
      </section>

      {/* Monthly revenue */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Monthly revenue
        </h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-semibold text-muted-foreground">Month</th>
                  <th className="text-right p-4 font-semibold text-muted-foreground">Invoiced</th>
                  <th className="text-right p-4 font-semibold text-muted-foreground">Received</th>
                  <th className="text-right p-4 font-semibold text-muted-foreground">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Loading…</td></tr>
                ) : monthlyRevenue.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-center text-muted-foreground text-xs">
                    No invoices or payments recorded yet.
                  </td></tr>
                ) : (
                  monthlyRevenue.map((m) => {
                    const outstanding = Math.max(0, m.invoiced - m.received);
                    const fmtEur = (cents: number) =>
                      new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(cents / 100);
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
          <p className="px-4 py-3 text-xs text-muted-foreground border-t border-border bg-muted/20">
            Last 12 months. Invoiced = sum of issued invoices; Received = recorded client payments. Sample clients excluded.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate("/admin/appointments")}
          className="text-left bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg p-3 bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-foreground">Appointments</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-foreground">
                {loading ? "—" : upcomingAppts}
              </p>
              <p className="text-xs text-muted-foreground">Upcoming confirmed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {loading ? "—" : pendingAppts}
              </p>
              <p className="text-xs text-muted-foreground">Pending requests</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate("/admin/messages")}
          className="text-left bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg p-3 bg-primary/10 text-primary">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-foreground">Messages</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-foreground">
                {loading ? "—" : unreadConversations}
              </p>
              <p className="text-xs text-muted-foreground">Unread conversations</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {loading ? "—" : unansweredConversations}
              </p>
              <p className="text-xs text-muted-foreground">Awaiting your reply</p>
            </div>
          </div>
        </button>
      </section>
    </div>
  );
};

export default AdminDashboard;
