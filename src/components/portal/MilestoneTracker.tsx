import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Circle, Loader2, Flag } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export interface Milestone {
  id: string;
  title: string;
  description: string | null;
  position: number;
  status: "pending" | "active" | "completed";
  completed_at: string | null;
  categories: string[];
}

interface Props {
  clientId: string;
  compact?: boolean;
  services?: { milestone_id: string | null; status: string }[];
}

export const MilestoneTracker = ({ clientId, compact = false, services }: Props) => {
  const [milestones, setMilestones] = useState<Milestone[] | null>(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("client_milestones")
        .select("id, title, description, position, status, completed_at, categories")
        .eq("client_id", clientId)
        .order("position");
      if (!cancelled) setMilestones((data ?? []) as Milestone[]);
    };
    load();
    const ch = supabase
      .channel(`milestones-${clientId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "client_milestones", filter: `client_id=eq.${clientId}` },
        load,
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [clientId]);

  if (milestones === null) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (milestones.length === 0) return null;

  const completed = milestones.filter((m) => m.status === "completed").length;
  const total = milestones.length;
  const percent = Math.round((completed / total) * 100);
  const active = milestones.find((m) => m.status === "active") ?? milestones.find((m) => m.status !== "completed");

  if (compact) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Flag className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Your progress</h2>
          <span className="ml-auto text-xs text-muted-foreground font-medium">
            {completed} of {total} milestones
          </span>
        </div>
        <Progress value={percent} className="h-2 mb-3" />
        {active && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">
              Current milestone
            </p>
            <p className="text-sm font-semibold text-foreground">{active.title}</p>
            {active.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{active.description}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  const countFor = (mid: string) => {
    if (!services) return null;
    const rel = services.filter((s) => s.milestone_id === mid);
    if (rel.length === 0) return null;
    const done = rel.filter((s) => s.status === "completed").length;
    return { done, total: rel.length };
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Flag className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Milestone tracker</h2>
        <span className="ml-auto text-xs text-muted-foreground font-medium">
          {completed} of {total} complete
        </span>
      </div>
      <Progress value={percent} className="h-2 mb-6" />

      <ol className="relative border-l border-border ml-3 space-y-6">
        {milestones.map((m) => {
          const isDone = m.status === "completed";
          const isActive = m.status === "active";
          const c = countFor(m.id);
          return (
            <li key={m.id} className="pl-6 relative">
              <span
                className={`absolute -left-[13px] top-0 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                  isDone
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : isActive
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-card border-border text-muted-foreground"
                }`}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
              </span>
              <div className="flex flex-wrap items-baseline gap-2">
                <p
                  className={`text-sm font-semibold ${
                    isDone
                      ? "text-muted-foreground line-through"
                      : isActive
                        ? "text-foreground"
                        : "text-foreground/70"
                  }`}
                >
                  {m.title}
                </p>
                {isActive && (
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    In progress
                  </span>
                )}
                {isDone && m.completed_at && (
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(m.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
              {m.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
              )}
              {c && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {c.done}/{c.total} services completed
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default MilestoneTracker;
