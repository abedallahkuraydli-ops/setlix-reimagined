import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";

/**
 * Counts unread messages.
 * - Client mode: counts admin->client unread messages across the client's own conversations.
 * - Admin mode: counts conversations that contain at least one unread client->admin message.
 */
export function useUnreadCount(mode: "client" | "admin") {
  const { profile } = useProfile();
  const profileId = profile?.id ?? null;
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      if (mode === "client") {
        if (!profileId) {
          if (!cancelled) setCount(0);
          return;
        }
        const { data: convs } = await supabase
          .from("conversations")
          .select("id")
          .eq("client_id", profileId);
        const convIds = (convs ?? []).map((c) => c.id);
        if (convIds.length === 0) {
          if (!cancelled) setCount(0);
          return;
        }
        const { count: c } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .in("conversation_id", convIds)
          .eq("read", false)
          .neq("sender_id", profileId);
        if (!cancelled) setCount(c ?? 0);
      } else {
        const { data } = await supabase
          .from("conversations")
          .select("id, client_id, messages!inner(id, read, sender_id)")
          .eq("messages.read", false);
        if (!data) {
          if (!cancelled) setCount(0);
          return;
        }
        const convSet = new Set<string>();
        for (const conv of data as Array<{
          id: string;
          client_id: string;
          messages: Array<{ sender_id: string; read: boolean }>;
        }>) {
          if (conv.messages?.some((m) => m.sender_id === conv.client_id && !m.read)) {
            convSet.add(conv.id);
          }
        }
        if (!cancelled) setCount(convSet.size);
      }
    };

    if (mode === "admin" || profileId) refresh();

    const channel = supabase
      .channel(`unread-${mode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, refresh)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [mode, profileId]);

  return count;
}
