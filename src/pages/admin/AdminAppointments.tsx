import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatLisbonDate, formatLisbonTime, formatLisbonRange, lisbonDateKey } from "@/lib/appointments";
import { cn } from "@/lib/utils";

interface Appt {
  id: string;
  slot_start: string;
  slot_end: string;
  status: "pending" | "confirmed" | "cancelled";
  notes: string | null;
  google_event_id: string | null;
  client_id: string;
  client?: {
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
    user_id: string;
  };
  email?: string;
}

const statusStyles: Record<Appt["status"], string> = {
  confirmed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  const r = new Date(d);
  r.setDate(d.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

const AdminAppointments = () => {
  const [appts, setAppts] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date()));
  const [selected, setSelected] = useState<Appt | null>(null);
  const [view, setView] = useState<"week" | "list">("week");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select("id, slot_start, slot_end, status, notes, google_event_id, client_id, client:profiles!appointments_client_id_fkey(full_name, first_name, last_name, phone_number, user_id)")
      .order("slot_start", { ascending: true });
    setAppts((data ?? []) as unknown as Appt[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-appointments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const weekEnd = useMemo(() => {
    const e = new Date(weekStart);
    e.setDate(e.getDate() + 7);
    return e;
  }, [weekStart]);

  const weekAppts = useMemo(() => {
    return appts.filter((a) => {
      const s = new Date(a.slot_start);
      return s >= weekStart && s < weekEnd && a.status !== "cancelled";
    });
  }, [appts, weekStart, weekEnd]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const apptsByDay = useMemo(() => {
    const map = new Map<string, Appt[]>();
    for (const a of weekAppts) {
      const key = lisbonDateKey(new Date(a.slot_start));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [weekAppts]);

  const handleCancel = async (appt: Appt) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appt.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Appointment cancelled");
    setSelected(null);
    // TODO: also delete Google Calendar event when wired up
  };

  const clientName = (a: Appt) =>
    a.client?.full_name ||
    [a.client?.first_name, a.client?.last_name].filter(Boolean).join(" ") ||
    "Unknown client";

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Appointments</h1>
        <p className="text-sm text-muted-foreground">
          Manage client meetings — all times shown in Lisbon timezone.
        </p>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as "week" | "list")}>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <TabsList>
            <TabsTrigger value="week">Week view</TabsTrigger>
            <TabsTrigger value="list">List view</TabsTrigger>
          </TabsList>
          {view === "week" && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() - 7);
                  setWeekStart(d);
                }}
              >
                ←
              </Button>
              <span className="text-sm font-medium min-w-[180px] text-center">
                {formatLisbonDate(weekStart.toISOString())} →{" "}
                {formatLisbonDate(new Date(weekEnd.getTime() - 86400000).toISOString())}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() + 7);
                  setWeekStart(d);
                }}
              >
                →
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
                Today
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="week">
          <div className="grid grid-cols-7 gap-2 bg-card border border-border rounded-xl p-3">
            {days.map((d) => {
              const key = lisbonDateKey(d);
              const list = (apptsByDay.get(key) ?? []).sort((a, b) =>
                a.slot_start.localeCompare(b.slot_start),
              );
              const isToday = lisbonDateKey(new Date()) === key;
              return (
                <div key={key} className="min-h-[260px]">
                  <div className={cn(
                    "text-center pb-2 border-b border-border mb-2",
                    isToday && "text-primary font-semibold",
                  )}>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {d.toLocaleDateString("en-GB", { weekday: "short" })}
                    </div>
                    <div className="text-sm font-medium">{d.getDate()}</div>
                  </div>
                  <div className="space-y-1.5">
                    {list.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setSelected(a)}
                        className={cn(
                          "w-full text-left p-2 rounded-md border text-xs",
                          "hover:bg-accent transition-colors",
                          a.status === "confirmed"
                            ? "bg-emerald-500/5 border-emerald-500/20"
                            : "bg-amber-500/5 border-amber-500/20",
                        )}
                      >
                        <div className="font-semibold">{formatLisbonTime(a.slot_start)}</div>
                        <div className="truncate text-muted-foreground">{clientName(a)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="list">
          {loading ? (
            <p className="text-sm text-muted-foreground p-8 text-center">Loading…</p>
          ) : appts.length === 0 ? (
            <div className="flex flex-col items-center py-16 bg-card border border-border rounded-xl">
              <CalendarIcon className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No appointments yet.</p>
            </div>
          ) : (
            <ul className="bg-card border border-border rounded-xl divide-y divide-border">
              {appts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-4 p-4 hover:bg-accent/30 cursor-pointer transition-colors"
                  onClick={() => setSelected(a)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{clientName(a)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatLisbonRange(a.slot_start, a.slot_end)}
                    </p>
                    {a.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {a.notes}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className={cn("capitalize shrink-0", statusStyles[a.status])}>
                    {a.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent>
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{clientName(selected)}</SheetTitle>
                <SheetDescription>
                  {formatLisbonRange(selected.slot_start, selected.slot_end)}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Status</p>
                  <Badge variant="outline" className={cn("capitalize", statusStyles[selected.status])}>
                    {selected.status}
                  </Badge>
                </div>
                {selected.client?.phone_number && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Phone</p>
                    <p className="text-sm">{selected.client.phone_number}</p>
                  </div>
                )}
                {selected.notes && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{selected.notes}</p>
                  </div>
                )}
                {selected.google_event_id && (
                  <a
                    href={`https://calendar.google.com/calendar/event?eid=${selected.google_event_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Open in Google Calendar <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {selected.status !== "cancelled" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full mt-4">
                        <Trash2 className="h-4 w-4 mr-1.5" /> Cancel appointment
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          The client will be notified. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleCancel(selected)}>
                          Cancel appointment
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminAppointments;
