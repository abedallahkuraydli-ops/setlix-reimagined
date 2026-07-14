import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, Loader2, Flag } from "lucide-react";

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
  const activeIdx = milestones.findIndex((m) => m.status === "active");

  // Progress: full for completed segments, half for the segment leading into the active milestone
  const progressPercent = (() => {
    if (total <= 1) return completed === total ? 100 : 0;
    const segments = total - 1;
    let filled = 0;
    for (let i = 0; i < segments; i++) {
      const left = milestones[i];
      const right = milestones[i + 1];
      if (left.status === "completed" && right.status === "completed") filled += 1;
      else if (left.status === "completed" && right.status === "active") filled += 0.5;
      else if (left.status === "completed") filled += 0.5;
    }
    return Math.round((filled / segments) * 100);
  })();

  const countFor = (mid: string) => {
    if (!services) return null;
    const rel = services.filter((s) => s.milestone_id === mid);
    if (rel.length === 0) return null;
    const done = rel.filter((s) => s.status === "completed").length;
    return { done, total: rel.length };
  };

  const dotSize = compact ? "h-7 w-7" : "h-9 w-9";
  const iconSize = compact ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className="rounded-xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-center gap-2 mb-5">
        <Flag className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">
          {compact ? "Your progress" : "Milestone tracker"}
        </h2>
        <span className="ml-auto text-xs text-muted-foreground font-medium">
          {completed} of {total} complete
        </span>
      </div>

      <div className="overflow-x-auto -mx-2 px-2 pt-2 pb-2">
        <div
          className="relative flex items-start"
          style={{ minWidth: `${total * (compact ? 120 : 160)}px` }}
        >
          {/* Track line (background) */}
          <div
            className="absolute bg-border"
            style={{
              top: compact ? "15px" : "19px",
              height: "2px",
              left: `${100 / (total * 2)}%`,
              right: `${100 / (total * 2)}%`,
            }}
          />
          {/* Track line (progress) */}
          <div
            className="absolute bg-primary transition-all duration-500"
            style={{
              top: compact ? "15px" : "19px",
              height: "2px",
              left: `${100 / (total * 2)}%`,
              width: `${((total - 1) / total) * progressPercent}%`,
            }}
          />

          {milestones.map((m, idx) => {
            const isDone = m.status === "completed";
            const isActive = m.status === "active" || (activeIdx === -1 && idx === completed);
            const c = countFor(m.id);
            return (
              <div
                key={m.id}
                className="relative flex flex-col items-center text-center flex-1 min-w-0 px-2"
              >

                <div
                  className={`${dotSize} rounded-full flex items-center justify-center border-2 z-10 shrink-0 transition-colors ${
                    isDone
                      ? "bg-primary border-primary text-primary-foreground"
                      : isActive
                        ? "bg-card border-primary text-primary ring-4 ring-primary/15"
                        : "bg-card border-border text-muted-foreground"
                  }`}
                >
                  {isDone ? (
                    <Check className={iconSize} />
                  ) : (
                    <span className={`text-xs font-semibold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                      {idx + 1}
                    </span>
                  )}
                </div>
                <p
                  className={`mt-2 text-xs font-semibold leading-tight line-clamp-2 ${
                    isDone
                      ? "text-foreground"
                      : isActive
                        ? "text-primary"
                        : "text-muted-foreground"
                  }`}
                >
                  {m.title}
                </p>
                {!compact && isActive && (
                  <span className="mt-1 text-[10px] uppercase tracking-wide font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    In progress
                  </span>
                )}
                {!compact && c && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {c.done}/{c.total} services
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MilestoneTracker;
