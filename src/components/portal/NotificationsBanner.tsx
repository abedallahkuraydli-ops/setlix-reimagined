import { useEffect, useState } from "react";
import { Bell, X, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link_path: string | null;
  created_at: string;
}

export function NotificationsBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, link_path, created_at")
      .eq("recipient_user_id", user.id)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(3);
    if (data) setItems(data as NotificationItem[]);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const channel = supabase
      .channel(`notif-banner-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${user.id}`,
        },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const dismiss = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    setItems((prev) => prev.filter((n) => n.id !== id));
  };

  const open = async (n: NotificationItem) => {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", n.id);
    if (n.link_path) navigate(n.link_path);
    setItems((prev) => prev.filter((x) => x.id !== n.id));
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map((n) => (
        <div
          key={n.id}
          className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div className="rounded-full bg-primary/10 p-2 mt-0.5">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{n.title}</p>
            {n.body && (
              <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
            )}
            {n.link_path && (
              <button
                onClick={() => open(n)}
                className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-primary hover:underline"
              >
                View details <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => dismiss(n.id)}
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
