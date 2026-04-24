import { useEffect, useState } from "react";
import { Calendar as CalendarIcon, CheckCircle2, Clock, Plus, MoreVertical, RefreshCw, X, Video, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingModal } from "@/components/appointments/BookingModal";
import { formatLisbonRange } from "@/lib/appointments";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Appointment {
  id: string;
  slot_start: string;
  slot_end: string;
  status: "pending" | "confirmed" | "cancelled";
  notes: string | null;
  google_event_id: string | null;
  admin_id: string | null;
  admin?: { company_name: string | null; meet_link: string | null } | null;
}

const statusStyles: Record<Appointment["status"], string> = {
  confirmed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const Appointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("appointments")
      .select("id, slot_start, slot_end, status, notes, google_event_id, admin_id, admin:profiles!appointments_admin_id_fkey(company_name, meet_link)")
      .eq("client_id", profile.id)
      .gte("slot_start", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("slot_start", { ascending: true });
    setAppointments((data ?? []) as unknown as Appointment[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("portal-appointments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const openNewBooking = () => {
    setRescheduleId(null);
    setModalOpen(true);
  };

  const openReschedule = (id: string) => {
    setRescheduleId(id);
    setModalOpen(true);
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", cancelTarget.id);
    setCancelling(false);
    if (error) {
      toast.error("Could not cancel — please try again");
      return;
    }
    toast.success("Appointment cancelled");
    setCancelTarget(null);
    load();
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Appointments</h1>
          <p className="text-sm text-muted-foreground">
            Book a 30-minute meeting with your Setlix advisor.
          </p>
        </div>
        <Button onClick={openNewBooking}>
          <Plus className="h-4 w-4 mr-1.5" /> Book a meeting
        </Button>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide mb-3">
          Upcoming
        </h2>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-card border border-border rounded-xl">
            <div className="rounded-full bg-muted p-4 mb-4">
              <CalendarIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              No upcoming appointments
            </h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
              Book a meeting with your Setlix advisor below.
            </p>
            <Button onClick={openNewBooking} variant="outline">
              <Plus className="h-4 w-4 mr-1.5" /> Book a meeting
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {appointments.map((a) => {
              const isUpcomingActive =
                a.status !== "cancelled" && new Date(a.slot_start).getTime() > Date.now();
              return (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-4 p-4 bg-card border border-border rounded-xl"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="rounded-lg bg-primary/10 p-2 mt-0.5">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {formatLisbonRange(a.slot_start, a.slot_end)}
                      </p>
                      {a.admin?.company_name && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> with {a.admin.company_name}
                        </p>
                      )}
                      {a.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {a.notes}
                        </p>
                      )}
                      {a.admin?.meet_link && a.status !== "cancelled" && (
                        <a
                          href={a.admin.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1 font-medium"
                        >
                          <Video className="h-3 w-3" /> Join Google Meet
                        </a>
                      )}
                      {a.google_event_id && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Added to your calendar
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={cn("capitalize", statusStyles[a.status])}>
                      {a.status}
                    </Badge>
                    {isUpcomingActive && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="Appointment actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openReschedule(a.id)}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Reschedule
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setCancelTarget(a)}
                            className="text-destructive focus:text-destructive"
                          >
                            <X className="h-4 w-4 mr-2" /> Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <BookingModal
        open={modalOpen}
        onOpenChange={(o) => {
          setModalOpen(o);
          if (!o) setRescheduleId(null);
        }}
        onBooked={load}
        rescheduleId={rescheduleId}
      />

      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget && formatLisbonRange(cancelTarget.slot_start, cancelTarget.slot_end)}
              <br />
              The slot will be released and made available again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmCancel();
              }}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? "Cancelling…" : "Yes, cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Appointments;
