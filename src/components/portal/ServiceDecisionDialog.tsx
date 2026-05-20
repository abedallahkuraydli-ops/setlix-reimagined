import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DecisionNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
}

const DECISION_TYPES = ["service_request_approved", "service_request_rejected"];

export function ServiceDecisionDialog() {
  const { user } = useAuth();
  const [item, setItem] = useState<DecisionNotification | null>(null);
  const [acking, setAcking] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body")
      .eq("recipient_user_id", user.id)
      .in("type", DECISION_TYPES)
      .is("read_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (data) setItem(data as DecisionNotification);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    load();
    const channel = supabase
      .channel(`decision-popup-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
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
  }, [user, load]);

  const acknowledge = async () => {
    if (!item) return;
    setAcking(true);
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", item.id);
    setItem(null);
    setAcking(false);
    // Check for another pending decision
    load();
  };

  if (!item) return null;
  const approved = item.type === "service_request_approved";

  return (
    <Dialog open={!!item} onOpenChange={() => { /* require explicit ack */ }}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className={`mx-auto mb-2 rounded-full p-3 ${approved ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
            {approved ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
          </div>
          <DialogTitle className="text-center">{item.title}</DialogTitle>
          {item.body && (
            <DialogDescription className="text-center whitespace-pre-line">
              {item.body}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button onClick={acknowledge} disabled={acking}>
            I understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
