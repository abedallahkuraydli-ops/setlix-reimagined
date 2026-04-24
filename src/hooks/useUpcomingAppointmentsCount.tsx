import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";

export function useUpcomingAppointmentsCount() {
  const { profile } = useProfile();
  const profileId = profile?.id ?? null;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!profileId) return;

    const load = async () => {
      const { count: c } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("client_id", profileId)
        .eq("status", "confirmed")
        .gte("slot_start", new Date().toISOString());
      setCount(c ?? 0);
    };

    load();

    const channel = supabase
      .channel("upcoming-appts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `client_id=eq.${profileId}` },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  return count;
}
