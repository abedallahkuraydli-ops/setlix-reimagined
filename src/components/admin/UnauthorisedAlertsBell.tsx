import { useEffect, useState } from "react";
import { ShieldAlert, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Attempt {
  id: string;
  admin_user_id: string;
  client_profile_id: string | null;
  document_name: string | null;
  attempted_at: string;
  acknowledged: boolean;
}

interface AttemptWithDetails extends Attempt {
  admin_email?: string | null;
  client_name?: string | null;
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function UnauthorisedAlertsBell() {
  const { isSuperadmin } = useRole();
  const [attempts, setAttempts] = useState<AttemptWithDetails[]>([]);

  useEffect(() => {
    if (!isSuperadmin) return;
    const load = async () => {
      const { data } = await supabase
        .from("unauthorised_download_attempts")
        .select("*")
        .eq("acknowledged", false)
        .order("attempted_at", { ascending: false })
        .limit(20);
      const rows = (data ?? []) as Attempt[];
      const clientIds = Array.from(new Set(rows.map((r) => r.client_profile_id).filter(Boolean) as string[]));
      const profiles = clientIds.length
        ? (await supabase.from("profiles").select("id, full_name, first_name, last_name").in("id", clientIds)).data ?? []
        : [];
      const profMap = new Map(profiles.map((p: any) => [p.id, p.full_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()]));
      setAttempts(rows.map((r) => ({ ...r, client_name: r.client_profile_id ? profMap.get(r.client_profile_id) ?? "Unknown" : "Unknown" })));
    };
    load();

    const channel = supabase
      .channel("unauth-attempts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "unauthorised_download_attempts" },
        () => load(),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isSuperadmin]);

  const dismiss = async (id: string) => {
    await supabase.from("unauthorised_download_attempts").update({ acknowledged: true }).eq("id", id);
    setAttempts((s) => s.filter((a) => a.id !== id));
  };

  const dismissAll = async () => {
    const ids = attempts.map((a) => a.id);
    if (ids.length === 0) return;
    await supabase.from("unauthorised_download_attempts").update({ acknowledged: true }).in("id", ids);
    setAttempts([]);
  };

  if (!isSuperadmin) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Security alerts">
          <ShieldAlert className="h-5 w-5" />
          {attempts.length > 0 && (
            <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
              {attempts.length > 9 ? "9+" : attempts.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="p-3 border-b flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold">Unauthorised download attempts</h4>
            <p className="text-[11px] text-muted-foreground">{attempts.length} pending</p>
          </div>
          {attempts.length > 0 && (
            <Button size="sm" variant="ghost" onClick={dismissAll}>Dismiss all</Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {attempts.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">No pending alerts.</div>
          ) : attempts.map((a) => (
            <div key={a.id} className="p-3 border-b last:border-0 flex items-start gap-2 hover:bg-muted/30">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{a.document_name ?? "Unknown document"}</div>
                <div className="text-[11px] text-muted-foreground">
                  Client: {a.client_name ?? "—"} · {fmtTime(a.attempted_at)}
                </div>
              </div>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => dismiss(a.id)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
