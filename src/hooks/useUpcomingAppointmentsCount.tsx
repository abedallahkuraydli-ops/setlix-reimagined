import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useUpcomingAppointmentsCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    let profileId: string | null = null;

    const load = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile) return;
      profileId = profile.id;

      const { count: c } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("client_id", profile.id)
        .eq("status", "confirmed")
        .gte("slot_start", new Date().toISOString());
      setCount(c ?? 0);
    };

    load();

    const channel = supabase
      .channel("upcoming-appts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          if (profileId) load();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return count;
}
