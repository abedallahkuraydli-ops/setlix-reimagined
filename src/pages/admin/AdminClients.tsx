import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Search, Users, CheckCircle2, Briefcase, Trash2, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

type Lifecycle = "active" | "completed" | "deleted";

interface ClientRow {
  profileId: string;
  fullName: string;
  servicesCount: number;
  overallStatus: string;
  overallProgress: number;
  updatedAt: string;
  lifecycleStatus: Lifecycle;
  isSample: boolean;
}

const statusColors: Record<string, string> = {
  none: "bg-muted text-muted-foreground",
  requested: "bg-muted text-muted-foreground",
  in_review: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  awaiting_client: "bg-red-100 text-red-800",
  completed: "bg-emerald-100 text-emerald-800",
};

const statusLabels: Record<string, string> = {
  none: "No services",
  requested: "Requested",
  in_review: "In Review",
  in_progress: "In Progress",
  awaiting_client: "Awaiting Client",
  completed: "Completed",
};

const STATUS_PRIORITY: Record<string, number> = {
  awaiting_client: 5,
  in_progress: 4,
  in_review: 3,
  requested: 2,
  completed: 1,
};

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return days === 1 ? "Yesterday" : `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

const AdminClients = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Lifecycle>("active");

  useEffect(() => {
    const fetchClients = async () => {
      // Exclude staff (admin/superadmin) accounts from the clients list —
      // @setlix.pt signups are auto-promoted to superadmin and should never
      // appear here, even though a profile row is created for every auth user.
      const { data: staffRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "superadmin"]);
      const staffUserIds = new Set((staffRoles || []).map((r: any) => r.user_id));

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, created_at, updated_at, lifecycle_status")
        .order("created_at", { ascending: false });

      const { data: services } = await supabase
        .from("client_services")
        .select("status, progress_percentage, updated_at, client_id");

      if (!profiles) { setLoading(false); return; }

      const clientProfiles = profiles.filter((p: any) => !staffUserIds.has(p.user_id));

      const mapped: ClientRow[] = clientProfiles.map((p: any) => {
        const lifecycleStatus = (p.lifecycle_status || "active") as Lifecycle;
        const clientServices = (services || []).filter((s: any) => s.client_id === p.id);

        if (clientServices.length === 0) {
          return {
            profileId: p.id,
            fullName: p.full_name || "Unknown",
            servicesCount: 0,
            overallStatus: "none",
            overallProgress: 0,
            updatedAt: p.updated_at || p.created_at,
            lifecycleStatus,
          };
        }

        const overallStatus = clientServices
          .map((s: any) => s.status)
          .sort((a: string, b: string) => (STATUS_PRIORITY[b] || 0) - (STATUS_PRIORITY[a] || 0))[0];

        const overallProgress = Math.round(
          clientServices.reduce((sum: number, s: any) => sum + (s.progress_percentage || 0), 0) /
            clientServices.length
        );

        const latestUpdate = clientServices
          .map((s: any) => new Date(s.updated_at).getTime())
          .reduce((a: number, b: number) => Math.max(a, b), 0);

        return {
          profileId: p.id,
          fullName: p.full_name || "Unknown",
          servicesCount: clientServices.length,
          overallStatus,
          overallProgress,
          updatedAt: new Date(latestUpdate).toISOString(),
          lifecycleStatus,
        };
      });

      setRows(mapped);
      setLoading(false);
    };

    fetchClients();

    const channel = supabase
      .channel("admin-clients-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "client_services" }, () => fetchClients())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchClients())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateLifecycle = async (profileId: string, newStatus: Lifecycle, name: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ lifecycle_status: newStatus })
      .eq("id", profileId);
    if (error) {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
      return;
    }
    const labels: Record<Lifecycle, string> = {
      active: "moved to In the Works",
      completed: "marked as Completed",
      deleted: "moved to Deleted",
    };
    toast({ title: `${name} ${labels[newStatus]}` });
  };

  const filtered = rows.filter(
    (r) =>
      r.lifecycleStatus === tab &&
      r.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = rows.filter((r) => r.lifecycleStatus === "active").length;
  const completedCount = rows.filter((r) => r.lifecycleStatus === "completed").length;
  const deletedCount = rows.filter((r) => r.lifecycleStatus === "deleted").length;

  const renderStatusMenu = (row: ClientRow) => {
    const options: { value: Lifecycle; label: string }[] = [
      { value: "active", label: "In Progress (In the Works)" },
      { value: "completed", label: "Completed" },
      { value: "deleted", label: "Deleted" },
    ];
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuLabel>Change status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options
            .filter((o) => o.value !== row.lifecycleStatus)
            .map((o) => (
              <DropdownMenuItem
                key={o.value}
                onClick={(e) => {
                  e.stopPropagation();
                  updateLifecycle(row.profileId, o.value, row.fullName);
                }}
                className={o.value === "deleted" ? "text-destructive focus:text-destructive" : ""}
              >
                {o.label}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const renderTable = () => (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            No {tab === "active" ? "active" : tab === "completed" ? "completed" : "deleted"} clients
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm text-center">
            {tab === "active" && "Active clients will appear here once they complete onboarding."}
            {tab === "completed" && "Mark a client as completed to move them here."}
            {tab === "deleted" && "Clients you delete will appear here. You can restore them anytime."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-4 font-semibold text-muted-foreground">Client Name</th>
                <th className="text-left p-4 font-semibold text-muted-foreground">Status</th>
                <th className="text-left p-4 font-semibold text-muted-foreground min-w-[180px]">Progress</th>
                <th className="text-left p-4 font-semibold text-muted-foreground">Last Updated</th>
                <th className="w-12 p-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((row) => (
                <tr
                  key={row.profileId}
                  onClick={() => navigate(`/admin/clients/${row.profileId}`)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="p-4 font-medium text-foreground">
                    <div>{row.fullName}</div>
                    {row.servicesCount > 0 && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {row.servicesCount} service{row.servicesCount !== 1 ? "s" : ""}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <Badge className={`${statusColors[row.overallStatus]} border-0 text-xs`}>
                      {statusLabels[row.overallStatus] || row.overallStatus}
                    </Badge>
                  </td>
                  <td className="p-4">
                    {row.servicesCount > 0 ? (
                      <div className="flex items-center gap-2">
                        <Progress value={row.overallProgress} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-10 text-right">{row.overallProgress}%</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-4 text-muted-foreground text-xs">{formatRelative(row.updatedAt)}</td>
                  <td className="p-4 text-right">{renderStatusMenu(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <Users className="inline h-4 w-4 mr-1" />
            {activeCount + completedCount + deletedCount} total · {activeCount} in the works · {completedCount} completed · {deletedCount} deleted
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Lifecycle)} className="mb-4">
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <Briefcase className="h-4 w-4" />
            In the Works
            <Badge variant="secondary" className="ml-1">{activeCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Completed
            <Badge variant="secondary" className="ml-1">{completedCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="deleted" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Deleted
            <Badge variant="secondary" className="ml-1">{deletedCount}</Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">{renderTable()}</TabsContent>
        <TabsContent value="completed" className="mt-4">{renderTable()}</TabsContent>
        <TabsContent value="deleted" className="mt-4">{renderTable()}</TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminClients;
