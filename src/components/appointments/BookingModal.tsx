import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar as CalendarIcon, Loader2, Building2, Video } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatLisbonDate, formatLisbonTime, lisbonDateKey } from "@/lib/appointments";

interface Slot {
  start: string;
  end: string;
}

interface BookableAdmin {
  admin_profile_id: string;
  admin_user_id: string;
  company_name: string;
  meet_link: string | null;
  is_default: boolean;
}

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBooked: () => void;
  rescheduleId?: string | null;
}

type Step = "admin" | "date" | "time" | "confirm";

export function BookingModal({ open, onOpenChange, onBooked, rescheduleId }: BookingModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("admin");
  const [admins, setAdmins] = useState<BookableAdmin[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<BookableAdmin | null>(null);
  const [month, setMonth] = useState<Date>(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);

  // Reset state when reopened
  useEffect(() => {
    if (open) {
      setStep("admin");
      setSelectedAdmin(null);
      setSelectedDate(undefined);
      setSelectedSlot(null);
      setNotes("");
    }
  }, [open]);

  // Load bookable admins on open
  useEffect(() => {
    if (!open || !user) return;
    const fetchAdmins = async () => {
      setAdminsLoading(true);
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!profile) throw new Error("Profile not found");
        const { data, error } = await supabase.rpc("bookable_admins_for_client", {
          _client_profile_id: profile.id,
        });
        if (error) throw error;
        const list = (data ?? []) as BookableAdmin[];
        // Sort: default (Setlix) first, then alphabetical
        list.sort((a, b) => {
          if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
          return a.company_name.localeCompare(b.company_name);
        });
        setAdmins(list);
        // If only one option, auto-pick and skip step
        if (list.length === 1) {
          setSelectedAdmin(list[0]);
          setStep("date");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load advisors");
      } finally {
        setAdminsLoading(false);
      }
    };
    fetchAdmins();
  }, [open, user]);

  // Fetch availability for current + next month whenever month changes (only after admin selected)
  useEffect(() => {
    if (!open || !selectedAdmin) return;
    const fetchAvailability = async () => {
      setLoading(true);
      try {
        const from = new Date(month.getFullYear(), month.getMonth(), 1);
        const to = new Date(month.getFullYear(), month.getMonth() + 2, 0);
        const dateFrom = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-01`;
        const dateTo = `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, "0")}-${String(to.getDate()).padStart(2, "0")}`;
        const { data: { session } } = await supabase.auth.getSession();
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-availability?date_from=${dateFrom}&date_to=${dateTo}`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load availability");
        setSlots(json.slots ?? []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load availability");
        setSlots([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAvailability();
  }, [open, month, selectedAdmin]);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = lisbonDateKey(new Date(s.start));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [slots]);

  const availableDates = useMemo(() => {
    const set = new Set<string>();
    for (const key of slotsByDate.keys()) set.add(key);
    return set;
  }, [slotsByDate]);

  const slotsForSelected = useMemo(() => {
    if (!selectedDate) return [];
    const key = lisbonDateKey(selectedDate);
    return (slotsByDate.get(key) ?? []).sort((a, b) =>
      a.start.localeCompare(b.start),
    );
  }, [selectedDate, slotsByDate]);

  const handleBack = () => {
    if (step === "confirm") setStep("time");
    else if (step === "time") setStep("date");
    else if (step === "date") {
      // Only allow going back to admin step if there's more than one option
      if (admins.length > 1) setStep("admin");
    }
  };

  const handleBook = async () => {
    if (!selectedSlot || !selectedAdmin) return;
    setBooking(true);
    try {
      const { data, error } = await supabase.functions.invoke("book-appointment", {
        body: {
          slot_start: selectedSlot.start,
          slot_end: selectedSlot.end,
          notes: notes.trim() || undefined,
          reschedule_id: rescheduleId ?? undefined,
          admin_user_id: selectedAdmin.admin_user_id,
        },
      });
      if (error) throw error;
      if (data?.error === "slot_taken") {
        toast.error(data.message);
        setStep("time");
        return;
      }
      toast.success(rescheduleId ? "Your appointment has been rescheduled" : "Your appointment is confirmed");
      onBooked();
      onOpenChange(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Booking failed";
      if (msg.includes("409") || msg.toLowerCase().includes("slot_taken")) {
        toast.error("This slot was just taken — please pick another time");
        setStep("time");
      } else {
        toast.error(msg);
      }
    } finally {
      setBooking(false);
    }
  };

  const canGoBack = step !== "admin" && !(step === "date" && admins.length <= 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {canGoBack && (
              <button
                onClick={handleBack}
                className="p-1 -ml-1 rounded hover:bg-muted"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {step === "admin" && "Who would you like to meet with?"}
            {step === "date" && (rescheduleId ? "Pick a new date" : "Pick a date")}
            {step === "time" && "Pick a time"}
            {step === "confirm" && (rescheduleId ? "Confirm reschedule" : "Confirm booking")}
          </DialogTitle>
          <DialogDescription>
            {step === "admin" && "Select the advisor you'd like to meet."}
            {step === "date" && "Choose a day with available slots."}
            {step === "time" && selectedDate && formatLisbonDate(selectedDate.toISOString())}
            {step === "confirm" && (rescheduleId ? "Your old slot will be released." : "Review your meeting details.")}
          </DialogDescription>
        </DialogHeader>

        {step === "admin" && (
          <div className="space-y-2">
            {adminsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : admins.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No advisors available. Please contact support.
              </p>
            ) : (
              admins.map((a) => (
                <button
                  key={a.admin_user_id}
                  onClick={() => {
                    setSelectedAdmin(a);
                    setStep("date");
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 rounded-lg border border-border text-left",
                    "hover:bg-muted/50 hover:border-primary transition-colors",
                  )}
                >
                  <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{a.company_name}</p>
                    {a.is_default && (
                      <p className="text-xs text-muted-foreground">Default advisor</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {step === "date" && (
          <div className="flex justify-center pointer-events-auto">
            {loading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <Calendar
                mode="single"
                month={month}
                onMonthChange={setMonth}
                selected={selectedDate}
                onSelect={(d) => {
                  if (!d) return;
                  setSelectedDate(d);
                  setStep("time");
                }}
                disabled={(d) => {
                  const key = lisbonDateKey(d);
                  return !availableDates.has(key);
                }}
                className="p-3 pointer-events-auto"
              />
            )}
          </div>
        )}

        {step === "time" && (
          <div className="grid grid-cols-3 gap-2 max-h-[320px] overflow-y-auto p-1">
            {slotsForSelected.length === 0 ? (
              <p className="col-span-3 text-sm text-muted-foreground text-center py-8">
                No slots available on this day.
              </p>
            ) : (
              slotsForSelected.map((s) => (
                <button
                  key={s.start}
                  onClick={() => {
                    setSelectedSlot(s);
                    setStep("confirm");
                  }}
                  className={cn(
                    "px-3 py-2 rounded-md border border-border text-sm font-medium",
                    "hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors",
                  )}
                >
                  {formatLisbonTime(s.start)}
                </button>
              ))
            )}
          </div>
        )}

        {step === "confirm" && selectedSlot && selectedAdmin && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{selectedAdmin.company_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{formatLisbonDate(selectedSlot.start)}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {formatLisbonTime(selectedSlot.start)}–{formatLisbonTime(selectedSlot.end)} · 30 min · Lisbon time
              </div>
              {selectedAdmin.meet_link && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                  <Video className="h-4 w-4" />
                  <span>Google Meet link will be shared on confirmation</span>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Anything you'd like to discuss? <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add context for the meeting…"
                rows={3}
              />
            </div>
            <Button onClick={handleBook} disabled={booking} className="w-full">
              {booking ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {rescheduleId ? "Rescheduling…" : "Booking…"}</> : (rescheduleId ? "Confirm reschedule" : "Confirm booking")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
