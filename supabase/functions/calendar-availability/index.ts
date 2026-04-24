import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Slot {
  start: string;
  end: string;
}

function getTimezoneOffsetMinutes(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) === 24 ? 0 : Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return (asUTC - date.getTime()) / 60000;
}

function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = getTimezoneOffsetMinutes(timeZone, guess);
  return new Date(guess.getTime() - offset * 60000);
}

function isoWeekdayInTz(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  });
  const w = dtf.format(date);
  const map: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
  };
  return map[w] ?? 1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");

    if (!dateFrom || !dateTo) {
      return new Response(
        JSON.stringify({ error: "date_from and date_to required (YYYY-MM-DD)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings, error: sErr } = await supabase
      .from("admin_settings")
      .select("working_hours_start, working_hours_end, working_days, slot_duration_minutes, timezone")
      .limit(1)
      .maybeSingle();

    if (sErr) throw sErr;
    const cfg = settings ?? {
      working_hours_start: 9,
      working_hours_end: 18,
      working_days: [1, 2, 3, 4, 5],
      slot_duration_minutes: 30,
      timezone: "Europe/Lisbon",
    };

    const fromUtc = new Date(`${dateFrom}T00:00:00Z`);
    const toUtc = new Date(`${dateTo}T23:59:59Z`);

    const { data: existing, error: aErr } = await supabase
      .from("appointments")
      .select("slot_start, slot_end, status")
      .in("status", ["pending", "confirmed"])
      .gte("slot_start", fromUtc.toISOString())
      .lte("slot_start", toUtc.toISOString());

    if (aErr) throw aErr;

    const busyRanges: Array<[number, number]> = (existing ?? []).map((a) => [
      new Date(a.slot_start).getTime(),
      new Date(a.slot_end).getTime(),
    ]);

    const slots: Slot[] = [];
    const startDate = new Date(`${dateFrom}T00:00:00Z`);
    const endDate = new Date(`${dateTo}T00:00:00Z`);
    const nowMs = Date.now();

    for (
      let d = new Date(startDate);
      d.getTime() <= endDate.getTime();
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      const dtf = new Intl.DateTimeFormat("en-CA", {
        timeZone: cfg.timezone,
        year: "numeric", month: "2-digit", day: "2-digit",
      });
      const localStr = dtf.format(d);
      const [yy, mm, dd] = localStr.split("-").map(Number);

      const probe = zonedTimeToUtc(yy, mm, dd, 12, 0, cfg.timezone);
      const weekday = isoWeekdayInTz(probe, cfg.timezone);
      if (!cfg.working_days.includes(weekday)) continue;

      const totalMinutes = (cfg.working_hours_end - cfg.working_hours_start) * 60;
      const slotMin = cfg.slot_duration_minutes;

      for (let m = 0; m < totalMinutes; m += slotMin) {
        const startHour = cfg.working_hours_start + Math.floor(m / 60);
        const startMin = m % 60;
        const slotStart = zonedTimeToUtc(yy, mm, dd, startHour, startMin, cfg.timezone);
        const slotEnd = new Date(slotStart.getTime() + slotMin * 60000);

        if (slotStart.getTime() < nowMs + 15 * 60000) continue;

        const overlaps = busyRanges.some(
          ([bs, be]) => slotStart.getTime() < be && slotEnd.getTime() > bs,
        );
        if (overlaps) continue;

        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
        });
      }
    }

    return new Response(
      JSON.stringify({ slots, timezone: cfg.timezone, slot_duration_minutes: cfg.slot_duration_minutes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("calendar-availability error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
